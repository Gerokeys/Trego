/**
 * Copies listing photos that are still on local disk into Cloudflare R2.
 *
 * Photos uploaded before R2 was configured live on the machine that received
 * them, under one of two prefixes depending on when they were uploaded:
 *
 *   /media/...    → storage/uploads/...   (current local-disk mode)
 *   /uploads/...  → public/uploads/...    (legacy, before the storage rewrite)
 *
 * Both folders are gitignored, so those files never leave the machine and the
 * listings would show broken images once deployed. This copies them into the
 * bucket and repoints the database at them.
 *
 * Seed images under `/photos/...` are NOT touched: they live in `public/`, are
 * committed to git, and ship with the build as static assets.
 *
 *   node scripts/backfill-photos.mjs --dry-run   # report what would move
 *   node scripts/backfill-photos.mjs             # do it
 *
 * Safe to re-run: rows already pointing at R2 are skipped, and the local files
 * are left in place as a backup. Run it against the hosted database (with
 * DATABASE_URL pointing there) before the first deploy.
 */
import { createRequire } from "module";
import { readFile } from "fs/promises";
import path from "path";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

process.loadEnvFile();

const dryRun = process.argv.includes("--dry-run");

/** Where each URL prefix keeps its files. The rest of the URL is the R2 key. */
const SOURCES = [
  { prefix: "/media/", root: path.join(process.cwd(), "storage", "uploads") },
  { prefix: "/uploads/", root: path.join(process.cwd(), "public", "uploads") },
];

const CONTENT_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function requireR2() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, "") || undefined;

  const missing = Object.entries({ R2_ACCOUNT_ID: accountId, R2_BUCKET: bucket, R2_ACCESS_KEY_ID: accessKeyId, R2_SECRET_ACCESS_KEY: secretAccessKey })
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) {
    console.error(`R2 is not configured. Missing: ${missing.join(", ")}`);
    process.exit(1);
  }
  return { accountId, bucket, accessKeyId, secretAccessKey, publicBaseUrl };
}

const config = requireR2();
const client = new S3Client({
  region: "auto",
  endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
});

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const photos = await db.listingPhoto.findMany({
  where: { OR: SOURCES.map((source) => ({ url: { startsWith: source.prefix } })) },
  select: { id: true, url: true },
});

if (photos.length === 0) {
  console.log("Nothing to do: no photos are still stored on local disk.");
  await db.$disconnect();
  process.exit(0);
}

console.log(
  `${photos.length} photo${photos.length === 1 ? "" : "s"} on local disk` +
    (dryRun ? " (dry run, nothing will be written)\n" : `, copying to ${config.bucket}\n`)
);

let moved = 0;
let bytes = 0;
const missingFiles = [];

for (const photo of photos) {
  const source = SOURCES.find((candidate) => photo.url.startsWith(candidate.prefix));
  const key = photo.url.slice(source.prefix.length);
  const file = path.resolve(source.root, decodeURIComponent(key));

  // Refuse anything that climbs out of its folder.
  if (!file.startsWith(source.root + path.sep)) {
    missingFiles.push(`${photo.url} (outside ${path.basename(source.root)})`);
    continue;
  }

  let body;
  try {
    body = await readFile(file);
  } catch {
    missingFiles.push(photo.url);
    continue;
  }

  const contentType = CONTENT_TYPES[path.extname(key).slice(1).toLowerCase()] ?? "image/jpeg";
  // Without a public base URL the bucket stays private and /media proxies it.
  // Legacy /uploads/ URLs still have to be rewritten to /media/ so that works.
  const newUrl = config.publicBaseUrl ? `${config.publicBaseUrl}/${key}` : `/media/${key}`;

  if (!dryRun) {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Keys contain a random UUID, so a URL's contents never change.
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    if (newUrl !== photo.url) {
      await db.listingPhoto.update({ where: { id: photo.id }, data: { url: newUrl } });
    }
  }

  moved += 1;
  bytes += body.length;
  console.log(`  ${dryRun ? "would copy" : "copied"}  ${source.prefix}${key}  (${Math.round(body.length / 1024)} KB)`);
}

console.log(
  `\n${dryRun ? "Would copy" : "Copied"} ${moved} file${moved === 1 ? "" : "s"}, ` +
    `${(bytes / 1024 / 1024).toFixed(1)} MB total.`
);

if (missingFiles.length) {
  console.log(
    `\n${missingFiles.length} row${missingFiles.length === 1 ? "" : "s"} point at a file that is not on this machine ` +
      `and cannot be recovered here:`
  );
  for (const url of missingFiles) console.log(`  ${url}`);
}

if (!dryRun && moved > 0) {
  console.log("\nLocal copies were left in place as a backup; delete them once you've confirmed the listings look right.");
}

await db.$disconnect();
