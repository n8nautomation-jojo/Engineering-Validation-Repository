import type { OrganizationId, WarehouseId, UUID } from "../../kernel/types.js";
import type { Quantity } from "../../kernel/quantity.js";

export type BatchStatus = "RECEIPT" | "ACTIVE" | "NEAR_EXPIRY" | "EXPIRED" | "DEPLETED";

export interface Batch {
  readonly id:UUID;
  readonly organizationId:OrganizationId;
  readonly warehouseId:WarehouseId;
  readonly productId:UUID;
  readonly batchNumber:string;
  readonly expiryDate:string;
  readonly quantity:Quantity;
  readonly status:BatchStatus;
  readonly version:number;
}

export function createBatch(input:{id:UUID;organizationId:OrganizationId;warehouseId:WarehouseId;productId:UUID;batchNumber:string;expiryDate:string;quantity:Quantity}):Batch {
  if (!input.batchNumber.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(input.expiryDate)) throw new Error("INVALID_BATCH_IDENTITY");
  if (!Number.isFinite(Date.parse(input.expiryDate+"T00:00:00Z"))) throw new Error("INVALID_EXPIRY_DATE");
  return Object.freeze({...input,status:"RECEIPT" as const,version:0});
}

export function activateBatch(batch:Batch):Batch {
  if (batch.status!=="RECEIPT") throw new Error("INVALID_BATCH_TRANSITION");
  return Object.freeze({...batch,status:"ACTIVE" as const,version:batch.version+1});
}

export function markNearExpiry(batch:Batch):Batch {
  if (batch.status!=="ACTIVE") throw new Error("INVALID_BATCH_TRANSITION");
  return Object.freeze({...batch,status:"NEAR_EXPIRY" as const,version:batch.version+1});
}

export function markExpired(batch:Batch):Batch {
  if (batch.status!=="ACTIVE" && batch.status!=="NEAR_EXPIRY") throw new Error("INVALID_BATCH_TRANSITION");
  return Object.freeze({...batch,status:"EXPIRED" as const,version:batch.version+1});
}

export function markDepleted(batch:Batch):Batch {
  if (batch.quantity.value!==0) throw new Error("BATCH_NOT_DEPLETED");
  if (batch.status!=="ACTIVE" && batch.status!=="NEAR_EXPIRY") throw new Error("INVALID_BATCH_TRANSITION");
  return Object.freeze({...batch,status:"DEPLETED" as const,version:batch.version+1});
}
