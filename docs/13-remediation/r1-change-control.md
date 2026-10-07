# R1 Governance — Change Control & Plan Guardrail

**Status:** ACTIVE GOVERNANCE CONTROL  
**Owner:** CTO / Architecture  
**Purpose:** Prevent remediation from becoming an open-ended redesign cycle.

## 1. Master Sequence

The execution sequence remains:

1. Locked Foundations
2. R1 Remediation
   - R1-A1 Offline Stock Safety
   - R1-A2 Conflict Resolution
   - R1-A3 Authorization Policy
   - R1-B Security
   - R1-C Compliance
   - R1-D Integration
   - R1-E Product Readiness
   - R1-F Commercial
   - R1-G Documentation Governance
   - R1-H Measurement & Verification
3. R1 Reconciliation / Exit Review
4. Phase 3.4 Review and Promotion
5. Phase 3.5 OpenAPI + Contract Fixtures
6. Implementation

**Phase 3.5 remains BLOCKED until R1 exit criteria are satisfied.**

## 2. Locked Baselines

The following are treated as binding unless formally revised:

- Domain Model v1.1
- Architecture Phase 1 / Phase 2.1
- Phase 2.2
- Phase 2.3
- Phase 2.4
- Phase 3.1
- Phase 3.3

A locked baseline is not reopened merely because a later document is easier to change.

## 3. Rule for Revisiting a Locked Decision

A locked decision may be revisited only when at least one of these is demonstrated:

1. A P0 safety/security/compliance defect cannot be resolved without changing it.
2. A concrete contradiction exists between locked baselines.
3. An approved requirement materially invalidates the decision.
4. Executable testing disproves a locked invariant or assumption.
5. A regulatory/legal determination requires the change.
6. A formally approved ADR/revision supersedes it.

Otherwise the decision remains closed.

## 4. No Silent Reopening

A new R1 document may:
- clarify;
- constrain;
- test;
- reconcile;
- propose a revision.

It may not silently rewrite a locked baseline.

Any required baseline change must identify:
- affected document;
- exact decision;
- evidence;
- impact;
- replacement decision;
- migration/compatibility effect;
- approval status.

## 5. Decision Freeze Rule

Once an R1 work package has:
- a problem definition;
- policy/state model;
- acceptance matrix;
- identified dependencies;

we stop expanding its design unless an unresolved gate requires it.

The next step is cross-track reconciliation, not another redesign loop.

## 6. Open Items Must Be Bounded

An open item must have:
- owner;
- reason it remains open;
- dependency;
- required evidence;
- decision deadline/gate.

“Needs more discussion” is not an acceptable permanent state.

## 7. Change Budget

During R1, design changes should be limited to changes required by:
- safety;
- security;
- compliance;
- contract consistency;
- executable test evidence;
- explicit product/business requirements.

Aesthetic, speculative, or future-scale improvements are deferred.

## 8. Evidence Before Change

Before proposing a new architectural mechanism, prefer:

**Existing baseline → test → evidence → targeted revision**

over:

**Concern → redesign → redesign again**

This is especially important for Offline Safety, Sync, Authorization and Security.

## 9. Exit Means Exit

When R1 exit criteria are satisfied:

- unresolved P0 issues are closed or formally dispositioned;
- locked baselines are reconciled;
- Phase 3.4 is reviewed;
- Phase 3.5 starts;
- implementation proceeds from approved contracts.

R1 is not reopened for ordinary implementation questions.

Implementation defects are handled through normal engineering change control.

## 10. Current Position

Current sequence position:

**R1-A1:** policy/test artifacts complete, not locked  
**R1-A2:** taxonomy/state-machine/test artifacts complete, not locked  
**R1-A3:** next major authorization track  
**R1-B onward:** parallel tracks as scheduled  
**Phase 3.4:** PROPOSED  
**Phase 3.5:** BLOCKED

## 11. CTO Operating Rule

The governing question for every next change is:

> “What unresolved R1 exit criterion or verified defect requires this change?”

If the answer is none, the change should not be introduced into the architecture baseline.

This document is a governance guardrail, not a new product feature or architecture mechanism.
