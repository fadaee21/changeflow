# ChangeFlow

ChangeFlow is a small HTTP API for managing Change Requests through independent review. It was
developed as the practical project for Session 01 of *Software Engineering in the AI Era*, using a
specification-driven development workflow.

## Stack

- Node.js and TypeScript
- Express HTTP API
- SQLite persistence through `better-sqlite3`
- JWT Bearer authentication and Requester/Reviewer authorization
- Vitest for unit and HTTP integration tests

## Prerequisites

- A supported Node.js LTS installation
- npm

## Run Locally

```bash
npm install
export JWT_SECRET='replace-with-a-local-secret'
npm run dev
```

The service listens on port `3000` unless `PORT` is set. Authentication and user management are out
of scope; local tests create signed JWTs for known users and roles.

## Validation Commands

```bash
npm run typecheck
npm test
npm run build
```

The recorded validation evidence is in
[specs/001-request-review-api/quickstart.md](specs/001-request-review-api/quickstart.md).

## Main Architecture Decisions

- HTTP routes only parse/map HTTP concerns; business rules live in
  `src/application/change-request-service.ts`.
- SQLite uses conditional updates and a version field to reject stale mutations without overwriting
  newer data.
- JWT claims provide the actor ID and roles. This baseline has no login system, user-management
  feature, or server-side token-revocation state.
- A user cannot approve or request changes on their own request, even with both roles.
- Requesters see their own requests; Reviewers see PendingReview requests; dual-role listings are a
  de-duplicated union.

## Limitations and Scope

- Draft deletion is supported only for its owner.
- PendingReview cancellation is not supported.
- Duplicate requests are allowed without automatic detection.
- Manual usability criteria SC-004 and SC-005 have not been executed; see the validation guide.

## SDD Artifacts

The feature artifacts are under [specs/001-request-review-api](specs/001-request-review-api):

- `spec.md`, `plan.md`, `research.md`, `data-model.md`, and `contracts/openapi.yaml`
- `tasks.md`
- `quickstart.md`

The project Constitution is at [.specify/memory/constitution.md](.specify/memory/constitution.md).
Analyze and Converge reports are in [docs](docs).

## Coding Agent Role

A coding agent was used to create and refine the SDD artifacts, implementation plan, task breakdown,
and code. Product decisions were captured through Clarify and reviewed against the Constitution;
validation reports record only commands and results actually supplied during the work.
