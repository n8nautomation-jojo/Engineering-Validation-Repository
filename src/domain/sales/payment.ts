import type { Money } from "../../kernel/money.js";
import type { UUID } from "../../kernel/types.js";

export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "MOBILE_MONEY" | "CARD" | "CHEQUE" | "OTHER";
export type VerificationStatus = "NOT_REQUIRED" | "PENDING" | "MANUAL_CONFIRMATION" | "EVIDENCE_REVIEW" | "API_VERIFICATION" | "PROVIDER_CONFIRMATION" | "FAILED" | "REJECTED";
export interface Payment { readonly id:UUID; readonly method:PaymentMethod; readonly amount:Money; readonly verificationStatus:VerificationStatus; readonly recordedAt:string; }
export function recordPayment(input:{id:UUID;method:PaymentMethod;amount:Money;recordedAt:string;verificationStatus?:VerificationStatus}):Payment {
  return Object.freeze({...input,verificationStatus:input.verificationStatus ?? (input.method==="CASH"?"NOT_REQUIRED":"PENDING")});
}
