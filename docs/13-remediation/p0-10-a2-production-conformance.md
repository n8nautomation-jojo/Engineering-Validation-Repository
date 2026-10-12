# P0-10 — R1-A2 Production Conformance

**Status:** DURABLE PERSISTENCE & TRANSACTIONAL UNIT-OF-WORK IMPLEMENTED — RUNTIME TESTS PASSING

Implemented:
- explicit conflict lifecycle;
- immutable original effect references;
- explicit resulting compensation/effect references;
- containment state;
- transition guards;
- stable conflict vocabulary aligned to A2 reconciliation;
- authorization-integrated resolution service using the existing stable `sync.conflict.resolve` capability;
- effective scope and existing P0-3 SoD enforcement;
- conflict-store contract with a restart-safe persistence boundary;
- production SQLite durable adapter (`SqliteConflictStore`) and unit-of-work (`SqliteConflictResolutionUnitOfWork`);
- production PostgreSQL durable adapter (`PostgresConflictStore`) and unit-of-work (`PostgresConflictResolutionUnitOfWork`);
- idempotent resolution orchestration with replay detection coupled to command transactions (`idempotency_records`);
- transactional resolution orchestration coupling conflict mutation, audit persistence (`audit_records`), and idempotency into single atomic boundary;
- shared persistence contract (`ConflictResolutionPersistence`) as the canonical A2 persistence boundary;
- schema alignment in `001_p0_4_foundation.sql` for SQLite and PostgreSQL (nullable `resolution_class` for unresolved conflicts).

Reference and Durable tests cover:
- lifecycle and containment;
- invalid transition rejection;
- stable capability enforcement;
- authorized human resolution;
- independent-approval/self-approval denial;
- authorized containment;
- idempotent resolution replay;
- transactional commit and rollback behavior;
- audit coupling to conflict resolution;
- authorization denial with zero persistence effect;
- durable disk persistence across process restart and connection cycles (`tests/p0-10-a2-sqlite-durable.test.mjs`);
- PostgreSQL transactional rollback and contract parity (`tests/p0-10-a2-postgres-durable.test.mjs`).

Boundary status:
The conflict persistence layer and Unit-of-Work now have concrete production database implementations for both SQLite and PostgreSQL. The application-level transactional resolution is verified against real disk files and rollback triggers.

Still required for full system-level lock:
- multi-device transport synchronization;
- stock/allocation/payment conflict integration in active sync flow;
- observed CI execution on production target matrix;
- A3/B dependency runtime evidence.

**A2 status: DURABLE RUNTIME PASS — READY FOR INTEGRATION LOCK.**

