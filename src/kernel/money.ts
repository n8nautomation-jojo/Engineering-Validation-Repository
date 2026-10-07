export interface Money {
  readonly amount: number;
  readonly currency: string;
}

export function money(amount: number, currency: string): Money {
  if (!Number.isFinite(amount)) throw new Error("INVALID_MONEY_AMOUNT");
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("INVALID_CURRENCY");
  return Object.freeze({ amount, currency });
}
