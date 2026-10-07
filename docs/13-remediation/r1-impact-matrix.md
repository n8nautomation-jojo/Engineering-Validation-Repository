# R1 — Impact Matrix

**Status:** ACTIVE REMEDIATION  
**Purpose:** Map assessment findings to PharmaTech baselines and required remediation.

| Finding | Severity | Validity | Primary Impact | Required Action | Baseline Change? |
|---|---|---|---|---|---|
| F-01 Offline Stock Safety | P0 | Valid | Phase 2.2, Phase 3.4, Sync | Define exact safety policy before MVP-1 | Not necessarily |
| F-02 SQLite/Data Protection | P0 | Valid | Phase 2.3, Security, Data | Produce local protection design | Possible ADR |
| F-03 Conflict Resolution | P0 | Valid | Phase 2.2, Sync, Inventory, Sales | Define resolution states and human workflow | Possible revision |
| F-04 Sudan Compliance | P0 | Valid gap | Domain, API, Audit, Reporting | Regulatory assessment before hard-coding rules | Possible |
| F-05 Phase 2↔3 consistency | P0 | Valid governance issue | API + locked baselines | Reconcile contract language/status | No automatic reopening |
| F-06 Authorization | P0 | Valid | Security + Phase 3.4 | Separate capability/policy/scope/SoD | Possible revision |
| F-07 Offline Eligibility | P0 | Valid | Phase 3.4 | Controlled offline contract vocabulary | No |
| F-08 Evidence Upload | P0 | Valid | Payment + Security + API | Define secure evidence lifecycle | Possible ADR |
| F-09 Hisabati | P1 | Valid dependency | Payment integration | Discover real provider contract | No |
| F-10 Refund | P0 | Valid | Sales/Payment/Accounting/API | Separate return from refund | Possible domain/API revision |
| F-11 Training/Adoption | P1 | Valid product gap | Product/Ops | Add readiness track | No |
| F-12 Business Model | P1 | Valid business gap | Product/Commercial | Separate commercial track | No |

## Assessment Corrections

The assessment is not treated as a source of truth by itself.

Specific corrections:
1. Phase 3.2 exists in the repository and contains an explicit review gate.
2. The main governance inconsistency is that D-021 is marked LOCKED while the Phase 3.2 source document is still Proposed.
3. Phase 3.4 should not be locked merely to resolve ordering concerns. It should be promoted only after substantive reconciliation.
4. The reported count of documentation stubs must be treated as approximate; repository verification is authoritative.
5. Hisabati architecture is already provider-agnostic through ADR-012; the missing item is validated external integration detail, not a replacement payment architecture.
6. Regulatory claims must be independently validated before becoming domain rules.

## Gate Interpretation

P0 means “must be resolved or explicitly dispositioned before the dependent production design gate.” It does not mean every P0 must be implemented immediately.
