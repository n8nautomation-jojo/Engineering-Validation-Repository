import type { BranchId, DeviceId, UUID } from "../../kernel/types.js";

export type OfflineAllocationState = "UNALLOCATED" | "ACTIVE" | "EXHAUSTED" | "SUSPENDED" | "EXPIRED" | "RECONCILING" | "RECONCILED";

export interface OfflineSafetyAllocation {
  readonly id:UUID; readonly branchId:BranchId; readonly warehouseId:UUID; readonly deviceId:DeviceId;
  readonly productId:UUID; readonly allocatedCapacity:number; readonly consumedCapacity:number;
  readonly releasedCapacity:number; readonly state:OfflineAllocationState; readonly version:number;
}

export function createOfflineAllocation(input:Omit<OfflineSafetyAllocation,"consumedCapacity"|"releasedCapacity"|"state"|"version">):OfflineSafetyAllocation {
  if(input.allocatedCapacity<0 || !Number.isFinite(input.allocatedCapacity)) throw new Error("INVALID_ALLOCATION_CAPACITY");
  return Object.freeze({...input,consumedCapacity:0,releasedCapacity:0,state:"ACTIVE" as const,version:0});
}
export function remainingCapacity(a:OfflineSafetyAllocation):number {
  return a.allocatedCapacity-a.consumedCapacity+a.releasedCapacity;
}
export function consumeOfflineAllocation(a:OfflineSafetyAllocation,quantity:number):OfflineSafetyAllocation {
  if(a.state!=="ACTIVE") throw new Error("OFFLINE_ALLOCATION_UNAVAILABLE");
  if(!Number.isFinite(quantity)||quantity<=0) throw new Error("INVALID_ALLOCATION_CONSUMPTION");
  if(quantity>remainingCapacity(a)) throw new Error("OFFLINE_ALLOCATION_EXHAUSTED");
  const consumed=a.consumedCapacity+quantity;
  return Object.freeze({...a,consumedCapacity:consumed,state:remainingCapacity({...a,consumedCapacity:consumed})===0?"EXHAUSTED":"ACTIVE",version:a.version+1});
}
export function suspendOfflineAllocation(a:OfflineSafetyAllocation):OfflineSafetyAllocation {
  if(a.state!=="ACTIVE") throw new Error("INVALID_ALLOCATION_TRANSITION");
  return Object.freeze({...a,state:"SUSPENDED" as const,version:a.version+1});
}
export function reconcileOfflineAllocation(a:OfflineSafetyAllocation):OfflineSafetyAllocation {
  if(a.state!=="RECONCILING") throw new Error("INVALID_ALLOCATION_TRANSITION");
  return Object.freeze({...a,state:"RECONCILED" as const,version:a.version+1});
}
