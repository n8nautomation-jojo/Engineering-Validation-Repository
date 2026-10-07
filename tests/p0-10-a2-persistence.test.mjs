import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryConflictStore } from "../dist/src/infrastructure/conflict-store.js";
import { resolveIdempotently } from "../dist/src/application/sync/idempotent-resolution.js";
import { detectConflict, classifyConflict, triageConflict } from "../dist/src/domain/sync/conflict.js";

const context={tenantId:"t1",organizationId:"o1",branchId:"b1",warehouseId:"w1",deviceId:"d1",userId:"u1",correlationId:"c1"};
const assignment={userId:"u1",capabilities:["sync.conflict.resolve"],scope:{tenantId:"t1",organizationId:"o1",branchIds:["b1"],warehouseIds:["w1"],deviceIds:["d1"]},policyVersion:"p1"};
const conflict=()=>triageConflict(classifyConflict(detectConflict({id:"cx",operationId:"op",type:"STALE_VERSION",severity:"P1",originalEffectIds:["original"],resultingEffectIds:[],createdAt:"2026-10-07T00:00:00Z"})));

test("A2 resolution replay is idempotent",async()=>{
 const store=new InMemoryConflictStore();
 const request={authorization:{context,capability:"sync.conflict.resolve",offline:false,now:"2026-10-07T01:00:00Z"},assignments:[assignment],conflict:conflict(),resolutionClass:"R-HUMAN",resultingEffectIds:["effect"]};
 const first=await resolveIdempotently(request,store,"fp-1");
 const second=await resolveIdempotently({...request,conflict:first.decision.conflict},store,"fp-1");
 assert.equal(first.decision.allowed,true);
 assert.equal(second.replayed,true);
 assert.deepEqual(second.decision.conflict.resultingEffectIds,["effect"]);
});
