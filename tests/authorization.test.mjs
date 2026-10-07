import test from "node:test";
import assert from "node:assert/strict";
import { authorize } from "../dist/src/authorization/engine.js";
import { createAuthorizationSnapshot, revokeAuthorizationSnapshot } from "../dist/src/authorization/snapshot.js";

const ids={tenantId:"t1",organizationId:"o1",branchId:"b1",warehouseId:"w1",deviceId:"d1",userId:"u1"};
const assignment={userId:"u1",capabilities:["sales.create","payments.record","inventory.read","inventory.adjust.approve"],scope:{tenantId:"t1",organizationId:"o1",branchIds:["b1"],warehouseIds:["w1"],deviceIds:["d1"]},policyVersion:"p1"};

test("capability is allowed inside effective scope",()=>assert.equal(authorize({capability:"sales.create",context:ids,offline:false,now:"2026-10-07T00:00:00Z"},[assignment]).allowed,true));
test("missing capability is denied",()=>assert.equal(authorize({capability:"sales.return",context:ids,offline:false,now:"2026-10-07T00:00:00Z"},[assignment]).allowed,false));
test("request cannot widen assignment scope",()=>assert.equal(authorize({capability:"sales.create",context:{...ids,branchId:"b2"},offline:false,now:"2026-10-07T00:00:00Z"},[assignment]).allowed,false));
test("resource scope cannot widen assignment",()=>assert.equal(authorize({capability:"sales.create",context:ids,resource:{tenantId:"t1",organizationId:"o1",branchId:"b2"},offline:false,now:"2026-10-07T00:00:00Z"},[assignment]).allowed,false));
test("offline eligible requires valid device-bound snapshot",()=>{const s=createAuthorizationSnapshot({snapshotId:"s1",version:1,issuedAt:"2026-10-07T00:00:00Z",expiresAt:"2026-10-08T00:00:00Z",deviceId:"d1",userId:"u1",assignments:[assignment]}); const d=authorize({capability:"sales.create",context:ids,offline:true,now:"2026-10-07T01:00:00Z",snapshot:s},[assignment]); assert.equal(d.allowed,true);});
test("online-only capability is denied offline",()=>{const s=createAuthorizationSnapshot({snapshotId:"s1",version:1,issuedAt:"2026-10-07T00:00:00Z",expiresAt:"2026-10-08T00:00:00Z",deviceId:"d1",userId:"u1",assignments:[assignment]}); const d=authorize({capability:"inventory.adjust.approve",context:ids,offline:true,now:"2026-10-07T01:00:00Z",snapshot:s},[assignment]); assert.equal(d.reason,"OFFLINE_NOT_PERMITTED");});
test("expired snapshot is denied",()=>{const s=createAuthorizationSnapshot({snapshotId:"s1",version:1,issuedAt:"2026-10-06T00:00:00Z",expiresAt:"2026-10-07T00:00:00Z",deviceId:"d1",userId:"u1",assignments:[assignment]}); assert.equal(authorize({capability:"sales.create",context:ids,offline:true,now:"2026-10-07T00:00:01Z",snapshot:s},[assignment]).allowed,false);});
test("revoked device authority is denied",()=>{const s=createAuthorizationSnapshot({snapshotId:"s1",version:1,issuedAt:"2026-10-07T00:00:00Z",expiresAt:"2026-10-08T00:00:00Z",deviceId:"d1",userId:"u1",assignments:[assignment]}); const r=revokeAuthorizationSnapshot(s); assert.equal(authorize({capability:"sales.create",context:ids,offline:true,now:"2026-10-07T01:00:00Z",snapshot:r},[assignment]).allowed,false);});
test("self approval is denied when SoD requires independence",()=>assert.equal(authorize({capability:"inventory.adjust.approve",context:ids,offline:false,now:"2026-10-07T00:00:00Z",sod:{independentApprovalRequired:true,creatorUserId:"u1"}},[assignment]).reason,"SOD_SELF_APPROVAL_DENIED"));
test("sensitive decisions require auditable outcome",()=>assert.equal(authorize({capability:"sales.create",context:ids,offline:false,now:"2026-10-07T00:00:00Z"},[assignment]).auditRequired,true));
