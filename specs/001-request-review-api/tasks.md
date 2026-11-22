# Tasks: ChangeFlow Request Review API

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md),
[data-model.md](data-model.md), and [contracts/openapi.yaml](contracts/openapi.yaml)

**Tests**: Vitest service tests and Express integration tests are required by the plan and
Constitution. Write each test task before its implementation task and verify failure only when
implementation begins; this task list makes no claim that tests or commands have run.

## Phase 1: Setup

- [X] T001 Initialize Node.js TypeScript project metadata and scripts in `package.json` for Express, SQLite, JWT, Vitest, type checking, and test execution.
- [X] T002 Configure TypeScript compilation and module resolution in `tsconfig.json` for `src/` and `tests/`.
- [X] T003 Configure Vitest unit/integration projects and test setup in `vitest.config.ts` and `tests/setup.ts`.
- [X] T004 Create the planned source and test directory layout in `src/domain/`, `src/application/`, `src/repository/`, `src/http/`, `tests/unit/`, and `tests/integration/`.

---

## Phase 2: Foundational Prerequisites

**Purpose**: Blocking shared pieces. Complete this phase before any user-story route integration.

- [X] T005 Define `Requester`, `Reviewer`, actor context, request statuses, command shapes, service outcomes, and error codes in `src/domain/types.ts` per FR-001–FR-012.
- [X] T006 Define SQLite migrations in `src/repository/migrations.ts` for `change_requests` and `review_decisions`, including non-null title/description/reason/requester/status/version, four-status constraint, positive version, review-decision action constraint, foreign key, and listing indexes from `data-model.md`.
- [X] T007 Define the repository interface and persistence mapping in `src/repository/change-request-repository.ts`, including conditional mutation inputs of ID, expected status, and expected version.
- [X] T008 Implement SQLite connection setup, foreign-key activation, migration execution, and parameterized repository operations in `src/repository/sqlite-change-request-repository.ts`.
- [X] T009 Implement JWT Bearer verification and immutable `{ userId, roles }` actor context middleware in `src/http/auth-middleware.ts` using verified token claims only, without login, user management, or server-side revocation state.
- [X] T010 Implement centralized HTTP outcome/error mapping in `src/http/error-middleware.ts` for 400, 401, 403, 404, and 409 without exposing restricted request content.
- [X] T011 Create the Express application composition and protected-route registration seam in `src/http/app.ts` using the contract-wide BearerAuth convention.

**Checkpoint**: Database/migrations, repository seam, authenticated actor context, and HTTP error
mapping are ready; user-story services may now be implemented.

---

## Phase 3: User Story 1 — Create and Submit a Change Request (P1) 🎯 MVP

**Goal**: A Requester can create, edit, submit, delete, list, and view their own Change Requests.

**Independent Test**: A signed Requester token creates an owned Draft, edits it, submits it to
PendingReview, and sees only their own requests.

- [X] T012 [US1] Write service tests in `tests/unit/change-request-service.spec.ts` for mandatory scenario 1 (successful Draft creation), required title/description/reason validation, owner-only Draft edits, duplicate allowance, and FR-001/FR-002/FR-014/FR-015/FR-018.
- [X] T013 [US1] Write service tests in `tests/unit/change-request-service.spec.ts` for mandatory scenario 2 (valid Draft-to-PendingReview submission), invalid submission state, required fields on submission, and FR-003/FR-009/FR-015.
- [X] T014 [US1] Write service tests in `tests/unit/change-request-service.spec.ts` for owner-only Draft deletion, rejection for non-Draft/non-owner deletion, and FR-016.
- [X] T015 [US1] Write service tests in `tests/unit/change-request-service.spec.ts` for Requester-only listing/detail visibility, dual-role de-duplicated-union listing, and retained review-decision/comment visibility for the owner under FR-017/FR-021.
- [X] T016 [US1] Implement creation, edit, submit, delete, list, and owner-detail application rules in `src/application/change-request-service.ts`, including identity, role, ownership, current-state, required-field, and service command validation for FR-001–FR-003 and FR-009–FR-018; atomic conditional repository writes are completed by T032.
- [X] T017 [US1] Implement protected create/list/detail/edit/delete/submit handlers in `src/http/change-request-routes.ts` using `contracts/openapi.yaml`, with `If-Match` required on every mutation except creation.
- [X] T018 [US1] Write Express integration tests in `tests/integration/change-request-routes.spec.ts` for Draft creation, Draft-to-PendingReview submission, owner visibility, deletion, required fields, and contract responses.
- [X] T019 [US1] Write Express integration tests in `tests/integration/auth-and-visibility.spec.ts` for invalid/missing JWT rejection, Requester-only and dual-role-union listing, generic 404 for inaccessible resources, 403 only for denied operations on accessible resources, and non-disclosure of restricted content.

**Checkpoint**: The P1 Requester workflow is independently functional and testable.

---

## Phase 4: User Story 2 — Review and Approve a Pending Request (P2)

**Goal**: An independent Reviewer can see eligible pending requests and approve them; self-approval
and edits after approval are rejected.

**Independent Test**: A non-owner Reviewer approves a PendingReview request; a dual-role requester
cannot approve it, and the Approved request cannot be edited.

- [X] T020 [US2] Write service tests in `tests/unit/change-request-service.spec.ts` for mandatory scenario 3 (dual-role requester self-approval rejection), invalid approval states, and FR-004/FR-007/FR-009.
- [X] T021 [US2] Write service tests in `tests/unit/change-request-service.spec.ts` for mandatory scenario 4 (independent Reviewer approval), Reviewer PendingReview visibility, verified-JWT role-claim evaluation without server-side revocation lookup, and FR-004/FR-011/FR-017.
- [X] T022 [US2] Write service tests in `tests/unit/change-request-service.spec.ts` for mandatory scenario 5 (rejected edit of an Approved request) and FR-008.
- [X] T023 [US2] Implement independent-reviewer visibility and approval rules in `src/application/change-request-service.ts`, persisting an APPROVED review decision atomically with the PendingReview-to-Approved transition.
- [X] T024 [US2] Add the protected approval route in `src/http/change-request-routes.ts`, requiring JWT, `If-Match`, and the 401/403/404/409 contract mapping.
- [X] T025 [US2] Write Express integration tests in `tests/integration/review-approval.spec.ts` for independent approval, self-approval rejection, Approved edit rejection, Reviewer visibility, dual-role union behavior, and error responses.

**Checkpoint**: P1 and P2 workflows are independently verifiable.

---

## Phase 5: User Story 3 — Request Changes and Resubmit (P3)

**Goal**: An independent Reviewer can request actionable changes and the Requester can revise and
resubmit the Change Request.

**Independent Test**: A Reviewer requests changes with a comment; the owner sees the retained
decision, edits the returned request, and resubmits it to PendingReview.

- [X] T026 [US3] Write service tests in `tests/unit/change-request-service.spec.ts` for required non-empty request-changes comments, self-review rejection, retained-decision owner visibility, and FR-005/FR-007/FR-019/FR-021.
- [X] T027 [US3] Write service tests in `tests/unit/change-request-service.spec.ts` for ChangesRequested owner edit/resubmit, non-owner rejection, PendingReview cancellation rejection, and FR-006/FR-020.
- [X] T028 [US3] Implement request-changes and resubmission rules in `src/application/change-request-service.ts`, appending CHANGES_REQUESTED decisions and transitioning atomically under FR-005/FR-006/FR-019/FR-020.
- [X] T029 [US3] Add the protected request-changes route in `src/http/change-request-routes.ts`, requiring a non-empty comment, JWT, `If-Match`, and contract error mapping.
- [X] T030 [US3] Write Express integration tests in `tests/integration/request-changes.spec.ts` for required comments, retained owner decision visibility, returned edit/resubmit, self-review, cancellation rejection, and contract responses.

**Checkpoint**: All three user stories are independently functional and testable.

---

## Phase 6: Concurrency, Validation, and Reporting

- [X] T031 Write service and integration tests in `tests/unit/change-request-service.spec.ts` and `tests/integration/change-request-routes.spec.ts` for mandatory scenario 6: stale `If-Match` version returns conflict and preserves newer stored state under FR-009/FR-010.
- [X] T032 Complete conditional version/state mutation handling in `src/repository/sqlite-change-request-repository.ts` and `src/application/change-request-service.ts` so every edit, transition, and delete rejects stale versions without silent overwrite.
- [X] T033 Reconcile route responses and error payloads with `specs/001-request-review-api/contracts/openapi.yaml` in `src/http/change-request-routes.ts` and `src/http/error-middleware.ts`, including generic 404 for inaccessible resources and 403 only for denied operations on accessible resources.
- [X] T034 Prepare a real-command validation report template in `specs/001-request-review-api/quickstart.md` that records only executed type-check/test commands, their exit results, and limitations.
- [X] T035 Prepare the SC-004/SC-005 manual usability evidence record in `specs/001-request-review-api/quickstart.md`; label both criteria `not executed` until observed sessions supply participant, timing, assistance, and completion evidence.
- [X] T036 Run `$speckit-analyze` after implementation-ready task review against `specs/001-request-review-api/spec.md`, `plan.md`, and `tasks.md`, and resolve any reported cross-artifact inconsistency before implementation.

---

## Dependencies and Execution Order

- Phase 1 precedes Phase 2.
- Phase 2 blocks every story: migration/schema work (T006) precedes repository work (T007–T008); JWT actor context (T009) precedes protected routes (T017, T024, T029); services precede those routes.
- Implement stories in P1 → P2 → P3 order. P2 relies on P1-created PendingReview requests; P3 relies on P2 review-decision persistence.
- Phase 6 follows all story phases. T031 precedes T032; T033 follows routes; T036 is the Analyze checkpoint before implementation execution.

## Parallel Opportunities

No task is marked `[P]`: the proposed implementation deliberately concentrates shared behavior in
`src/application/change-request-service.ts`, `src/http/change-request-routes.ts`, and shared test
files. Marking them parallel would create file conflicts or bypass an unresolved dependency.

## Implementation Strategy

1. Complete Setup and Foundational prerequisites.
2. Deliver and validate P1 as the MVP.
3. Add P2, then P3, preserving the existing P1 behavior.
4. Complete concurrency/error contract reconciliation, evidence preparation, and the Analyze checkpoint.

---

## Phase 7: Convergence

- [X] T037 Require a verified `Requester` role for an owner's direct Change Request view, while preserving Reviewer access only to `PendingReview` requests; add service and integration coverage for role-filtered owner access per FR-017 (partial).
