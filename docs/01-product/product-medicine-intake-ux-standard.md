# Product & Medicine Intake UX — Rapid Registration Standard

**Status:** ACCEPTED REQUIREMENT — IMPLEMENTATION DESIGN REQUIRED
**Owner:** CEO / CTO

## Objective

Medicine/product registration must be optimized for ordinary pharmacy users and high-volume onboarding. The system must minimize steps without weakening medicine identity, batch traceability, expiry safety, authorization, auditability or stock correctness.

## Core UX decision

The default workflow is **Progressive Disclosure + Quick Add**.

The user should not be forced through a long wizard for every product.

### Quick Add

Minimum first-pass fields:
- Product/medicine name
- Product type/category
- Unit
- Barcode/SKU when available
- Sale price
- Purchase price when relevant

The system supplies safe defaults and derives non-critical metadata where possible.

After save, the product is immediately usable subject to required validation. Advanced fields remain editable from the product profile.

## Fast capture modes

### 1. Barcode-first

Scan barcode → search existing product → if found, show compact confirmation → continue to batch/quantity when receiving stock.

If not found, open Quick Add with the barcode already populated.

### 2. Search-first

Type medicine name, generic name, barcode or SKU. Search should tolerate normal spelling variation and Arabic/English input where supported.

### 3. Bulk import

Support CSV/XLSX import for large catalogs with:
- downloadable template;
- column mapping;
- preview;
- validation report;
- duplicate detection;
- dry-run;
- import;
- error file/report;
- idempotent re-run semantics.

### 4. Batch receiving

Product creation and stock receiving are separate concepts.

For a new medicine during Goods Receipt, the user may create the missing product inline, then immediately continue receiving:
Product → Batch → Expiry → Quantity → Purchase cost.

The user should not lose the receiving workflow or re-enter already supplied data.

### 5. Repeated branch onboarding

Use reusable organization-level product master data and branch-specific operational configuration so the same medicine does not have to be manually recreated at every branch.

## Intelligent assistance

The UX may provide:
- barcode lookup;
- duplicate suggestions;
- existing-product suggestions;
- remembered user defaults;
- keyboard-first navigation;
- scanner-first workflows;
- inline validation;
- contextual autofill;
- bulk operations.

External medicine databases are optional adapters and are never treated as authoritative without explicit verification. Imported/external fields must retain provenance.

AI assistance, if introduced later, is assistive only. It cannot silently create authoritative medicine identity, regulatory status, batch, expiry, price or stock effects.

## Safety gates

Speed must not bypass:
- expired batch prohibition;
- FEFO;
- batch/expiry traceability;
- authorization;
- audit;
- duplicate-product detection;
- immutable stock ledger;
- required regulatory metadata where legally/configurably required.

Product master creation and batch/stock receipt remain distinct domain operations.

## Acceptance criteria

- Common single-product registration is completed through one compact screen.
- Barcode scan can start the workflow.
- New-product creation can occur inline from Goods Receipt.
- Bulk catalog onboarding supports preview and validation before commit.
- Duplicate detection is explicit.
- Advanced metadata does not block ordinary onboarding unless required by policy.
- No bulk import can silently create stock.
- Every committed product/batch mutation is authorized and audited.
- Branch onboarding reuses organization product master data.
