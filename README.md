# Trego

**Trusted transactions for used goods.** A marketplace for buying and selling used phones and
electronics in Kenya, where every listing discloses its condition and the buyer's payment is held in
escrow until they've checked what they bought.

Built with Next.js 16 (App Router), Prisma 7 + PostgreSQL, and Tailwind CSS 4.

## What's here

**Buying and selling**
- Listings with a mandatory condition grade, defect disclosure, county/area, and meet-up or delivery
- Photos resized to 1600px JPEG on upload, with EXIF (including GPS) stripped
- Browse with search, category, county, condition and price filters, plus sorting and saved searches
- Watchlist, cart, and "Make an offer" with 48-hour expiry

**Trust**
- Phone verification by SMS code (Africa's Talking) before selling, messaging, offering or buying
- IMEI validation (Luhn check digit) and an admin blacklist status per listing
- Buyer–seller messaging, kept as a record for disputes
- Reviews only from buyers who completed an escrow purchase
- Reporting, plus admin pages for reports, disputes and suspensions

**Escrow** (`src/lib/orders.ts`)
```
PENDING_PAYMENT → PAID → HANDED_OVER → COMPLETED
      ↓            ↓          ↓
  CANCELLED    REFUNDED   DISPUTED → REFUNDED | COMPLETED
```
Money is held after payment, the seller has 3 days to hand over, the buyer gets 48 hours to inspect,
then the payment releases automatically unless a dispute is opened. Deadlines are applied on page
loads and by a scheduled call to `/api/cron/escrow`.

> **Payments are not live.** In development escrow runs in a simulated test mode where no money
> moves. In production it stays disabled until a licensed payment partner is connected — holding
> customer funds in Kenya requires a CBK Payment Service Provider licence.

## Running it locally

```bash
docker compose up -d          # PostgreSQL on port 5433
npm install
npx prisma migrate deploy     # create the tables
npx prisma generate
npx prisma db seed            # optional: 18 demo listings
npm run dev                   # http://localhost:3000
```

Copy the environment variables below into `.env` (it is gitignored):

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `SESSION_SECRET` | yes | Signs session cookies and hashes SMS codes |
| `NEXT_PUBLIC_SITE_URL` | yes | Absolute URLs in SMS and link previews |
| `AT_USERNAME`, `AT_API_KEY` | for SMS | Africa's Talking; use `sandbox` with a sandbox key to test |
| `AT_SENDER_ID` | optional | Approved alphanumeric sender ID |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | for Google sign-in | OAuth client; redirect URI `/api/auth/google/callback` |
| `PAYMENTS_MODE` | optional | `simulated` or `disabled` (defaults: simulated in dev, disabled in production) |
| `CRON_SECRET` | for the scheduler | Bearer token for `/api/cron/escrow` |

Without SMS credentials, verification codes are printed to the server log and shown on screen in
development. Production refuses to send codes rather than revealing them.

## Useful commands

```bash
node prisma/make-admin.mjs 0712345678   # grant admin access to an account
node smoke-test.mjs                     # browser smoke test (dev server must be running)
npx prisma studio                       # inspect the database
```

## Deploying

`npm run build` runs `prisma generate` first, because the typed client lives in `node_modules` and a
fresh CI install doesn't have it. Without that step every `db.*` call types as `any` and the build
fails with "Module '@prisma/client' has no exported member 'PrismaClient'".

Before the first deploy:

1. **Point `DATABASE_URL` at a hosted PostgreSQL database** — the `docker compose` database only
   exists on your machine.
2. **Apply the migrations** to it: `npx prisma migrate deploy` (five migrations to date).
3. **Set the environment variables** from the table above. `PAYMENTS_MODE` defaults to `disabled` in
   production, so escrow checkout stays off until you deliberately enable it.
4. **Schedule `/api/cron/escrow`** (every few minutes, `Authorization: Bearer $CRON_SECRET`) so
   escrow deadlines apply even when nobody is browsing.

> **Photo uploads need object storage on serverless hosts.** Listings photos are written to
> `storage/uploads` on local disk and served by `/media/[...path]`. That works on a single server
> with a persistent disk, but on Vercel-style hosting the filesystem is read-only and per-request, so
> uploads will fail or vanish. Swap `saveListingPhoto` in `src/lib/uploads.ts` for S3/R2 before
> launch.

## Notes

- The Terms and Privacy pages are plain-language drafts and have not been reviewed by a lawyer.
