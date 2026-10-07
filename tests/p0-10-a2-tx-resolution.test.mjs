import test from "node:test";
import assert from "node:assert/strict";
import { resolveConflictTransactionally } from "../dist/src/application/sync/transactional-resolution.js";
import { InMemoryConflictResolutionUnitOfWork } from "../dist/src/persistence/a2-test-adapter.js";
import { detectConflict, classifyConflict, triageConflict } from "../dist/src/domain/sync/conflict.js";

const ctx={tenantId:"t1",organizationId:"o1",branchId:"b1",warehouseId:"w1",deviceId:"d1",userId:"u1"};
const assignment={userId:"u1",capabilities:["sync.conflict.resolve"],scope:{tenantId:"t1",organizationId:"o1",branchIds:["b1"],warehouseIds:["w1"],deviceIds:["d1"]},policyVersion:"p1"};
const conflict=()=>triageConflict(classifyConflict(detectConflict({id:"c-tx-1",operationId:"op-tx-1",type:"STALE_VERSION",severity:"P1",originalEffectIds:["effect-1"],resultingEffectIds:[],createdAt:"2026-10-07T00:00:00Z"})));
const request=()=>({authorization:{context:ctx,capability:"sync.conflict.resolve",offline:false,now:"2026-10-07T01:00:00Z"},assignments:[assignment],conflict:conflict(),resolutionClass:"R-HUMAN",resultingEffectIds:["effect-2"]});

test("transaction commits conflict and audit",async()=>{
 const uow=new InMemoryConflictResolutionUnitOfWork();
 const r=await resolveConflictTransactionally(request(),"fp-1",uow);
 assert.equal(r.decision.allowed,true); assert.equal(r.decision.conflict.state,"RESOLVED");
 assert.equal(uow.committed,1); assert.equal(uow.audits.length,1);
});

test("same fingerprint replays without duplicate audit",async()=>{
 const uow=new InMemoryConflictResolutionUnitOfWork(), req=request();
 await resolveConflictTransactionally(req,"fp-1",uow);
 const r=await resolveConflictTransactionally(req,"fp-1",uow);
 assert.equal(r.replayed,true); assert.equal(uow.audits.length,1);
});

test("different fingerprint cannot resolve an already resolved conflict",async()=>{
 const uow=new InMemoryConflictResolutionUnitOfWork(), req=request();
 await resolveConflictTransactionally(req,"fp-1",uow);
 const r=await resolveConflictTransactionally(req,"fp-2",uow);
 assert.equal(r.decision.allowed,false); assert.equal(r.decision.reason,"CONFLICT_ALREADY_RESOLVED");
});

test("authorization denial leaves persistence untouched",async()=>{
 const uow=new InMemoryConflictResolutionUnitOfWork();
 const req={...request(),authorization:{...request().authorization,capability:"sales.read"}};
 const r=await resolveConflictTransactionally(req,"fp-denied",uow);
 assert.equal(r.decision.allowed,false); assert.equal(uow.getConflict("c-tx-1"),null); assert.equal(uow.audits.length,0);
});
