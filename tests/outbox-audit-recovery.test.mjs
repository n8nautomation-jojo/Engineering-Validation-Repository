import test from "node:test";
import assert from "node:assert/strict";
import { createAuditRecord } from "../dist/src/infrastructure/audit.js";

test("audit record is immutable at the object boundary",()=>{const r=createAuditRecord({id:"a1",occurredAt:"2026-10-07T01:00:00Z",actorId:"u1",action:"SALE_COMPLETED",resourceType:"Sale",resourceId:"s1",tenantId:"t1",organizationId:"o1",correlationId:"c1"});assert.equal(Object.isFrozen(r),true);});
