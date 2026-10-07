import type { AuthorizationAssignment, AuthorizationSnapshot } from "./policy.js";
import type { DeviceId, UserId } from "../kernel/types.js";

export function createAuthorizationSnapshot(input:{snapshotId:string;version:number;issuedAt:string;expiresAt:string;deviceId:DeviceId;userId:UserId;assignments:readonly AuthorizationAssignment[]}):AuthorizationSnapshot {
  if (Date.parse(input.expiresAt)<=Date.parse(input.issuedAt)) throw new Error("INVALID_AUTHORIZATION_SNAPSHOT_WINDOW");
  return {...input,revoked:false,integrityVerified:true};
}
export function revokeAuthorizationSnapshot(snapshot:AuthorizationSnapshot):AuthorizationSnapshot { return {...snapshot,revoked:true}; }
export function assertSnapshotDevice(snapshot:AuthorizationSnapshot,userId:UserId,deviceId:DeviceId):void {
  if(snapshot.userId!==userId || snapshot.deviceId!==deviceId) throw new Error("AUTHORIZATION_SNAPSHOT_DEVICE_MISMATCH");
}
