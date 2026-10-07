import type { BranchId, OrganizationId, UUID } from "../../kernel/types.js";
import type { Quantity } from "../../kernel/quantity.js";
export type InventoryTransactionStatus="POSTED"|"REVERSED";
export type StockMovementDirection="IN"|"OUT";
export interface StockMovement { readonly id:UUID; readonly productId:UUID; readonly batchId:UUID; readonly warehouseId:UUID; readonly direction:StockMovementDirection; readonly quantity:Quantity; readonly sourceTransactionId:UUID; }
export interface InventoryTransaction { readonly id:UUID; readonly organizationId:OrganizationId; readonly branchId:BranchId; readonly sourceType:"SALE"|"SALE_REVERSAL"; readonly sourceId:UUID; readonly reversalOfTransactionId?:UUID; readonly status:InventoryTransactionStatus; readonly movements:readonly StockMovement[]; readonly createdAt:string; readonly version:number; }
export function postInventoryTransaction(input:Omit<InventoryTransaction,"status"|"version">):InventoryTransaction{
 if(input.movements.length===0) throw new Error("INVENTORY_TRANSACTION_REQUIRES_MOVEMENTS");
 return Object.freeze({...input,status:"POSTED" as const,version:0});
}
export function reverseInventoryTransaction(tx:InventoryTransaction,id:UUID,createdAt:string):InventoryTransaction{
 if(tx.status!=="POSTED") throw new Error("INVENTORY_TRANSACTION_NOT_REVERSIBLE");
 return Object.freeze({
  id,organizationId:tx.organizationId,branchId:tx.branchId,sourceType:"SALE_REVERSAL" as const,sourceId:tx.sourceId,
  reversalOfTransactionId:tx.id,status:"POSTED" as const,
  movements:tx.movements.map(m=>({...m,id:id+"-"+m.id,direction:(m.direction==="OUT"?"IN":"OUT") as StockMovementDirection})),
  createdAt,version:0
 });
}
