import type { ConflictResolutionDecision, ConflictResolutionRequest } from "./conflict-resolution.js";
import { resolveSyncConflict } from "./conflict-resolution.js";
import type { ConflictRecord } from "../../infrastructure/conflict-store.js";
import type { AuditRecord, ConflictResolutionUnitOfWork } from "../../persistence/contracts.js";
export interface TransactionalResolutionResult { readonly replayed:boolean; readonly decision:ConflictResolutionDecision; }
export async function resolveConflictTransactionally(request:ConflictResolutionRequest,requestFingerprint:string,unitOfWork:ConflictResolutionUnitOfWork):Promise<TransactionalResolutionResult>{
  return unitOfWork.execute(request,async persistence=>{
    const existing=await persistence.findConflict(request.conflict.id);
    const existingFingerprint=await persistence.findResolutionFingerprint(request.conflict.id);
    if(existing&&existingFingerprint===requestFingerprint) return {replayed:true,decision:{allowed:true,conflict:existing.conflict,reason:"CONFLICT_RESOLUTION_REPLAY"}};
    if(existing&&existing.conflict.state==="RESOLVED") return {replayed:false,decision:{allowed:false,conflict:existing.conflict,reason:"CONFLICT_ALREADY_RESOLVED"}};
    const decision=resolveSyncConflict(request); if(!decision.allowed) return {replayed:false,decision};
    const record:ConflictRecord = decision.conflict.state==="RESOLVED"
      ? {conflict:decision.conflict,requestFingerprint,resolvedAt:new Date().toISOString()}
      : {conflict:decision.conflict,requestFingerprint};
    if(existing) await persistence.updateConflict(request.conflict.id,record); else await persistence.insertConflict(record);
    const context=request.authorization.context;
    const audit:AuditRecord = {
      id:`audit-conflict-${request.conflict.id}-${requestFingerprint}`,occurredAt:request.authorization.now,actorId:context.userId,
      action:decision.conflict.state==="CONTAINED"?"SYNC_CONFLICT_CONTAINED":"SYNC_CONFLICT_RESOLVED",
      resourceType:"SyncConflict",resourceId:request.conflict.id,tenantId:context.tenantId,organizationId:context.organizationId,
      ...(context.branchId===undefined?{}:{branchId:context.branchId}),...(context.deviceId===undefined?{}:{deviceId:context.deviceId}),
      correlationId:request.conflict.operationId,...(request.authorization.reason===undefined?{}:{reason:request.authorization.reason}),
      before:request.conflict,after:decision.conflict
    };
    await persistence.appendAudit(audit);
    return {replayed:false,decision};
  });
}
