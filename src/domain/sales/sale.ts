import type { BranchId, DeviceId, OrganizationId, UUID } from "../../kernel/types.js";
import type { Money } from "../../kernel/money.js";
import type { Payment } from "./payment.js";

export type SaleStatus = "COMPLETED" | "REVERSED";
export interface SaleLine { readonly id:UUID; readonly productId:UUID; readonly batchId:UUID; readonly quantity:number; readonly unitPrice:Money; readonly lineTotal:Money; }
export interface Sale { readonly id:UUID; readonly organizationId:OrganizationId; readonly branchId:BranchId; readonly deviceId:DeviceId; readonly cashSessionId:UUID; readonly lines:readonly SaleLine[]; readonly payments:readonly Payment[]; readonly status:SaleStatus; readonly createdAt:string; readonly version:number; }
export function createSale(input:{id:UUID;organizationId:OrganizationId;branchId:BranchId;deviceId:DeviceId;cashSessionId:UUID;lines:readonly SaleLine[];payments:readonly Payment[];createdAt:string}):Sale {
  if(input.lines.length===0) throw new Error("SALE_REQUIRES_LINES");
  return Object.freeze({...input,status:"COMPLETED" as const,version:0});
}
export function reverseSale(sale:Sale):Sale {
  if(sale.status!=="COMPLETED") throw new Error("SALE_NOT_REVERSIBLE");
  return Object.freeze({...sale,status:"REVERSED" as const,version:sale.version+1});
}
