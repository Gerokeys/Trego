const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

const dateTime = new Intl.DateTimeFormat("en-KE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Nairobi",
});

/** "16 Sept 2026, 14:05" in Kenyan time, for deadlines and order history. */
export function formatDateTime(date: Date) {
  return dateTime.format(date);
}

export function isInFuture(date: Date | null | undefined) {
  return Boolean(date && date.getTime() > Date.now());
}

/** "3 hours ago", "yesterday", "just now". */
export function timeAgo(date: Date) {
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  for (const [unit, unitSeconds] of UNITS) {
    if (Math.abs(seconds) >= unitSeconds) {
      return relative.format(Math.round(seconds / unitSeconds), unit);
    }
  }
  return "just now";
}
