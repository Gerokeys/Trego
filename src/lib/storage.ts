import "server-only";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Where listing photos are kept.
 *
 * - **Cloudflare R2** as soon as R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID and
 *   R2_SECRET_ACCESS_KEY are set. Required on serverless hosts, whose disks are
 *   read-only and thrown away between requests.
 * - **Local disk** (`storage/uploads`) otherwise, which is fine for development
 *   and for a single server with a persistent disk.
 *
 * Set R2_PUBLIC_BASE_URL (an r2.dev address or your own domain on the bucket)
 * to serve photos straight from Cloudflare's CDN. Without it the bucket can
 * stay private and /media proxies each file instead.
 */
export const UPLOAD_ROOT = path.join(process.cwd(), "storage", "uploads");

type R2Config = {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl?: string;
};

export function getR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) return null;

  return {
    accountId,
    bucket,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, "") || undefined,
  };
}

let cachedClient: S3Client | null = null;

function getClient(config: R2Config) {
  cachedClient ??= new S3Client({
    // R2 is S3-compatible but has no regions.
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  return cachedClient;
}

/** True when photos are going to R2 rather than local disk. */
export function isRemoteStorage() {
  return getR2Config() !== null;
}

/** Stores one object and returns the URL to save on ListingPhoto. */
export async function putPhoto(key: string, body: Buffer, contentType: string) {
  const config = getR2Config();

  if (!config) {
    const file = path.join(UPLOAD_ROOT, key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
    return `/media/${key}`;
  }

  await getClient(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Keys contain a random UUID, so a URL's contents never change.
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return config.publicBaseUrl ? `${config.publicBaseUrl}/${key}` : `/media/${key}`;
}

/** Reads a stored object back, for the /media route and the link-preview image. */
export async function getPhoto(
  key: string
): Promise<{ body: Uint8Array; contentType?: string } | null> {
  const config = getR2Config();

  if (!config) {
    const file = path.resolve(UPLOAD_ROOT, key);
    // Refuse anything that climbs out of the upload folder.
    if (!file.startsWith(UPLOAD_ROOT + path.sep)) return null;
    try {
      return { body: new Uint8Array(await readFile(file)) };
    } catch {
      return null;
    }
  }

  try {
    const result = await getClient(config).send(
      new GetObjectCommand({ Bucket: config.bucket, Key: key })
    );
    const body = await result.Body?.transformToByteArray();
    return body ? { body, contentType: result.ContentType } : null;
  } catch {
    return null;
  }
}
