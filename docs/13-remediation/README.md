# 13-remediation — Architecture & Security Remediation

**Status:** ACTIVE REMEDIATION TRACK — R1  
**Purpose:** Convert the external assessment into approved engineering decisions before Phase 3.5.  
**Scope:** Architecture, security, compliance, API consistency, product readiness and documentation governance.

## Governance Rule

R1 is a remediation and reconciliation track. It does **not** automatically reopen locked baselines.

A locked baseline may only change through an explicit revision, ADR, or superseding decision recorded in the Decision Log.

## Current Gate

Phase 3.5 — Final Machine-Readable OpenAPI + Contract Fixtures is **BLOCKED** until the R1 exit criteria are satisfied.

Phase 3.4 remains **PROPOSED** until its endpoint contracts are reconciled with R1 outcomes.

## Documents

- [R1 Baseline](r1-baseline.md)
- [R1 Impact Matrix](r1-impact-matrix.md)
- [R1 Exit Criteria](r1-exit-criteria.md)

## Tracks

1. Architecture & Domain Safety
2. Security
3. Regulatory Compliance
4. External Integrations
5. Product Readiness
6. Commercial Readiness
7. Documentation & Governance

## Non-Goals

R1 does not authorize:
- production implementation of unresolved policies;
- premature OpenAPI generation;
- speculative provider contracts;
- hard-coding Sudan-only rules without regulatory validation;
- changing locked architecture by implication.

## Source of Truth

R1 findings are derived from the reviewed assessment and repository reconciliation. The assessment remains an input document; the resulting approved decisions and baselines are the PharmaTech source of truth.
