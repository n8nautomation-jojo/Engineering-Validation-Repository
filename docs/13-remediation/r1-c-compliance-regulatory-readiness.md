# R1-C — Compliance & Regulatory Readiness

**Status:** ACTIVE COMPLIANCE WORK PACKAGE — PROPOSED / NOT LOCKED  
**Track:** R1-C  
**Purpose:** Establish evidence-based Sudan compliance requirements that materially affect PharmaTech product behavior, records, security, payments, and operations without hard-coding unverified legal assumptions.

> This is an engineering compliance baseline candidate, not legal advice and not a declaration that PharmaTech is itself a licensed financial institution, pharmacy, or pharmaceutical regulator.

## 1. Scope

R1-C covers requirements relevant to a Sudan-first pharmacy ERP/SaaS platform:

- pharmacy and pharmaceutical-product regulatory traceability;
- pharmacy/branch licensing context;
- medicine, batch, expiry, storage and controlled-substance records;
- electronic records and transaction evidence;
- tax/invoicing readiness;
- electronic-payment boundaries;
- security, confidentiality and auditability;
- retention/retrievability requirements;
- integration and data-sharing boundaries;
- compliance ownership and evidence.

R1-C does not replace legal counsel or issue a definitive legal interpretation where the authoritative rule, current circular, licence condition, or implementing regulation has not been verified.

## 2. Evidence Reviewed

### 2.1 National Medicines and Poisons Board (NMPB)

The NMPB states that the Medicines and Poisons Act 2009 is the operative law and describes the Board as the national authority responsible for standards and controls covering import, manufacture, regulation, storage, pricing, transportation and use of medicines, pharmaceutical preparations, cosmetics and medical supplies.

The NMPB publishes regulations including:
- Regulation for inspection and control of pharmaceutical establishments, 2017;
- Regulation for registration of pharmaceutical preparations, medical supplies and cosmetics, 2017;
- Narcotic medicines regulation, 2022;
- licensing services for public pharmacies and other pharmaceutical establishments.

**Engineering consequence:** regulatory product identity, batch, expiry, establishment/branch licensing context, and auditable stock records are compliance-sensitive data.

### 2.2 Electronic Transactions

The Electronic Transactions Act 2007, as published by the Central Bank of Sudan and Sudan Electronic Certification Authority, recognizes electronic records and establishes requirements concerning legal effect, accessibility/retrievability, integrity and confidentiality. The official SCA regulations page identifies the 2007 Act as amended in 2015.

**Engineering consequence:** records that may be needed as electronic evidence must remain attributable, retrievable, integrity-protected and auditable. Destructive deletion of financial/evidence records is therefore prohibited by the product architecture.

### 2.3 Electronic Payments

Central Bank of Sudan materials confirm that electronic-payment systems and mobile-payment services are regulated activities and that operating/providing payment-system services requires applicable authorization. Recent 2026 Central Bank material also emphasizes regulatory approval and controls around payment-system connectivity and data exchange.

**Engineering consequence:** PharmaTech is an ERP/merchant-side platform unless and until it separately obtains an applicable financial/payment licence. Core payment functionality must record and reconcile payment events without representing PharmaTech as the settlement provider.

### 2.4 Tax / Electronic Invoicing

The Sudan Tax Administration publicly announced the resumption of the electronic-invoice system on 4 May 2026 and states that it operates under applicable tax laws and regulations.

**Engineering consequence:** invoice architecture must support electronic-invoice integration/configuration without assuming an unverified final API, schema, tax rate, or certification process.

## 3. Compliance Requirements Converted to Product Controls

| ID | Requirement | Product control | Priority | Verification |
|---|---|---|---|---|
| RC-01 | Pharmaceutical establishments are regulated/licensed | Organization/Branch licensing metadata and status must be representable | P0 | Legal/product review |
| RC-02 | Medicine records require regulatory traceability | Product, MedicineProfile, manufacturer, batch, expiry and movement provenance | P0 | Domain + compliance tests |
| RC-03 | Stock records must be auditable | Immutable inventory movement/transaction history; adjustment reason and actor | P0 | Existing domain/R1 tests |
| RC-04 | Electronic records must remain retrievable | Durable records, audit trail, export/retrieval capability | P0 | Data/recovery test |
| RC-05 | Electronic records need integrity/provenance | Audit metadata, immutable financial lifecycle, authenticated local critical state | P0 | R1-B/H evidence |
| RC-06 | Sensitive information must be protected | RBAC/capability + scope + encryption/protection controls | P0 | R1-A3/B tests |
| RC-07 | Payment-system operation is regulated | Provider-agnostic payment recording; no assumption of settlement-provider status | P0 | Architecture review |
| RC-08 | Payment evidence must be attributable | Evidence source, submitter, timestamps, verification state, audit trail | P0 | Payment contract tests |
| RC-09 | Tax/e-invoice requirements may apply | Tax Engine + invoice extensibility + external integration boundary | P0 | Tax/legal confirmation |
| RC-10 | Regulatory rules may change | Configurable policy/rules; no hard-coded legal constants | P1 | Change-control review |
| RC-11 | Controlled/narcotic medicines require special treatment | Product regulatory classification and policy hooks; no unrestricted generic sale path | P0 | Legal/pharmacy SME review |
| RC-12 | Regulatory inspection may require records | Searchable/exportable compliance records and audit evidence | P1 | Operational test |
| RC-13 | Payment integrations may require regulator/provider approval | Integration onboarding gate and provider status metadata | P1 | Legal/provider confirmation |
| RC-14 | Cross-system data sharing must be controlled | Explicit integration contracts, minimum necessary data, audit and credentials isolation | P0 | Security/integration review |

## 4. Regulatory-Sensitive Domain Data

### Product
- regulatory/registration identifiers where applicable;
- product name and generic name;
- dosage/form/strength;
- manufacturer;
- category/classification;
- controlled/narcotic classification where applicable;
- active/inactive regulatory status.

### Batch
- batch number;
- manufacture/expiry dates;
- receipt provenance;
- supplier/source;
- quantities and movements;
- quarantine/recall status where later enabled.

### Pharmacy / Branch
- legal entity reference;
- establishment/pharmacy licence metadata;
- branch status;
- responsible pharmacist information where legally required;
- licensing dates/status where applicable.

### Transactions
- sale;
- return/reversal;
- goods receipt;
- stock adjustment;
- stock transfer;
- payment;
- payment evidence;
- user/device;
- timestamps;
- audit provenance.

## 5. Controlled Medicines / Special Regulatory Classes

The architecture must support regulatory classes without pretending that one universal rule applies to every medicine.

The product therefore requires:
1. a regulatory classification field/model for products;
2. configurable policy evaluation;
3. configurable dispensing/sale restrictions;
4. enhanced auditability for restricted classes;
5. prohibition of silent deletion;
6. configurable reporting/export;
7. ability to introduce additional approval or prescription requirements without changing core inventory truth.

**Important:** exact Sudanese controlled-medicine workflows, schedules, record-retention periods, prescription requirements and reporting formats must be confirmed against the applicable current law/regulation and pharmacy/legal SME before implementation.

The NMPB currently publishes a narcotic medicines regulation dated 2022, so this is a real compliance domain and must not be left as a generic future placeholder.

## 6. Electronic Records and Evidence

PharmaTech shall preserve sufficient provenance to answer:
- Who created the record?
- Which organization/branch/device created it?
- What happened?
- When did it happen?
- What was the previous state?
- What is the resulting state?
- Why was a sensitive change made?
- Which evidence was supplied?
- Who reviewed/verified the evidence?
- Which external provider, if any, was involved?

For payment evidence:

**Evidence ≠ Verification ≠ Settlement**

A screenshot, OCR extraction, manual confirmation, API verification and provider confirmation remain distinct states.

This preserves ADR-012 and must not be collapsed for convenience.

## 7. Electronic Invoice / Tax Readiness

The product must support:
- tax configuration by Organization;
- tax rules and effective periods;
- invoice tax breakdown;
- taxable/non-taxable classification;
- tax-inclusive and tax-exclusive pricing where configured;
- invoice numbering and lifecycle;
- immutable invoice history;
- credit/return/reversal relationships;
- export/integration boundary for tax systems;
- future electronic-invoice submission/status tracking.

The implementation must **not** hard-code a national tax percentage, electronic-invoice API, payload schema, certificate mechanism, or submission workflow until verified against current Sudan Tax Administration requirements.

The Tax Administration's 2026 public announcement confirms that electronic invoicing resumed; this makes e-invoice readiness a P0 product/data requirement rather than an optional architectural idea.

## 8. Payment Regulatory Boundary

PharmaTech may:
- record cash payments;
- record bank/mobile-money transfer claims;
- attach evidence;
- request or consume verification;
- store provider references;
- reconcile received information;
- integrate with licensed/authorized providers where permitted.

PharmaTech must not implicitly:
- issue electronic money;
- operate a payment system as a regulated service;
- represent an unverified transfer as provider-settled;
- expose provider credentials to POS clients;
- claim regulator/provider authorization without evidence.

Any direct payment-system integration must pass:
1. provider technical approval;
2. applicable Central Bank/regulatory review;
3. contractual approval;
4. security review;
5. data-sharing review;
6. operational certification where required.

The current architecture therefore remains provider-agnostic.

## 9. Hisabati Integration Compliance Boundary

Hisabati is an external verification/revenue system in the current product concept.

Until a real contract/API specification is obtained and reviewed:
- no API endpoint is invented;
- no authentication scheme is assumed;
- no regulator/provider authorization is assumed;
- no settlement status is inferred from an API key alone;
- no screenshot/OCR output is treated as automatic proof.

The eventual adapter must isolate:

**PharmaTech Payment Core → Provider Adapter → Hisabati**

and retain an internal verification state independent of provider-specific response semantics.

## 10. Data Retention

The architecture already proposes long-lived auditability for financial and operational records.

R1-C does **not** lock a universal legal retention period because different records may be subject to different laws, regulations, tax requirements, licence conditions or contractual requirements.

Instead:
- retention policy is configurable by record class;
- legal minimums, once verified, become policy constraints;
- financial records cannot be destroyed merely because application retention expires;
- audit records are append-only;
- evidence retention must consider storage cost, privacy, security and legal requirements;
- retention and deletion decisions must themselves be auditable.

A proposed 7-year audit retention may remain an engineering proposal, but must not be represented as a verified Sudan legal requirement without legal evidence.

## 11. Compliance Responsibilities

### Platform Owner
Responsible for platform-level compliance controls, security baseline, provider/integration governance, and evidence of platform operation.

### Tenant / Organization
Responsible for legal operation of the pharmacy/business, licensing information, regulatory configuration, authorized users, and correctness of business records.

### Branch Manager / Responsible Pharmacist
Responsible for branch operational compliance, controlled inventory workflows, staff permissions, and exception review.

### Users
Responsible for truthful transaction entry, evidence submission, and respecting authorization and approval workflows.

The software must not falsely imply that technical controls transfer legal responsibility from the licensed pharmacy/operator to PharmaTech.

## 12. Compliance Evidence Register

Before declaring R1-C complete, the project must maintain evidence for:
- current NMPB laws/regulations applicable to pharmacy operations;
- pharmacy establishment licensing requirements;
- controlled/narcotic medicine requirements;
- current tax/e-invoice requirements;
- electronic transaction requirements;
- payment-system boundaries;
- data/security obligations applicable to the actual deployment model;
- any contractual requirements from integrated payment/revenue providers.

Each evidence item must record:

Requirement ID → Source → Publication/Effective Date → Applicability → Product Impact → Owner → Verification Date → Review Date

## 13. P0 Open Compliance Questions

1. What exact pharmacy licence data must the ERP store/display/export?
2. What exact controlled/narcotic medicine schedules and dispensing records apply to a retail pharmacy?
3. What exact retention periods apply to pharmacy, medicine, inventory, sales, prescription, payment and tax records?
4. What current electronic-invoice API/schema/certification does Sudan Tax Administration require for the target customer segment?
5. Does the target PharmaTech deployment require any direct approval/licence because of its payment integration model?
6. What data may be hosted outside Sudan, if cloud hosting is outside the country?
7. What data residency or cross-border transfer restrictions apply to customer/patient/payment evidence?
8. What current requirements apply to prescription/patient records in the target operating context?
9. What inspection/export/report formats must a licensed pharmacy be able to produce?
10. What legal/contractual obligations apply when integrating with Hisabati or any payment provider?

No question above should be resolved by architectural guesswork.

## 14. Compliance Decision Rules

### Rule C-01 — Evidence Before Lock
A regulatory claim is not LOCKED until supported by an authoritative source or qualified local legal/compliance review.

### Rule C-02 — Configurable Where Regulation Changes
Rates, classifications, effective dates, reporting rules and policy thresholds must be configurable where legally appropriate.

### Rule C-03 — No Destructive Compliance Loss
Compliance-sensitive records must not be hard-deleted when doing so would destroy required provenance.

### Rule C-04 — Provider Status Is Explicit
A provider's API response, screenshot or OCR result cannot silently become a legally/financially verified settlement state.

### Rule C-05 — Licensing Is Tenant/Organization Context
A platform tenant's licence status must not be inferred from platform subscription status.

### Rule C-06 — Regulatory Integrations Are Gated
Government/payment integrations require explicit technical, legal and contractual readiness before activation.

## 15. R1-C Exit Criteria

R1-C can move from PROPOSED to READY FOR RECONCILIATION only when:
- [ ] NMPB applicable pharmacy/medicine requirements have been reviewed;
- [ ] controlled/narcotic medicine requirements are explicitly bounded;
- [ ] tax/e-invoice requirements are verified sufficiently for MVP implementation;
- [ ] electronic-record requirements are mapped to existing audit/data controls;
- [ ] payment regulatory boundary is confirmed;
- [ ] data residency/cross-border requirements are resolved or explicitly gated;
- [ ] retention requirements are verified or clearly marked as legal-review gates;
- [ ] compliance-sensitive product fields are mapped to Product/Batch/Branch/Transaction models;
- [ ] no unresolved P0 compliance ambiguity silently affects implementation;
- [ ] evidence register is complete enough for implementation;
- [ ] R1-C outputs are reconciled with Domain, Architecture, API, Security and Product baselines.

### Locking rule

R1-C must **not** be marked LOCKED merely because the engineering team has documented assumptions.

It becomes LOCKED only after the required authoritative/legal evidence has been obtained and the resulting engineering controls have been reconciled.

## 16. Current Assessment

**R1-C status: ACTIVE / PROPOSED / NOT LOCKED**

### Findings
- Pharmaceutical regulatory authority and licensing requirements are confirmed as relevant.
- Electronic-record/electronic-transaction requirements are confirmed as relevant.
- Electronic-payment regulation is confirmed as relevant.
- Electronic invoicing is confirmed as an active 2026 requirement area.
- The existing architecture already contains strong controls for immutability, auditability, payment verification separation and provider-agnostic integration.
- The remaining P0 risk is primarily **evidence completeness and applicability**, not architectural redesign.

### No Architecture Reopen

Nothing discovered in this pass requires reopening a LOCKED Domain, Architecture, Phase 2 or Phase 3.3 baseline.

The correct next action is evidence completion and targeted reconciliation.

## 17. Authoritative Sources Reviewed

- National Medicines and Poisons Board — laws, regulations, licensing and pharmacy services.
- Central Bank of Sudan — Electronic Transactions Act materials.
- Sudan Electronic Certification Authority — electronic transactions/certification legislation and regulations.
- Central Bank of Sudan — electronic payment system regulations and 2026 payment-system notices.
- Sudan Tax Administration — 2026 electronic invoicing announcement.

Review dates should be refreshed before production launch because Sudanese regulatory requirements and implementation notices can change.


---

## 18. CEO/CTO Applicability Decisions — 2026 Baseline

The following are the project's selected implementation defaults. They are engineering decisions based on currently available official evidence; they are not claims that every item is a statutory requirement.

| Area | Selected default | Rationale | Status |
|---|---|---|---|
| Pharmacy licensing | Store licence number/type/status/issue/expiry/authority at Organization/Branch level | NMPB licensing is establishment-specific and includes public pharmacies and other establishments | ADOPT |
| Responsible pharmacist | Store responsible pharmacist reference and validity where applicable | Pharmacy licensing evidence identifies responsible operational accountability | ADOPT |
| Prescription records | Support a controlled prescription register and link dispensing to Prescription/PatientProfile | NMPB licensing evidence explicitly requires records for specially controlled prescriptions to be available for inspection | ADOPT |
| Controlled medicines | Product regulatory class + restricted-sale policy + enhanced audit + prescription/approval hook | NMPB publishes a 2022 narcotic medicines regulation; exact schedules/workflow remain legally verified before activation | ADOPT / LEGAL GATE |
| Expired medicines | Separate EXPIRED/QUARANTINED stock state; prohibit sale; preserve disposal/return history | NMPB pharmacy licensing evidence requires expired medicines to be separated pending destruction | ADOPT |
| Storage compliance | Store configured storage requirements and optionally capture temperature/inspection evidence | NMPB licensing evidence specifies adequate conditions and 25°C for the referenced pharmacy licence | ADOPT / CONFIGURABLE |
| Medicine registration | Store regulatory registration/reference metadata on Product/MedicineProfile | NMPB controls registration of medicines and pharmaceutical preparations | ADOPT |
| Batch traceability | Mandatory batch on applicable medicine stock, receipt, sale, return and movement | Supports NMPB traceability and recall/inspection use cases | ADOPT |
| Electronic records | Append-only audit + attributable actor/device/time + retrievability/export | Electronic Transactions Act supports legal effect of electronic records and evaluates integrity/trustworthiness | ADOPT |
| Invoice content | Invoice model must carry supplier/taxpayer identity, customer identity/tax number where applicable, item/service, serial number/date, amount, tax amount and applied rate | Official Tax Administration invoice guidance specifies these minimum fields | ADOPT |
| E-invoice integration | Build an adapter boundary now; activate against the current Tax Administration technical package only after certification/acceptance | Tax Administration announced E-Invoice resumption in May 2026 and publishes technical requirements | ADOPT / ACTIVATION GATE |
| Tax rates | Configurable TaxRule/effective-period model; never hard-code a national rate | Rates and tax rules can change | ADOPT |
| Payment role | PharmaTech records merchant-side payment events/evidence; it does not become a payment-system operator by default | CBOS requires authorization for operating/providing electronic payment systems | LOCK PRODUCT BOUNDARY |
| Bankak/mobile payment | Provider adapter + explicit verification states; no provider credentials in POS | Aligns with regulated payment-provider boundary and ADR-012 | ADOPT |
| Offline electronic payment | Record claim/evidence offline only if branch policy permits; never mark provider/API verified offline | Verification requires actual provider evidence | ADOPT |
| Data residency | Default regulated/evidence-bearing deployment to Sudan-hosted storage; cross-border hosting requires explicit legal/commercial approval | Minimizes regulatory/data-transfer uncertainty | ADOPT |
| Retention | Default 7-year operational/audit retention for MVP unless a verified legal rule requires longer; legal minimum wins | Gives implementation a concrete default without falsely claiming 7 years is statutory | ADOPT / REVIEW |
| Deletion | No hard delete for financial, prescription, payment evidence, audit or regulatory stock records | Preserves electronic evidence and inspection provenance | ADOPT |
| Inspection/export | Compliance export package by branch/date/product/batch/prescription/payment/audit | Supports inspection and tax/audit retrieval | ADOPT |
| Regulatory changes | Compliance configuration versioned by effective date; changes audited | Prevents silent policy mutation | ADOPT |

### 18.1 Explicit Legal Gates

The following remain legal/compliance gates because the available public evidence does not safely establish a single universal implementation rule:

1. Exact controlled/narcotic schedules and dispensing limits.
2. Exact statutory retention periods for every record class.
3. Exact cross-border/cloud data-hosting restrictions for every category of patient/payment data.
4. Exact current E-Invoice API/certification/production onboarding requirements.
5. Exact obligations triggered if PharmaTech itself becomes a payment intermediary, agent, processor, or other regulated participant.
6. Exact prescription/patient-data requirements beyond the currently evidenced pharmacy licensing requirements.
7. Exact state/territorial licensing differences where implementation differs from federal/NMPB requirements.

These are **not blockers for architecture**. They are activation/configuration/legal gates.

## 19. Evidence-to-Decision Register

### E-01 — NMPB authority and pharmaceutical regulation
NMPB identifies the Medicines and Poisons Act 2009 as the operative law and identifies the Board as the national authority for regulation including storage, pricing, transportation and use of medicines and for licensing/controls of pharmaceutical establishments. citeturn0search1turn0search2

**Decision:** Product/Batch/Branch/Inventory must carry regulatory provenance; licensing metadata belongs at Organization/Branch scope.

### E-02 — Pharmacy licensing and controlled operational records
NMPB's published pharmacy licence material requires, among other things, special prescription records to be present and available to inspectors, a locked cabinet for controlled medicines, verification of medicine validity, and segregation of expired medicines pending destruction. citeturn1search9turn1search1

**Decision:** Prescription Register, controlled-medicine classification, expired-stock quarantine, and disposal/return provenance become concrete product requirements.

### E-03 — Controlled medicines
NMPB publishes a narcotic medicines regulation dated 23 June 2022. citeturn0search0turn1search0

**Decision:** controlled/narcotic medicine support is not optional architecture; exact workflow is gated until the applicable regulation is fully reviewed.

### E-04 — Electronic records
The Electronic Transactions Act 2007 published by CBOS addresses electronic records and the trust/soundness of how records are initiated, saved, disseminated and preserved; it also states that electronic payment means recognized by CBOS have legal effect. The SCA publishes the Act as amended in 2015. citeturn0search4turn0search11turn0search3

**Decision:** auditability, integrity, retrievability and attributable electronic records are mandatory engineering controls.

### E-05 — Electronic payment authorization boundary
CBOS states that entities operating/providing electronic payment-system services require CBOS approval, and its 2020 mobile-payment regulation defines licensed mobile-payment institutions and their regulated activities. A March 2026 CBOS circular continues to regulate payment/USSD services. citeturn0search7turn1search3turn1search4

**Decision:** PharmaTech remains provider-agnostic and merchant-side by default. Any direct regulated payment capability requires a separate licensing/compliance gate.

### E-06 — Tax invoice content
Official Tax Administration guidance states that a taxable person must issue and retain an invoice/equivalent document and identifies minimum information including supplier identity/tax registration, customer identity/tax number where applicable, subject of supply/service, sequential invoice number/date, amount, and tax amount/rate. citeturn1search10

**Decision:** these fields become mandatory invoice-model capabilities; tax values remain configurable.

### E-07 — E-Invoice system
Sudan Tax Administration announced resumption of the E-Invoice System on 4 May 2026 and publishes registration and technical-requirement materials. Its project description says invoice information is transmitted in real time to the Tax Authority. citeturn1search6turn1search5turn1search7

**Decision:** e-invoice integration is a P0 readiness capability, but production activation requires the current official technical package and acceptance/certification evidence.

## 20. R1-C Disposition

**Engineering disposition: READY FOR RECONCILIATION WITH EXPLICIT LEGAL GATES.**

This is deliberately stronger than the earlier “open questions only” state.

The project now has:
- authoritative evidence for the main compliance domains;
- concrete product controls derived from that evidence;
- explicit implementation defaults;
- explicit legal gates for unresolved matters;
- no need to reopen locked architecture/domain/API baselines.

R1-C should therefore not block the next remediation tracks solely because every legal interpretation is not yet complete. The unresolved items are isolated behind configuration/activation gates.

**Locking condition:** R1-C may be promoted to LOCKED after reconciliation confirms that the implementation defaults and legal gates are represented in Product, Modules, Data, API and Test specifications, with no P0 contradiction.

## 21. Governance Note

This disposition does not create a new financial licence, pharmacy licence, tax registration, payment-provider authorization, or legal certification for PharmaTech.

The software must enforce the selected controls while the operating entity/customer remains responsible for obtaining and maintaining its own licences and regulatory obligations.

Any later authoritative rule that contradicts a selected engineering default is handled through the existing R1 change-control mechanism, not ad-hoc redesign.


**Governance:** This document is subordinate to LOCKED baselines. Any required change to a locked baseline must follow `docs/13-remediation/r1-change-control.md`.
