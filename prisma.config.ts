import { defineConfig, env } from "prisma/config";

// The Prisma CLI does not auto-load .env the way Next.js does, so load it
// explicitly (Node 20.6+ built-in) before defineConfig reads DATABASE_URL.
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
    url: env("DATABASE_URL"),
  },
});
