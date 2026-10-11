import type { RequestContext } from "../context.js";
import { assertTrustedScope } from "../context.js";
import { consumeOfflineAllocation, remainingCapacity, assertOfflineAllocationValid, type OfflineSafetyAllocation } from "../../domain/inventory/offline-allocation.js";

export interface OfflineSaleSafetyInput {
  readonly allocation: OfflineSafetyAllocation;
  readonly productId: string;
  readonly batchExpired: boolean;
  readonly fefoEligible: boolean;
  readonly quantity: number;
  readonly now?: string;
}

export function validateAndConsumeOfflineSaleSafety(context: RequestContext, input: OfflineSaleSafetyInput): OfflineSafetyAllocation {
  assertTrustedScope(context);
  if (!context.branchId || context.branchId !== input.allocation.branchId) throw new Error("BRANCH_SCOPE_MISMATCH");
  if (!context.deviceId || context.deviceId !== input.allocation.deviceId) throw new Error("DEVICE_SCOPE_MISMATCH");
  if (!context.warehouseId || context.warehouseId !== input.allocation.warehouseId) throw new Error("WAREHOUSE_SCOPE_MISMATCH");
  if (!input.allocation.issuedAt || !input.allocation.validFrom || !input.allocation.expiresAt) {
    throw new Error("OFFLINE_ALLOCATION_INVALID");
  }
  if (input.allocation.state !== "ACTIVE") throw new Error("OFFLINE_ALLOCATION_UNAVAILABLE");
  if (input.now) {
    assertOfflineAllocationValid(input.allocation, input.now);
  }
  if (input.productId !== input.allocation.productId) throw new Error("PRODUCT_SCOPE_MISMATCH");
  if (input.batchExpired) throw new Error("EXPIRED_BATCH");
  if (!input.fefoEligible) throw new Error("FEFO_VIOLATION");
  if (input.quantity > remainingCapacity(input.allocation)) throw new Error("OFFLINE_ALLOCATION_EXHAUSTED");
  return consumeOfflineAllocation(input.allocation, input.quantity, input.now);
}
