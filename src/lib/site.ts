/**
 * Absolute base URL, for links in SMS, share buttons and link previews.
 *
 * Hosts display domains without a scheme (Railway, Vercel and friends all do),
 * so NEXT_PUBLIC_SITE_URL is easily set to a bare hostname. That throws in
 * `new URL()` at build time, and worse, would quietly produce unclickable
 * links in SMS and share text, so the scheme is added here if it's missing.
 */
function normalizeSiteUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
);

/** Only allow redirects to paths on this site (blocks "//evil.com" and full URLs). */
export function safeNextPath(value: unknown, fallback = "/") {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback;
}
