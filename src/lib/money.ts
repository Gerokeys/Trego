/** All prices are stored as integer minor units (1 KES = 100 units). Never use floats for money. */
export function formatMinorUnits(minorUnits: number, currency = "KES"): string {
  const major = minorUnits / 100;
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    maximumFractionDigits: major % 1 === 0 ? 0 : 2,
  }).format(major);
}

export function majorToMinorUnits(major: number): number {
  return Math.round(major * 100);
}
