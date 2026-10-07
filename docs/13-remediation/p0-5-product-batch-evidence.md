# P0-5 Product + Batch Foundation

**Status:** IMPLEMENTED — EXECUTION EVIDENCE PENDING
**Authority:** Domain Model v1.1 + Data Blueprint

Implemented the first master-data/inventory aggregate foundations for Product and Batch without introducing new business rules.

Product supports ACTIVE/ARCHIVED lifecycle and organization ownership.

Batch supports the approved lifecycle: RECEIPT → ACTIVE → NEAR_EXPIRY → EXPIRED/DEPLETED, with product, warehouse, expiry and quantity identity.

Reference tests cover product lifecycle, batch transitions, depletion guard and kernel primitive compatibility.

This is not production persistence evidence. Physical PostgreSQL/SQLite schemas, migrations and crash/recovery tests remain governed by P0-4.
