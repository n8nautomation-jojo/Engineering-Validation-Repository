import test from "node:test";
import assert from "node:assert/strict";
const base = {
  idempotencyKey:"idem-001", correlationId:"corr-001", reason:"Initial tenant onboarding",
  actor:{plane:"PLATFORM_OWNER",userId:"platform-owner-1"},
  tenant:{id:"tenant-1",name:"Example Pharmacy Group",code:"EPG"},
  organization:{id:"org-1",name:"Example Pharmacy Group"},
  branch:{id:"branch-1",name:"Main Branch",code:"MAIN"},
  initialAdmin:{userId:"user-1",username:"admin@example",displayName:"Initial Admin",temporaryCredentialExpiresAt:"2026-10-08T00:00:00Z"},
  subscription:{planCode:"STANDARD",status:"ACTIVE",startsAt:"2026-10-07T00:00:00Z"}
};
test("provisioning has mandatory password-change state and no pharmacy effects",async()=>{
 const m=await import("../dist/src/application/platform/provisioning-contract.js"); let n=0;
 const p={async findIdempotentResult(){return null},async provisionAtomic(){n++}};
 const c={async issue(){return {credentialId:"cred-1",expiresAt:"2026-10-08T00:00:00Z"}}};
 const r=await m.provisionPlatformTenant(base,p,c);
 assert.equal(r.initialAdminLifecycle,"PASSWORD_CHANGE_REQUIRED"); assert.equal(r.stockCreated,false); assert.equal(r.pharmacyTransactionsCreated,false); assert.equal(n,1);
});
test("tenant authority cannot provision platform tenant",async()=>{
 const m=await import("../dist/src/application/platform/provisioning-contract.js");
 assert.throws(()=>m.validatePlatformProvisioning({...base,actor:{plane:"TENANT_USER",userId:"u",tenantId:"tenant-1",organizationId:"org-1"}}),/PLATFORM/);
});
test("idempotent replay returns prior result without issuing a credential",async()=>{
 const m=await import("../dist/src/application/platform/provisioning-contract.js");
 const prior={tenantId:"tenant-1",organizationId:"org-1",branchId:"branch-1",initialAdminUserId:"user-1",initialAdminLifecycle:"PASSWORD_CHANGE_REQUIRED",temporaryCredential:{credentialId:"cred-1",expiresAt:"2026-10-08T00:00:00Z"},stockCreated:false,pharmacyTransactionsCreated:false};
 let n=0; const p={async findIdempotentResult(){return prior},async provisionAtomic(){n++},async saveIdempotentResult(){},async appendAudit(){}}; const c={async issue(){throw Error("must not issue")}};
 assert.deepEqual(await m.provisionPlatformTenant(base,p,c),prior); assert.equal(n,0);
});