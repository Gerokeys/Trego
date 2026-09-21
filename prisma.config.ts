import { defineConfig } from "prisma/config";

// The Prisma CLI does not auto-load .env the way Next.js does, so load it
// explicitly (Node 20.6+ built-in) before the config reads DATABASE_URL.
try {
  process.loadEnvFile();
} catch {
  // .env is optional (e.g. in CI where DATABASE_URL is set directly)
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "node prisma/seed.mjs",
  },
  datasource: {
    // `prisma generate` never connects, but it runs during install and build,
    // and hosts commonly expose DATABASE_URL only at runtime. env() throws on
    // a missing variable and would fail the build there, so fall back instead.
    // Commands that genuinely connect (migrate, seed, studio) still fail
    // loudly on their own if the URL is wrong or absent.
    url: process.env.DATABASE_URL ?? "postgresql://database-url-not-set",
  },
});
