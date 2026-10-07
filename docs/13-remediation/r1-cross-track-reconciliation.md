# R1 Cross-Track Reconciliation — A3 / B / C / D / Phase 3.4

**Status:** ACTIVE RECONCILIATION — NOT READY FOR PROMOTION
**Owner:** CEO / CTO

## 1. CTO Decision

The cross-track architecture is consistent after reconciliation of the identified API/offline semantic defects. No architecture redesign is required.

Promotion remains blocked by executable evidence: R1-B security prototype; A3 executable authorization tests; A2 final reconciliation; R1-C external legal/activation gates where applicable; and final Phase 3.4 review.

## 2. Findings Closed

### F-X01 — Cash Session Open
Phase 3.4 previously described cash.sessions.open as unrestricted Offline: Yes, while A3 defines it as OFFLINE_RESTRICTED. Phase 3.4 has been reconciled to Restricted and requires approved local device/register trust and session policy.

### F-X02 — External Payment Verification
Phase 3.4 previously described payments.verify.external as Queueable offline, while A3 defines it as ONLINE_ONLY. Phase 3.4 now prohibits offline execution. Offline clients may use separately authorized evidence/intent capabilities, but cannot execute provider verification offline.

### F-X03 — Stock Adjustment Approval
Phase 3.4 previously described inventory.adjust.approve as policy-dependent offline. A3 defines it as ONLINE_ONLY. Phase 3.4 now declares ONLINE_ONLY.

### F-X04 — Stock Transfer Dispatch/Receive
Phase 3.4 previously omitted explicit offline classification. A3 defines both as OFFLINE_RESTRICTED where policy permits. Phase 3.4 now declares the Restricted class explicitly.

### F-X05 — Sync Transport vs Offline Capability
A3 lists sync.push and sync.pull as local system capabilities while the Phase 3.4 HTTP transport necessarily requires connectivity. The API baseline now explicitly distinguishes local synchronization capability from HTTP transport. Offline acceptance occurs through local transaction/Outbox state; HTTP push/pull require connectivity.

## 3. Binding Rule

Phase 3.4 must use the A3 capability vocabulary and offline classes. A mismatch is a reconciliation defect, not permission to introduce a second vocabulary.

## 4. Payment Rule

Payment Recording is distinct from Evidence, Manual Verification, External Verification and Settlement Proof. Bankak transfer may be recorded according to policy; screenshot evidence remains evidence; OCR is non-authoritative; manual verification has its own capability and audit; external verification is online/provider-mediated; Hisabati remains an adapter.

## 5. Security Rule

A3 local authorization snapshots depend on B security controls. Snapshot integrity, device binding, revocation containment, key-unavailability behavior and reinstall/re-provisioning remain unverified until B4 evidence exists. No API endpoint may weaken these controls.

## 6. Compliance Rule

Licensing, responsible pharmacist, controlled medicines, prescription records, expiry/quarantine, batch traceability, invoice/tax fields and regulatory export remain configurable product controls. Unverified schedules, statutory retention periods, cross-border hosting rules, e-invoice production protocol and regulated payment-intermediary obligations remain external/legal gates and must not be guessed into code.

## 7. Integration Rule

Provider adapters must keep credentials server-side, be idempotent, distinguish timeout/unknown from rejection, preserve external IDs separately, avoid direct mutation of private domain aggregates, never convert evidence into verification, and expose provider state transitions through auditable application/domain flows.

## 8. Promotion Gate

Phase 3.4 is NOT YET PROMOTED. It becomes eligible only after A3 executable tests, B4 P0 security evidence, A2 conflict reconciliation, correct representation of R1-C legal gates, and final endpoint/DTO/error consistency review.

## 9. Current Disposition

| Track | State |
|---|---|
| A3 Authorization | READY FOR LOCK — execution/security gate remains |
| B Security | NOT READY FOR LOCK — executable evidence missing |
| C Compliance | READY FOR RECONCILIATION — legal gates explicit |
| D Integration | READY FOR RECONCILIATION — external contracts pending |
| Phase 3.4 | RECONCILED FOR REVIEW — not promoted |
| R1 | NOT READY FOR CLOSURE |

## 10. Anti-Loop Rule

This reconciliation does not reopen locked Domain, Architecture, Phase 2, Phase 3.1 or Phase 3.3 baselines. Any future change must identify the specific unresolved R1 exit criterion or verified defect requiring it.

**Next:** complete A2 final reconciliation and execute B4 security evidence, then perform the formal Phase 3.4 promotion review.
