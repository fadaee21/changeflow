# Implementation Plan: ChangeFlow Request Review API

**Branch**: `001-request-review-api` | **Date**: 2026-11-21 | **Spec**: [spec.md](spec.md)

## Summary

Build a Node.js TypeScript service using Express, SQLite, JWT Bearer tokens, and Vitest. Routes
handle HTTP only; application services own business rules; a SQLite repository persists requests and
review decisions. See [research.md](research.md), [data-model.md](data-model.md), and
[contracts/openapi.yaml](contracts/openapi.yaml).

## Technical Context

**Language/Version**: Node.js with TypeScript; a supported Node.js LTS at implementation time

**Primary Dependencies**: Express, JWT library, SQLite driver, Vitest

**Storage**: SQLite with foreign keys enabled

**Testing**: Vitest unit tests and Express integration tests with temporary SQLite and signed JWTs

**Target Platform**: Local/server Node.js process

**Project Type**: Single HTTP service

**Performance Goals**: SC-004 and SC-005 require observed manual usability sessions; they remain
`not executed` until actual evidence is recorded.

**Constraints**: JWT only; no login/user management or server-side token revocation state; role
changes apply to newly issued tokens; every mutation supplies `If-Match` version; stale mutations
conflict; no duplicate detection or PendingReview cancellation.

**Scale/Scope**: One service, two roles, four states, one SQLite database, no external services.

## Constitution Check

| Gate | Evidence | Status |
|---|---|---|
| Business logic outside controllers | Routes map HTTP; services own rules. | Pass |
| No self-approval | Services compare actor and requester IDs. | Pass |
| Guarded transitions | Services validate actor, role, state, version; repository conditionally writes. | Pass |
| Critical-rule tests | Six automated test groups below. | Pass |
| Honest reporting | Quickstart labels unrun manual criteria. | Pass |
| Simple design | Four layers only; no ORM, event bus, or user service. | Pass |
| Product decisions resolved | Specification clarifications are applied. | Pass |

Post-design re-check: Pass. `version` is an implementation field, not a product revision entity.

## Architecture and Responsibility Boundaries

```text
route/controller -> JWT middleware -> application service -> repository -> SQLite
                                      -> domain types/outcomes
```

- **Routes/controllers** parse transport input, obtain actor context, call one service, map outcomes.
- **JWT middleware** verifies a Bearer token and creates immutable `{ userId, roles }` from current
  token claims; this baseline has no role-revocation lookup after token issuance.
- **Application services** enforce fields, ownership, roles, self-review, lifecycle, comments,
  cancellation prohibition, and expected-version rules.
- **Repository** uses parameterized SQLite and atomic conditional writes; it knows no HTTP.
- **Domain types** define statuses, roles, commands, outcomes, and error categories.

## State and Concurrency Design

Only these transitions exist: Draft -> PendingReview; PendingReview -> Approved or
ChangesRequested; ChangesRequested -> PendingReview. A dual-role actor cannot approve or request
changes on their own request. Every edit, transition, and delete requires `If-Match` with the current
numeric version. Conditional writes match ID, version, and expected state, then increment version
atomically. A mismatch returns conflict and never overwrites stored content. A review decision and
its state transition are one transaction.

## API and Error Conventions

See [contracts/openapi.yaml](contracts/openapi.yaml). Mutations return the resulting request and its
incremented version. Errors use:

```json
{ "error": { "code": "STALE_VERSION", "message": "...", "details": {} } }
```

Use 400 for malformed/missing input, 401 for missing/invalid token, 404 with a generic unavailable
result for an inaccessible request, 403 for denied operations on an accessible request, and 409 for
invalid state or stale version. Do not reveal restricted content. Initial creation is the only
mutation without `If-Match`.

## Test Strategy

Unit tests exercise services; integration tests exercise Express, JWT, contracts, and temporary
SQLite. Reports name only commands actually run.

1. Creation requires title, description, and reason; valid creation yields owned Draft/version 1.
2. Only an owner edits/deletes Draft; Approved requests cannot be edited.
3. Only valid lifecycle transitions succeed; invalid transitions and cancellation fail.
4. A dual-role requester cannot approve or request changes on their own request.
5. Request changes requires comment; owner edits/resubmits ChangesRequested request.
6. A stale version conflicts and preserves the newer stored state.

Add HTTP coverage for JWT rejection, roles, visibility, and error mapping.

## Manual Acceptance Reporting

SC-004 and SC-005 remain `not executed` until observed sessions occur. Record participant count,
task, completion, assistance, elapsed time, date, exclusions, and the calculated 95% result.
Automated tests never satisfy these criteria.

## Project Structure

```text
src/
├── domain/
├── application/
├── repository/
└── http/
tests/
├── unit/
└── integration/
specs/001-request-review-api/
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/openapi.yaml
```

**Structure Decision**: One service with HTTP, application, repository, and domain boundaries only.

## Complexity Tracking

No Constitution violations require justification.
