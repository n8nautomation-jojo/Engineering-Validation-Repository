import { OFFLINE_CLASS } from "./capabilities.js";
import type { AuthorizationAssignment, AuthorizationRequest, AuthorizationDecision, Scope, ResourceScope } from "./policy.js";
const same=(a?:string,b?:string)=>a===undefined||b===undefined||a===b;
const includes=(list:readonly string[]|undefined,value?:string)=>value===undefined||list===undefined||list.includes(value);
function scopeAllows(scope:Scope,req:AuthorizationRequest,resource?:ResourceScope):boolean{
 const c=req.context;
 if(!same(scope.tenantId,c.tenantId)||!same(scope.organizationId,c.organizationId)) return false;
 if(!includes(scope.branchIds,c.branchId)||!includes(scope.warehouseIds,c.warehouseId)||!includes(scope.deviceIds,c.deviceId)) return false;
 if(!resource) return true;
 if(!same(scope.tenantId,resource.tenantId)||!same(scope.organizationId,resource.organizationId)) return false;
 if(!includes(scope.branchIds,resource.branchId)||!includes(scope.warehouseIds,resource.warehouseId)||!includes(scope.deviceIds,resource.deviceId)) return false;
 if(!same(c.tenantId,resource.tenantId)||!same(c.organizationId,resource.organizationId)||!same(c.branchId,resource.branchId)||!same(c.warehouseId,resource.warehouseId)||!same(c.deviceId,resource.deviceId)) return false;
 return true;
}
const DEFAULT_OFFLINE_AUTHORITY_MAX_AGE_MS=24*60*60*1000;
function validSnapshot(s:NonNullable<AuthorizationRequest["snapshot"]>,now:string):boolean{
 const issued=Date.parse(s.issuedAt),expires=Date.parse(s.expiresAt),current=Date.parse(now);
 return s.integrityVerified&&!s.revoked&&Number.isFinite(issued)&&Number.isFinite(expires)&&Number.isFinite(current)&&expires>issued&&expires-issued<=DEFAULT_OFFLINE_AUTHORITY_MAX_AGE_MS&&current>=issued&&current<=expires;
}
export function authorize(request:AuthorizationRequest,assignments:readonly AuthorizationAssignment[]):AuthorizationDecision{
 const offlineClass=OFFLINE_CLASS[request.capability];
 if(request.offline&&(offlineClass==="ONLINE_ONLY"||offlineClass==="NEVER_OFFLINE")) return {allowed:false,reason:"OFFLINE_NOT_PERMITTED",capability:request.capability,offlineClass,auditRequired:true};
 const candidates=assignments.filter(a=>a.userId===request.context.userId&&a.capabilities.includes(request.capability)&&scopeAllows(a.scope,request,request.resource));
 if(candidates.length===0) return {allowed:false,reason:"CAPABILITY_OR_SCOPE_DENIED",capability:request.capability,offlineClass,auditRequired:true};
 const candidate=candidates[0];
 if(candidate===undefined) return {allowed:false,reason:"CAPABILITY_OR_SCOPE_DENIED",capability:request.capability,offlineClass,auditRequired:true};
 if(request.offline){
  const s=request.snapshot;
  if(!s||s.userId!==request.context.userId||s.deviceId!==request.context.deviceId||!validSnapshot(s,request.now)) return {allowed:false,reason:"OFFLINE_AUTHORITY_INVALID",capability:request.capability,offlineClass,auditRequired:true};
  const snapOk=s.assignments.some(a=>a.userId===request.context.userId&&a.capabilities.includes(request.capability)&&scopeAllows(a.scope,request,request.resource));
  if(!snapOk) return {allowed:false,reason:"OFFLINE_SNAPSHOT_SCOPE_DENIED",capability:request.capability,offlineClass,auditRequired:true};
 }
 if(request.sod?.independentApprovalRequired&&request.sod.creatorUserId===request.context.userId) return {allowed:false,reason:"SOD_SELF_APPROVAL_DENIED",capability:request.capability,offlineClass,...(candidate.policyVersion===undefined?{}:{policyVersion:candidate.policyVersion}),auditRequired:true};
 return {allowed:true,reason:"AUTHORIZED",capability:request.capability,offlineClass,...(candidate.policyVersion===undefined?{}:{policyVersion:candidate.policyVersion}),...(request.snapshot===undefined?{}:{snapshotVersion:request.snapshot.version}),auditRequired:true};
}
