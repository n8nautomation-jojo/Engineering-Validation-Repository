import type { RequestContext } from "../context.js";
import { assertTrustedScope } from "../context.js";
import type { Sale } from "../../domain/sales/sale.js";
import type { CashSession } from "../../domain/cash/cash-session.js";
import { createSale } from "../../domain/sales/sale.js";

export interface CompleteSaleInput {
  readonly saleId:string; readonly cashSession:CashSession; readonly sale:Omit<Sale,"status"|"version">;
}
export function validateSaleAcceptance(context:RequestContext,input:CompleteSaleInput):Sale {
  assertTrustedScope(context);
  if(!context.branchId || context.branchId!==input.sale.branchId) throw new Error("BRANCH_SCOPE_MISMATCH");
  if(!context.deviceId || context.deviceId!==input.sale.deviceId) throw new Error("DEVICE_SCOPE_MISMATCH");
  if(input.cashSession.status!=="OPEN") throw new Error("CASH_SESSION_REQUIRED");
  if(input.cashSession.branchId!==input.sale.branchId || input.cashSession.deviceId!==input.sale.deviceId) throw new Error("CASH_SESSION_SCOPE_MISMATCH");
  return createSale(input.sale);
}
