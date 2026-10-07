# Decision Log

| ID | Decision | Status |
|---|---|---|
| D-001 | Modular Monolith | LOCKED |
| D-002 | Offline-First + Cloud-Synchronized | LOCKED |
| D-003 | Tenant-Ready now; Multi-Tenant Active later | LOCKED |
| D-004 | PostgreSQL cloud + SQLite local POS | LOCKED |
| D-005 | Event/transaction-based synchronization | LOCKED |
| D-006 | Outbox Pattern mandatory for syncable domain events | LOCKED |
| D-007 | Immutable inventory ledger is stock truth | LOCKED |
| D-008 | FEFO mandatory | LOCKED |
| D-009 | Financial records immutable; reversal instead of deletion | LOCKED |
| D-010 | Accounting independent and cloud-authoritative | LOCKED |
| D-011 | Tauri desktop POS provisional pending hardware validation | APPROVED |
| D-012 | Branch Local Server deferred/optional | LOCKED |
| D-013 | MVP-0 online-only; offline POS/sync in MVP-1 | LOCKED |
| D-014 | Phase 2 executed in staged subphases | APPROVED |
| D-015 | Sale/Inventory/Offline consistency: local atomic coordination + Offline Stock Safety Policy (ADR-011) | LOCKED |
| D-016 | Phase 2.2: in-process events, transactional Outbox, idempotent Inbox, REST Push/Pull and explicit conflict handling | LOCKED |
| D-017 | Phase 2.3: durable restart-safe workers, explicit transaction boundaries, controlled offline authentication and versioned offline authorization snapshots | LOCKED |
| D-018 | Phase 2.4: failure/recovery contracts, observability baseline, integrity invariants and initial SLO targets | LOCKED |
| D-019 | Provider-agnostic payments with explicit verification modes, optional evidence and external verification adapters (ADR-012) | LOCKED |
| D-020 | Phase 3.1 contract-first REST v1, explicit error envelope, idempotent mutations, cursor pagination, optimistic concurrency and provider-neutral integration boundaries | LOCKED |
| D-021 | Phase 3.2 command/query baseline is the binding API command/query contract; supporting catalog remains descriptive unless explicitly promoted | LOCKED |
| D-022 | Phase 3.3 DTO conventions, stable error taxonomy, HTTP status matrix, idempotency/concurrency semantics and OpenAPI conventions | LOCKED |
| D-023 | Phase 3.4 endpoint-level contracts, authorization matrix and OpenAPI contract skeleton | SUPERSEDED / PROMOTED BY D-032 |
| D-024 | Architecture & Security Remediation Track R1 gates Phase 3.5 and reconciles unresolved P0 architecture/security/compliance/API issues | ACTIVE |
| D-025 | R1-C establishes evidence-based Sudan compliance controls and explicit legal gates; implementation defaults are ready for reconciliation, while unresolved legal gates remain non-architectural activation/configuration gates | READY FOR RECONCILIATION |
| D-026 | R1-G governance reconciliation: source-document status is authoritative only when matched by the Decision Log; Phase 3.2 and Phase 3.3 are LOCKED, Phase 3.4 status is governed by D-032, and supporting drafts do not authorize implementation | LOCKED |
| D-027 | R1 Final Reconciliation: R1 is NOT READY FOR CLOSURE; remaining blockers are executable security verification, authorization/conflict evidence, legal gates and implementation-readiness evidence; Phase 3.4 is promoted but R1 remains independently blocking implementation readiness | ACTIVE |
| D-028 | R1-A3 Authorization Final Reconciliation: authorization architecture accepted; capability/scope/offline/SoD rules and MVP offline eligibility matrix are finalized; A3 is READY FOR LOCK pending R1-B security evidence, executable authorization tests and Phase 3.4 reconciliation | READY FOR LOCK |
| D-030 | R1-A2 Final Reconciliation: conflict lifecycle, resolution classes, authority, compensation, containment, payment/inventory/accounting boundaries and capability mapping reconciled with A3 and Phase 3.4 | READY FOR LOCK — EXECUTION GATE REMAINS |
| D-032 | Phase 3.4 Endpoint Contracts promoted after formal gate review and closure of P3.4-01/P3.4-02/P3.4-03; no architecture redesign required | LOCKED / PROMOTED |
| D-033 | Phase 3.5 started: machine-readable OpenAPI and contract fixtures are derived from promoted Phase 3.4; no new business rules, permissions, offline classes or provider-specific core behavior may be introduced | ACTIVE |
| D-034 | R1-A1 Final Reconciliation: Controlled Offline Safety Allocation accepted as the MVP-1 execution direction; no second inventory ledger, no optimistic fallback, device-scoped capacity, and A1 remains unlocked pending P0 execution evidence and A2/A3/B dependencies | READY FOR EXECUTION VALIDATION |
| D-035 | R1 Unified Conformance Gate established as an evidence aggregation control; it does not change locked baselines or promote unobserved evidence | ACTIVE |
| D-036 | P0 Implementation Execution Map establishes the controlled implementation order from runtime foundation through the first production vertical slice; it does not change locked business, domain, architecture, API, authorization or offline rules | ACTIVE |

| D-037 | P0-3 Authorization Runtime Foundation implemented as a controlled runtime layer derived from the stable Phase 3.4 capability vocabulary and R1-A3 scope/offline/SoD rules; implementation does not promote A3 or close R1 because production persistence, device trust and security execution evidence remain open | ACTIVE |
| D-038 | Platform Administration & Secure Tenant Onboarding: Platform Owner console provisions tenants/organizations/admins, manages subscriptions and minimum-necessary operational telemetry; no public tenant signup; first admin uses temporary credential and mandatory password change before normal access; privileged actions audited; customer-content access is not part of ordinary administration | ACCEPTED REQUIREMENT — RECONCILIATION REQUIRED |
| D-039 | Rapid Product/Medicine Intake UX: progressive disclosure, barcode-first quick add, inline product creation during goods receipt, bulk CSV/XLSX import with preview/validation/idempotent processing, reusable organization product master; safety/audit/domain invariants remain mandatory | ACCEPTED REQUIREMENT — IMPLEMENTATION DESIGN |

| D-040 | Product Intake and Platform Administration reconciliation artifacts establish implementation-ready proposed contracts without changing locked Phase 3.4 capability vocabulary; new product/platform capabilities remain gated for explicit authorization/API promotion | ACTIVE — RECONCILIATION GATE |
| D-041 | Platform Provisioning Contract defines atomic Tenant → Organization → Branch → Initial Admin onboarding, temporary-credential boundary, PASSWORD_CHANGE_REQUIRED lifecycle, idempotent replay, mandatory audit and explicit no-stock/no-pharmacy-transaction side effects; does not promote new platform capabilities | ACTIVE — RECONCILIATION GATE |
