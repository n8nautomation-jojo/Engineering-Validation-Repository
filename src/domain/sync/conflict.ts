export type ConflictSeverity = "P0" | "P1" | "P2";
export type ConflictType = "DUPLICATE_OPERATION" | "ORDERING_DELAY" | "STOCK_SHORTFALL" | "BATCH_INELIGIBILITY" | "ALLOCATION_COLLISION" | "SCOPE_VIOLATION" | "STALE_VERSION" | "RETURN_REFUND_MISMATCH" | "PAYMENT_VERIFICATION" | "AUTHORIZATION_REVOCATION" | "INTEGRITY_FAILURE";
export type ConflictState = "DETECTED" | "CLASSIFIED" | "TRIAGED" | "RESOLVING" | "RESOLVED" | "CONTAINED" | "ESCALATED" | "FAILED";
export type ResolutionClass = "R-AUTO-IDEMPOTENT" | "R-AUTO-DETERMINISTIC" | "R-COMPENSATE" | "R-HUMAN" | "R-CONTAIN";

export interface SyncConflict {
  readonly id:string;
  readonly operationId:string;
  readonly type:ConflictType;
  readonly severity:ConflictSeverity;
  readonly state:ConflictState;
  readonly resolutionClass?:ResolutionClass;
  readonly originalEffectIds:readonly string[];
  readonly resultingEffectIds:readonly string[];
  readonly createdAt:string;
  readonly version:number;
}

export function detectConflict(input:Omit<SyncConflict,"state"|"version">):SyncConflict {
  return Object.freeze({...input,state:"DETECTED",version:0});
}
export function classifyConflict(c:SyncConflict):SyncConflict {
  if(c.state!=="DETECTED") throw new Error("INVALID_CONFLICT_TRANSITION");
  return Object.freeze({...c,state:"CLASSIFIED",version:c.version+1});
}
export function triageConflict(c:SyncConflict):SyncConflict {
  if(c.state!=="CLASSIFIED") throw new Error("INVALID_CONFLICT_TRANSITION");
  return Object.freeze({...c,state:"TRIAGED",version:c.version+1});
}
export function beginResolution(c:SyncConflict,resolutionClass:ResolutionClass):SyncConflict {
  if(c.state!=="TRIAGED") throw new Error("INVALID_CONFLICT_TRANSITION");
  return Object.freeze({...c,state:"RESOLVING",resolutionClass,version:c.version+1});
}
export function resolveConflict(c:SyncConflict,effectIds:readonly string[]):SyncConflict {
  if(c.state!=="RESOLVING") throw new Error("INVALID_CONFLICT_TRANSITION");
  return Object.freeze({...c,state:"RESOLVED",resultingEffectIds:Object.freeze([...effectIds]),version:c.version+1});
}
export function containConflict(c:SyncConflict):SyncConflict {
  if(c.state!=="CLASSIFIED" && c.state!=="TRIAGED") throw new Error("INVALID_CONFLICT_TRANSITION");
  return Object.freeze({...c,state:"CONTAINED",version:c.version+1});
}
