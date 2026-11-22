# Data Model: ChangeFlow Request Review API

## Change Request

| Field | Rules / ownership |
|---|---|
| `id` | Server-generated stable identifier. |
| `title`, `description`, `reason` | Requester-owned; required, non-empty on create and submit. |
| `requesterId` | Set from authenticated creator; never client-selectable later. |
| `status` | Draft, PendingReview, ChangesRequested, or Approved; service-controlled. |
| `version` | Starts at 1; incremented by every successful mutation. |
| `createdAt`, `updatedAt` | Server-maintained timestamps. |

SQLite table `change_requests` owns these fields. Database constraints are persistence backstops;
services provide user-facing validation and decisions.

### SQLite Schema Shape

`change_requests` stores `id` (primary key), `title`, `description`, `reason`, `requester_id`,
`status`, `version`, `created_at`, and `updated_at`. Title, description, reason, requester ID,
status, and version are non-null. Status is constrained to the four specified values; version is a
positive integer. An index on requester ID supports Requester listings, and an index on status
supports Reviewer PendingReview listings.

## Review Decision

| Field | Rules / ownership |
|---|---|
| `id` | Server-generated identifier. |
| `changeRequestId` | References one Change Request. |
| `reviewerId` | Set from eligible authenticated Reviewer. |
| `action` | APPROVED or CHANGES_REQUESTED. |
| `comment` | Non-empty for CHANGES_REQUESTED; absent for approval. |
| `createdAt` | Server-maintained timestamp. |

`review_decisions` is append-only. Decision insert and state transition share one transaction.

`review_decisions` stores `id` (primary key), `change_request_id` (foreign key), `reviewer_id`,
`action`, `comment`, and `created_at`. The action is constrained to APPROVED or CHANGES_REQUESTED;
the service requires a comment only for CHANGES_REQUESTED. An index on change request ID supports
retrieval of retained decisions.

Retained decisions, including ChangesRequested comments, are included in a single-request view only
when the viewer is that Change Request's owning Requester. Reviewer listing and PendingReview view
responses do not expose retained review decisions. This avoids revealing restricted information while
meeting the Requester's review-feedback requirement.

## Actor and Access

Actor context comes from verified JWT: `userId` and Requester/Reviewer roles. This feature has no
user-management table or server-side token revocation state; role changes apply only to newly issued
tokens. A Requester views only owned requests. Every eligible Reviewer views every PendingReview
request and cannot decide their own request. A dual-role actor's listing is the de-duplicated union
of owned requests in every state and all PendingReview requests.

## Transition Matrix

| Current | Command | Conditions | Result |
|---|---|---|---|
| Draft | Edit | Owner, Requester, version | Draft, version +1 |
| Draft | Submit | Owner, Requester, fields, version | PendingReview, version +1 |
| Draft | Delete | Owner, Requester, version | Removed |
| PendingReview | Approve | Reviewer, not owner, version | Approved, version +1 |
| PendingReview | Request changes | Reviewer, not owner, comment, version | ChangesRequested, version +1 |
| ChangesRequested | Edit | Owner, Requester, version | ChangesRequested, version +1 |
| ChangesRequested | Resubmit | Owner, Requester, fields, version | PendingReview, version +1 |

All other combinations, including cancellation of PendingReview and Approved edits, are rejected.
Conditional write mismatch returns conflict and cannot overwrite newer data.
