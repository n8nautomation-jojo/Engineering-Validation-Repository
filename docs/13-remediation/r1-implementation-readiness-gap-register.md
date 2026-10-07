# R1 Implementation Readiness Gap Register

**Status:** ACTIVE REMEDIATION ARTIFACT  
**Authority:** R1 remediation / implementation readiness tracking  
**Baseline rule:** This register does not reopen or supersede any LOCKED baseline.

## Purpose

The repository architecture is mature in several areas, but it is not yet balanced enough to serve as a complete implementation reference for a development team.

This register focuses only on missing execution-enabling material.

## Current state

### Strong / already sufficiently covered

- Domain Model
- Core Architecture
- C4 and module boundaries
- Runtime architecture
- Event and messaging architecture
- Offline/sync foundations
- Conflict foundations
- API architecture
- DTO/error conventions
- Payment flexibility architecture
- Governance and ADR trail
- Failure/recovery and observability foundations

These areas should not be expanded unless an R1 exit criterion, verified defect, or approved requirement requires it.

## Priority gaps

| Gap | Priority | Why it matters | Target artifact | Gate |
|---|---|---|---|---|
| Product authority | P0 | Business rules currently depend too much on conversation history | docs/01-product/ product baseline | Reconciliation |
| Module implementation contracts | P0 | Developers lack per-module ownership and transaction boundaries | docs/04-modules/ | Pre-implementation |
| PostgreSQL schema | P0 | Architecture does not yet define executable persistence structure | docs/05-data/ | Phase 3.5+ |
| SQLite operational schema | P0 | Offline implementation cannot proceed safely without local data contract | docs/05-data/ | R1-A1/B + Phase 3.5 |
| Development standards | P0 | Team cannot implement consistently | docs/10-development/ | Pre-implementation |
| Test strategy and acceptance structure | P0 | Existing R1 matrices are strong but not yet a project-wide test system | docs/10-development/ and/or docs/12-implementation/ | Pre-implementation |
| Implementation mapping | P0 | Roadmap says what to build but not where/how | docs/12-implementation/ | Implementation Readiness Gate |
| UI/UX functional contracts | P1 | POS/admin behavior is under-specified for implementation | Product/module implementation specs | Before UI implementation |
| Hardware abstraction | P1 | POS printer/scanner/cash drawer behavior needs a concrete boundary | Module/development implementation spec | MVP-0 hardware validation |
| Deployment/provisioning | P1 | Production POS lifecycle is not yet executable | docs/09-operations/ | Before pilot |
| CI/CD and quality gates | P1 | No enforceable delivery pipeline is specified | docs/10-development/ | Before implementation |
| Integration contracts | P1 | Hisabati and future providers cannot be invented | docs/06-api/ + ADR/integration docs | When provider contract is available |
| Compliance requirements | P0/P1 | Sudan-specific legal assumptions must be evidence-based | R1-C | Before hard-coding regulated rules |

## Missing detail that must NOT be invented

The following remain intentionally unresolved until their responsible R1 tracks or evidence close:

- Offline authorization freshness thresholds
- Device revocation containment thresholds
- Exact local encryption/key-storage technology
- Exact Hisabati API contract
- Sudan regulatory/legal rules
- Final Phase 3.4 endpoint promotion
- Final OpenAPI machine-readable contract
- Final offline stock allocation numeric limits

## Implementation-readiness dependency chain

1. R1-A1/A2/A3/B/C/D/H decisions
2. R1 reconciliation
3. Phase 3.4 review and promotion
4. Phase 3.5 OpenAPI + contract fixtures
5. Product baseline completion
6. Module implementation contracts
7. Data schemas and migrations
8. Development standards and CI gates
9. Implementation mapping
10. Implementation Readiness Gate
11. MVP-0 coding

## Anti-loop rule

Do not create a document merely because a directory is empty.

Create an artifact only when it:

- removes an implementation ambiguity;
- establishes an authoritative contract;
- defines a testable invariant;
- defines a migration/deployment requirement; or
- satisfies an explicit readiness gate.

Once an area reaches implementation readiness, freeze it and move to code unless executable evidence requires a targeted change.

## Definition of implementation-ready documentation

A feature/module is implementation-ready only when its authoritative documentation identifies:

- purpose and scope;
- aggregate/entity ownership;
- commands and queries;
- invariants and business rules;
- authorization and scope;
- transaction boundary;
- emitted/consumed events;
- persistence requirements;
- offline behavior;
- failure/recovery behavior;
- API contract;
- audit requirements;
- test acceptance criteria;
- dependencies;
- explicit non-goals.

## Exit condition for this register

This register is closed when every P0 gap has either:

1. an approved authoritative artifact, or
2. an explicit documented dependency that prevents premature specification.

Closure does not require filling every folder with documents.
