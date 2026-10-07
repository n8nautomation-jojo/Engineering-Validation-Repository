import type { Capability } from "./capabilities.js";
import type { AuthorizationDecision } from "./policy.js";
import type { DeviceId,TenantId,OrganizationId,BranchId,WarehouseId,UserId } from "../kernel/types.js";
export interface AuthorizationAuditEvent {
  readonly actorUserId:UserId; readonly deviceId?:DeviceId; readonly tenantId:TenantId; readonly organizationId:OrganizationId;
  readonly branchId?:BranchId; readonly warehouseId?:WarehouseId; readonly capability:Capability; readonly decision:"ALLOW"|"DENY";
  readonly reason:string; readonly policyVersion?:string; readonly snapshotVersion?:number; readonly resource?:string; readonly occurredAt:string; readonly correlationId:string;
}
export function toAuthorizationAuditEvent(input:{decision:AuthorizationDecision;actorUserId:UserId;deviceId?:DeviceId;tenantId:TenantId;organizationId:OrganizationId;branchId?:BranchId;warehouseId?:WarehouseId;resource?:string;occurredAt:string;correlationId:string}):AuthorizationAuditEvent{
 return {
  actorUserId:input.actorUserId,tenantId:input.tenantId,organizationId:input.organizationId,capability:input.decision.capability,
  decision:input.decision.allowed?"ALLOW":"DENY",reason:input.decision.reason,occurredAt:input.occurredAt,correlationId:input.correlationId,
  ...(input.deviceId===undefined?{}:{deviceId:input.deviceId}),...(input.branchId===undefined?{}:{branchId:input.branchId}),
  ...(input.warehouseId===undefined?{}:{warehouseId:input.warehouseId}),...(input.resource===undefined?{}:{resource:input.resource}),
  ...(input.decision.policyVersion===undefined?{}:{policyVersion:input.decision.policyVersion}),
  ...(input.decision.snapshotVersion===undefined?{}:{snapshotVersion:input.decision.snapshotVersion})
 };
}
