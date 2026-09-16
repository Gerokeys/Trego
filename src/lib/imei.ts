/**
 * Every real IMEI ends in a Luhn check digit, so this catches most typos and
 * made-up numbers. It does not say whether the phone is lost or stolen; that
 * needs a blacklist check (ImeiStatus on the listing).
 */
export function isValidImei(imei: string) {
  if (!/^\d{15}$/.test(imei)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let digit = Number(imei[14 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

export const IMEI_STATUS_LABELS: Record<string, string> = {
  NOT_CHECKED: "On file, not yet checked against a blacklist",
  CLEAN: "Checked: not reported lost or stolen",
  BLACKLISTED: "Reported lost or stolen",
};
