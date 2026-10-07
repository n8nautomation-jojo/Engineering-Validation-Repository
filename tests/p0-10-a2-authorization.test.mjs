import test from "node:test";
import assert from "node:assert/strict";
import { resolveSyncConflict } from "../dist/src/application/sync/conflict-resolution.js";
import { detectConflict, classifyConflict, triageConflict } from "../dist/src/domain/sync/conflict.js";

const context = {
  tenantId:"t1", organizationId:"o1", branchId:"b1", warehouseId:"w1",
  deviceId:"d1", userId:"u1", correlationId:"corr-1"
};
const assignment = {
  userId:"u1", capabilities:["sync.conflict.resolve"],
  scope:{tenantId:"t1",organizationId:"o1",branchIds:["b1"],warehouseIds:["w1"],deviceIds:["d1"]},
  policyVersion:"p1"
};
const assignments = [assignment];
const conflict = () => triageConflict(classifyConflict(detectConflict({
  id:"c1",operationId:"op1",type:"STALE_VERSION",severity:"P1",
  originalEffectIds:["effect-1"],resultingEffectIds:[],createdAt:"2026-10-07T00:00:00Z"
})));

test("A2 resolution requires stable sync.conflict.resolve capability", () => {
  const c = conflict();
  const result = resolveSyncConflict({
    authorization:{context,capability:"sales.read",offline:false,now:"2026-10-07T01:00:00Z"},
    assignments,conflict:c,resolutionClass:"R-HUMAN",resultingEffectIds:["effect-2"]
  });
  assert.equal(result.allowed,false);
});

test("A2 authorized resolution creates resulting effects and preserves originals", () => {
  const c = conflict();
  const result = resolveSyncConflict({
    authorization:{context,capability:"sync.conflict.resolve",offline:false,now:"2026-10-07T01:00:00Z"},
    assignments,conflict:c,resolutionClass:"R-HUMAN",resultingEffectIds:["effect-2"]
  });
  assert.equal(result.allowed,true);
  assert.equal(result.conflict.state,"RESOLVED");
  assert.deepEqual(result.conflict.originalEffectIds,["effect-1"]);
  assert.deepEqual(result.conflict.resultingEffectIds,["effect-2"]);
});

test("A2 self-approval is denied when independent approval is required", () => {
  const c = conflict();
  const result = resolveSyncConflict({
    authorization:{context,capability:"sync.conflict.resolve",offline:false,now:"2026-10-07T01:00:00Z"},
    assignments,conflict:c,resolutionClass:"R-COMPENSATE",resultingEffectIds:["effect-3"],
    independentApprovalRequired:true,creatorUserId:"u1"
  });
  assert.equal(result.allowed,false);
  assert.equal(result.reason,"SOD_SELF_APPROVAL_DENIED");
});

test("A2 containment uses the same stable capability", () => {
  const c = conflict();
  const result = resolveSyncConflict({
    authorization:{context,capability:"sync.conflict.resolve",offline:false,now:"2026-10-07T01:00:00Z"},
    assignments,conflict:c,resolutionClass:"R-CONTAIN",resultingEffectIds:[]
  });
  assert.equal(result.allowed,true);
  assert.equal(result.conflict.state,"CONTAINED");
});
