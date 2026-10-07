export interface Quantity {
  readonly value: number;
}

export function quantity(value: number): Quantity {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("INVALID_QUANTITY");
  }
  return Object.freeze({ value });
}
