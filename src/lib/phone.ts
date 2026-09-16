/** Normalizes Kenyan phone numbers (07xx/01xx/+254xx/254xx) to E.164 (+254...). */
export function normalizeKenyanPhone(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, "");

  if (/^\+254\d{9}$/.test(digits)) return digits;
  if (/^254\d{9}$/.test(digits)) return `+${digits}`;
  if (/^0[17]\d{8}$/.test(digits)) return `+254${digits.slice(1)}`;

  return null;
}

/** +254712345678 → 0712345678, for pre-filling phone inputs. */
export function toLocalPhone(e164: string | null | undefined) {
  return e164 && /^\+254\d{9}$/.test(e164) ? `0${e164.slice(4)}` : "";
}
