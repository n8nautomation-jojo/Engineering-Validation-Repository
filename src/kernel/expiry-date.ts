export interface ExpiryDate {
  readonly value: string;
}

export function expiryDate(value: string): ExpiryDate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("INVALID_EXPIRY_DATE");
  }
  const parsed = new Date(value + "T00:00:00Z");
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("INVALID_EXPIRY_DATE");
  }
  return Object.freeze({ value });
}
