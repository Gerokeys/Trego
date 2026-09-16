/** Absolute base URL, for links in SMS, share buttons and link previews. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);

/** Only allow redirects to paths on this site (blocks "//evil.com" and full URLs). */
export function safeNextPath(value: unknown, fallback = "/") {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback;
}
