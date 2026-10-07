import type { ConflictResolutionRequest, ConflictResolutionDecision } from "./conflict-resolution.js";
import { resolveSyncConflict } from "./conflict-resolution.js";
import type { ConflictStore, ConflictRecord } from "../../infrastructure/conflict-store.js";
export interface ResolutionResult { readonly replayed:boolean; readonly decision:ConflictResolutionDecision; }
export async function resolveIdempotently(request:ConflictResolutionRequest,store:ConflictStore,requestFingerprint:string):Promise<ResolutionResult>{
  const existing=await store.get(request.conflict.id);
  if(existing?.requestFingerprint===requestFingerprint) return {replayed:true,decision:{allowed:true,conflict:existing.conflict,reason:"CONFLICT_RESOLUTION_REPLAY"}};
  if(existing&&existing.conflict.state==="RESOLVED") return {replayed:false,decision:{allowed:false,conflict:existing.conflict,reason:"CONFLICT_ALREADY_RESOLVED"}};
  const decision=resolveSyncConflict(request); if(!decision.allowed) return {replayed:false,decision};
  const record:ConflictRecord = decision.conflict.state==="RESOLVED"
    ? {conflict:decision.conflict,requestFingerprint,resolvedAt:new Date().toISOString()}
    : {conflict:decision.conflict,requestFingerprint};
  if(existing) await store.markResolved(request.conflict.id,record); else await store.put(record);
  return {replayed:false,decision};
}
