import test from "node:test";
import assert from "node:assert/strict";

test("platform provisioned graph preserves tenant/org/branch/admin scope and mandatory password change", async () => {
  const m = await import("../dist/src/domain/platform/platform-administration.js");
  const graph = {
    tenant:{id:"t1",name:"T",code:"T",status:"ACTIVE",version:1},
    organization:{id:"o1",tenantId:"t1",name:"O",status:"ACTIVE",version:1},
    branch:{id:"b1",organizationId:"o1",name:"B",code:"B",status:"ACTIVE",version:1},
    subscription:{id:"s1",tenantId:"t1",planCode:"STANDARD",status:"ACTIVE",startsAt:"2026-10-07T00:00:00Z",version:1},
    initialAdmin:{id:"u1",tenantId:"t1",organizationId:"o1",branchId:"b1",username:"admin",displayName:"Admin",status:"PASSWORD_CHANGE_REQUIRED",version:1}
  };
  assert.doesNotThrow(()=>m.assertProvisionedGraphInvariant(graph));
  assert.throws(()=>m.assertProvisionedGraphInvariant({...graph,initialAdmin:{...graph.initialAdmin,status:"ACTIVE"}}),/LIFECYCLE/);
  assert.throws(()=>m.assertProvisionedGraphInvariant({...graph,branch:{...graph.branch,organizationId:"o2"}}),/ORGANIZATION/);
});
