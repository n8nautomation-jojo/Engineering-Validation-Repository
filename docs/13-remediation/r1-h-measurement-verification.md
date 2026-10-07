# R1-H — Measurement, Verification & Evidence Framework

**Status:** ACTIVE REMEDIATION WORK PACKAGE — PROPOSED / NOT LOCKED  
**Track:** R1-H Measurement & Verification
**Purpose:** Convert R1 decisions into measurable acceptance evidence and prevent readiness from being declared by documentation alone.

## 1. Executive Decision

R1 readiness is an evidence-based gate.

A document being complete is not equivalent to a control being verified. Every P0 control must have an owner, measurable acceptance condition, evidence source, test or inspection method, and disposition.

Evidence classes:
- DESIGN: policy, state model, contract, ADR.
- STATIC: repository/document consistency inspection.
- AUTOMATED: repeatable automated test result.
- DYNAMIC: executed integration, security, recovery, or performance test.
- OPERATIONAL: runtime telemetry, alert, incident, or recovery evidence.
- EXTERNAL: regulator/provider/legal evidence.

## 2. Measurement Principles

1. Measure business invariants, not only HTTP status codes.
2. Prefer deterministic pass/fail criteria for P0 controls.
3. Never convert an untested P0 assumption into PASS.
4. Evidence must identify build/commit, environment, date, test ID, and reviewer where applicable.
5. A metric without a threshold is observation, not a gate.
6. A threshold without evidence is a target, not a result.
7. Security metrics must distinguish prevention, detection, containment, and recovery.
8. Offline metrics must include restart, power-loss, duplicate, ordering, and synchronization scenarios.
9. Financial metrics must distinguish business acceptance from provider confirmation.
10. No aggregate percentage may hide a failed P0 invariant.

## 3. R1 P0 Verification Matrix

| Control | Acceptance Condition | Evidence | Gate |
|---|---|---|---|
| Offline stock safety | No accepted offline sale exceeds active allocation policy | A1 tests + transaction evidence | P0 |
| Inventory truth | No duplicate or silent inventory mutation after sync/recovery | A1/A2 tests + reconciliation evidence | P0 |
| Conflict handling | Every classified conflict has durable state and audit trail | A2 tests | P0 |
| Authorization | Unauthorized capability/scope/offline operation is rejected | A3 tests | P0 |
| SoD | Protected actions enforce configured approval separation | A3 tests | P0 |
| Local data protection | P0 attacker classes tested and residual boundary documented | B4 security tests | P0 |
| Device revocation | Revoked device cannot continue protected offline operation beyond approved containment window | B4 + auth tests | P0 |
| Payment evidence | Evidence cannot itself create provider verification | ADR-012 + API tests | P0 |
| Financial immutability | Sale/payment/journal effects use reversal/compensation, not destructive deletion | domain/API tests | P0 |
| Tenant isolation | Cross-tenant access is rejected | security integration tests | P0 |
| Auditability | Sensitive actions produce actor/device/time/provenance and required before/after data | audit tests | P0 |
| Compliance controls | MVP-relevant regulatory controls are represented without guessed legal rules | R1-C evidence + static inspection | P0 |
| API consistency | Locked API conventions and R1 policy vocabulary agree | contract reconciliation | P0 |
| Integration safety | External provider retries are idempotent and ambiguous outcomes are reconciled | integration tests | P0 |

## 4. Product and Runtime SLO/SLI Baseline

These are engineering targets unless a later approved baseline supersedes them.

| Metric | Target | Measurement |
|---|---|---|
| Local POS operation latency | P95 < 200 ms for local business operations, excluding printer/cloud/reporting latency | local performance test |
| Cloud API availability | 99.9% | service monitoring |
| Accepted local transaction durability | 100% | crash/power-loss test |
| Duplicate business effects | 0 | idempotency/recovery tests + telemetry |
| Silent inventory corruption | 0 | reconciliation tests + production telemetry |
| Silent financial duplication | 0 | accounting/payment reconciliation |
| Unauthorized protected operations accepted | 0 | security test suite + audit review |
| Undetected security-critical audit gaps | 0 at release gate | audit completeness tests |
| Unclassified P0 sync conflicts | 0 before R1 closure | conflict register |

## 5. Offline/Sync Measurements

Required measurements include:
- accepted local transactions before and after restart;
- power-loss recovery success rate;
- duplicate push attempts handled without duplicate business effects;
- out-of-order event handling;
- stale allocation detection;
- allocation exhaustion blocking;
- conflict classification completeness;
- conflict resolution latency;
- unresolved conflict count by severity;
- Outbox retry count and DLQ count;
- Inbox duplicate suppression;
- synchronization lag;
- cloud revalidation failures;
- device revocation containment.

Required P0 release conditions:
- zero silent duplicate business effects;
- zero silent inventory corruption;
- zero accepted offline transactions outside policy envelope;
- zero unclassified P0 conflicts;
- all recovery scenarios have deterministic disposition.

## 6. Security Measurements

Security verification must report separately for attacker classes A0 through A4 defined by R1-B.4.

Minimum evidence:
- database confidentiality result;
- database tamper-detection result;
- auth snapshot forgery result;
- device identity cloning result;
- revoked-device result;
- key-unavailable result;
- corruption recovery result;
- power-loss result;
- payment-evidence integrity result;
- OS reinstall/re-provisioning result;
- device replacement result;
- local-admin boundary result;
- fully-compromised-endpoint boundary result;
- performance overhead result.

Important: A PASS against A0 does not imply a PASS against A2 or A4. The report must state exactly which attacker class each control covers.

## 7. Authorization Measurements

Measure:
- protected commands accepted with valid capability and scope;
- commands rejected for missing capability;
- commands rejected for wrong scope;
- offline-restricted commands rejected when offline;
- online-only commands rejected while disconnected;
- revoked device/user containment;
- self-approval attempts;
- SoD violations;
- audit completeness of sensitive authorization decisions.

Gate: zero unauthorized protected operations accepted in the release candidate.

## 8. Payment & Integration Measurements

Measure separately:
- evidence captured;
- evidence submitted;
- provider verification requested;
- provider verification succeeded;
- provider verification rejected;
- ambiguous provider outcomes;
- reconciliation completed;
- duplicate external requests suppressed;
- provider timeout/retry behavior;
- webhook duplicate suppression where applicable.

Never report evidence-submission success as payment-settlement success.

## 9. Compliance Evidence

R1-C evidence must be traceable from source → requirement → product control → implementation contract → test/evidence.

Current legal gates remain explicitly unresolved until verified:
- exact controlled/narcotic schedules and dispensing limits;
- exact statutory retention periods by record class;
- exact cross-border/cloud hosting restrictions;
- exact E-Invoice production API/certification/onboarding;
- obligations if PharmaTech becomes a regulated payment intermediary;
- prescription/patient-data requirements beyond currently evidenced requirements;
- territorial/state licensing differences.

These are activation/configuration/legal gates, not permission to invent rules.

## 10. Evidence Record Standard

Every executed P0 verification record should contain:
- evidence ID;
- requirement/control ID;
- test ID where applicable;
- repository commit/build version;
- environment and device profile;
- date/time;
- actor/reviewer;
- preconditions;
- steps or method;
- expected result;
- actual result;
- PASS / FAIL / CONDITIONAL PASS / NOT TESTED;
- attached logs/screenshots/reports where appropriate;
- residual risk;
- follow-up action and owner.

## 11. Defect Severity

**P0:** safety, security, financial integrity, tenant isolation, regulatory activation blocker, or invariant violation.
**P1:** material reliability, operability, usability, integration, or readiness defect without immediate invariant violation.
**P2:** non-blocking quality or enhancement issue.

P0 defects cannot be hidden by aggregate test pass percentages.

## 12. Readiness Scorecard

R1 scorecard must report at least:
- P0 controls PASS;
- P0 controls FAIL;
- P0 controls CONDITIONAL;
- P0 controls NOT TESTED;
- open P0 findings;
- open P1 findings;
- external evidence pending;
- locked-baseline consistency;
- Phase 3.4 reconciliation status;
- Phase 3.5 gate status.

Decision rules:
- Any unaccepted P0 FAIL blocks closure.
- Any P0 NOT TESTED blocks closure unless the Decision Log records an explicit approved exception with owner, rationale, containment, and target.
- CONDITIONAL PASS requires documented residual risk and acceptance authority.
- A high aggregate percentage cannot override a failed P0 invariant.

## 13. Evidence Retention and Provenance

Engineering evidence must be retained according to the project evidence policy and applicable legal requirements.

Minimum provenance is immutable reference to the requirement, test, build/commit, environment, result, and reviewer.

Financial, prescription, payment, regulatory, and audit evidence follows the stricter applicable retention and access policy.

## 14. R1-H Exit Criteria

R1-H can move to reconciliation when:
1. Every R1 P0 control has an acceptance condition.
2. Every P0 control has a defined evidence class and verification method.
3. Security attacker classes A0–A4 are explicitly measured.
4. Offline, authorization, payment, integration, and compliance measurements are defined.
5. Readiness scorecard rules prevent aggregate metrics from hiding P0 failures.
6. Evidence provenance and retention are defined.
7. R1 exit criteria can consume this framework without contradictory thresholds.

## 15. Governance

Status: PROPOSED / NOT LOCKED.

Promotion requires reconciliation with R1-A1/A2/A3, R1-B security, R1-C compliance, R1-D integrations, R1 exit criteria, Development/Test Strategy, and the Implementation Readiness Gate.

No architecture change is authorized by this document.