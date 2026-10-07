# Documentation Guide

**Status: LOCKED**

Documentation is the engineering specification that governs implementation.

## Rules

1. Major business and architectural decisions require a durable record.
2. Approved decisions must not be silently changed.
3. Contradictions require an ADR or explicit decision update.
4. Implementation PRs reference relevant documentation.
5. Domain rules belong in domain specifications, not only UI/controller code.
6. Offline/sync behavior is part of the business workflow where applicable.
7. Security, authorization, auditability and failure behavior are first-class requirements.
8. Temporary compromises are recorded as technical debt.
9. Important data must have explicit ownership and source-of-truth documentation.

## Required decision record

Decision · Context · Alternatives · Reason · Consequences · Migration/Rollout Impact · Related Documents · Status
