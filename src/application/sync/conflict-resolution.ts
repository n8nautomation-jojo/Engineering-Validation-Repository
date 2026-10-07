import type { AuthorizationAssignment, AuthorizationRequest, ResourceScope, SoDPolicy } from "../../authorization/policy.js";
import { authorize } from "../../authorization/engine.js";
import { CAPABILITIES } from "../../authorization/capabilities.js";
import { type SyncConflict, type ResolutionClass, beginResolution, containConflict, resolveConflict } from "../../domain/sync/conflict.js";

export interface ConflictResolutionRequest {
  readonly authorization: AuthorizationRequest;
  readonly assignments: readonly AuthorizationAssignment[];
  readonly conflict: SyncConflict;
  readonly resolutionClass: ResolutionClass;
  readonly resultingEffectIds: readonly string[];
  readonly independentApprovalRequired?: boolean;
  readonly creatorUserId?: string;
}
export interface ConflictResolutionDecision { readonly allowed:boolean; readonly conflict:SyncConflict; readonly reason:string; }

export function resolveSyncConflict(request:ConflictResolutionRequest):ConflictResolutionDecision {
  if (request.authorization.capability !== "sync.conflict.resolve")
    return {allowed:false,conflict:request.conflict,reason:"CONFLICT_RESOLUTION_CAPABILITY_REQUIRED"};
  let sod: SoDPolicy | undefined = request.authorization.sod;
  if (request.independentApprovalRequired === true) {
    sod = request.creatorUserId === undefined
      ? {independentApprovalRequired:true}
      : {independentApprovalRequired:true,creatorUserId:request.creatorUserId};
  }
  const authorization: AuthorizationRequest = sod === undefined
    ? request.authorization
    : {...request.authorization,sod};
  const decision=authorize(authorization,request.assignments);
  if(!decision.allowed) return {allowed:false,conflict:request.conflict,reason:decision.reason};
  if(request.resolutionClass==="R-CONTAIN") return {allowed:true,conflict:containConflict(request.conflict),reason:"CONFLICT_CONTAINED"};
  if(request.conflict.state!=="TRIAGED") return {allowed:false,conflict:request.conflict,reason:"CONFLICT_NOT_TRIAGE_READY"};
  const resolving=beginResolution(request.conflict,request.resolutionClass);
  return {allowed:true,conflict:resolveConflict(resolving,request.resultingEffectIds),reason:"CONFLICT_RESOLVED"};
}
