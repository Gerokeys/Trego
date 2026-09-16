// Gives an existing account admin access (the /admin pages).
// Usage: node prisma/make-admin.mjs 0712345678
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

try {
  process.loadEnvFile();
} catch {
  // .env is optional when DATABASE_URL is set directly
}

const raw = (process.argv[2] ?? "").replace(/[\s-]/g, "");
const phoneNumber = /^0[17]\d{8}$/.test(raw)
  ? `+254${raw.slice(1)}`
  : /^254\d{9}$/.test(raw)
    ? `+${raw}`
    : raw;

if (!/^\+254\d{9}$/.test(phoneNumber)) {
  console.error("Usage: node prisma/make-admin.mjs 0712345678");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
try {
  const user = await db.user.update({
    where: { phoneNumber },
    data: { role: "ADMIN" },
  });
  console.log(`${user.displayName} (${phoneNumber}) is now an admin. Visit /admin.`);
} catch {
  console.error(`No account found with phone number ${phoneNumber}. Register first.`);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
