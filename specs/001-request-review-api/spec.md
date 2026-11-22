# Feature Specification: Request Review API

**Feature Branch**: `001-request-review-api`

**Created**: 2026-11-21

**Status**: Draft

**Input**: User description: "Baseline ChangeFlow HTTP API with Requester and Reviewer roles and
the defined Change Request lifecycle."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Submit a Change Request (Priority: P1)

A Requester creates and manages their own Change Request, editing it while it is a Draft and
submitting it for review.

**Why this priority**: A Change Request must be reliably created and submitted before review can
provide value.

**Independent Test**: A Requester creates a Draft, edits it, and submits it; its state becomes
PendingReview.

**Acceptance Scenarios**:

1. **Given** an identified Requester, **When** they create a Change Request, **Then** the system
   creates a Draft owned by that Requester with a title, change description, reason for change,
   requester identifier, and current status.
2. **Given** an identified Requester omits a title, change description, or reason for change,
   **When** they attempt to create a Change Request, **Then** the system rejects the creation and
   identifies the missing required information.
3. **Given** a Draft owned by a Requester, **When** its owner edits it, **Then** the system records
   the changes and retains the Draft state.
4. **Given** a Draft with a title, change description, and reason for change, **When** its owner
   submits it, **Then** the system moves it to PendingReview.
5. **Given** a Draft missing a title, change description, or reason for change, **When** its owner
   attempts to submit it, **Then** the system rejects the submission and identifies the missing
   required information.
6. **Given** a Draft owned by another Requester, **When** a Requester attempts to edit or submit it,
   **Then** the system rejects the action without changing the Change Request.
7. **Given** an Approved Change Request, **When** its owner attempts to edit it, **Then** the system
   rejects the action without changing it.
8. **Given** a Draft that changed after the Requester last viewed it, **When** the Requester attempts
   to edit or submit stale content, **Then** the system rejects the attempt and preserves the latest
   valid Change Request.
9. **Given** a Draft owned by a Requester, **When** its owner deletes it, **Then** the system
   permanently removes that Draft.
10. **Given** a Draft owned by another Requester or a non-Draft Change Request, **When** a Requester
   attempts to delete it, **Then** the system rejects the action without changing the Change Request.
11. **Given** a Requester has Change Requests, **When** they list or view Change Requests, **Then**
   the system returns only Change Requests owned by that Requester.
12. **Given** a Requester views one of their own Change Requests with retained review decisions,
   **When** the request is returned, **Then** the system includes those decisions, including the
   required comment for every ChangesRequested decision.
13. **Given** a Requester creates or submits a Change Request that is similar to another Change
   Request, **When** all other requirements are met, **Then** the system permits the action without
   automatic duplicate detection or warning.
14. **Given** an actor holds both Requester and Reviewer roles, **When** they list Change Requests,
   **Then** the system returns the de-duplicated union of requests they own in any state and every
   PendingReview request available to Reviewers.

---

### User Story 2 - Review and Approve a Pending Request (Priority: P2)

A Reviewer reviews an eligible PendingReview Change Request and approves it independently of its
Requester.

**Why this priority**: Independent approval is the core control that completes a Change Request.

**Independent Test**: A Reviewer other than the Requester approves a PendingReview Change Request;
its state becomes Approved and it cannot subsequently be edited.

**Acceptance Scenarios**:

1. **Given** a PendingReview Change Request and an authorized Reviewer who is not its Requester,
   **When** the Reviewer approves it, **Then** the system moves it to Approved.
2. **Given** a PendingReview Change Request, **When** its Requester attempts to approve it, **Then**
   the system rejects the action even if that person also has the Reviewer role.
3. **Given** a Draft, ChangesRequested, or Approved Change Request, **When** a Reviewer attempts to
   approve it, **Then** the system rejects the action without changing it.
4. **Given** an eligible Reviewer lists or views Change Requests, **When** a Change Request is in
   PendingReview, **Then** the system makes it available to that Reviewer; Draft,
   ChangesRequested, and Approved Change Requests are not available to the Reviewer.
5. **Given** an actor presents an expired, invalid, or missing JWT, **When** that actor attempts an
   action, **Then** the system rejects it without changing the Change Request.
6. **Given** a PendingReview Change Request, **When** its Requester attempts to cancel it before a
   Reviewer acts, **Then** the system rejects the action without changing the Change Request.
7. **Given** an authenticated actor requests a Change Request they cannot view, **When** the system
   evaluates the request, **Then** it returns a generic unavailable result without revealing that the
   Change Request exists or disclosing its content.

---

### User Story 3 - Request Changes and Resubmit (Priority: P3)

A Reviewer requests changes to an eligible pending Change Request, after which its Requester can
edit and resubmit it for another review.

**Why this priority**: The return-and-resubmit loop enables review without weakening ownership or
independent approval controls.

**Independent Test**: A Reviewer other than the Requester requests changes to a PendingReview Change
Request; its owner edits and resubmits it, returning it to PendingReview.

**Acceptance Scenarios**:

1. **Given** a PendingReview Change Request and an authorized Reviewer who is not its Requester,
   **When** the Reviewer requests changes with a non-empty comment, **Then** the system moves it to
   ChangesRequested and retains the comment.
2. **Given** a ChangesRequested Change Request, **When** its Requester edits and resubmits it,
   **Then** the system moves it to PendingReview.
3. **Given** a ChangesRequested Change Request, **When** anyone other than its Requester attempts to
   edit or resubmit it, **Then** the system rejects the action without changing it.
4. **Given** a PendingReview Change Request, **When** its Requester attempts to request changes,
   **Then** the system rejects the action even if that person also has the Reviewer role.
5. **Given** a PendingReview Change Request, **When** an authorized Reviewer requests changes without
   a comment, **Then** the system rejects the action without changing the Change Request.

### Edge Cases

- A user who has both roles cannot approve or request changes to their own Change Request.
- An unauthenticated or unauthorized actor cannot create, edit, submit, approve, or request changes.
- An action based on a state or content that is no longer current is rejected without overwriting the
  newer valid Change Request.
- Repeating a transition after it succeeds is rejected unless that transition is allowed from the
  current state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow an identified Requester to create a Change Request in Draft state
  and record that Requester as its owner and requester identifier.
- **FR-002**: The system MUST allow only a Draft's owner to edit that Draft.
- **FR-003**: The system MUST allow only a Draft's owner to submit it, moving it from Draft to
  PendingReview.
- **FR-004**: The system MUST allow an authorized Reviewer who is not the Requester to approve a
  PendingReview Change Request, moving it to Approved.
- **FR-005**: The system MUST allow an authorized Reviewer who is not the Requester to request
  changes to a PendingReview Change Request, moving it to ChangesRequested.
- **FR-006**: The system MUST allow only a ChangesRequested Change Request's owner to edit and
  resubmit it, moving it from ChangesRequested to PendingReview.
- **FR-007**: The system MUST forbid self-approval and self-review actions, including when the actor
  holds both Requester and Reviewer roles.
- **FR-008**: The system MUST reject any edit of an Approved Change Request.
- **FR-009**: Every state-changing operation MUST validate actor identity, authorization, current
  Change Request state, and concurrency before applying the operation.
- **FR-010**: The system MUST reject stale or conflicting operations without silently overwriting a
  newer Change Request or producing an inconsistent state.
- **FR-011**: The system MUST determine an actor's roles from the claims in a verified JWT at the
  time an action is evaluated. In this baseline, role changes affect newly issued tokens and do not
  invalidate an already valid JWT before its expiry.
- **FR-012**: The system MUST return a generic unavailable result for an inaccessible Change Request
  without disclosing its existence or content. For an accessible Change Request, it MUST report
  whether a rejected operation failed due to ownership, current state, self-review, or concurrency.
- **FR-013**: The system MUST retain the Change Request's current state, owner, and successful review
  outcomes so authorized participants can determine its status.
- **FR-014**: Every Change Request MUST include a title, change description, reason for change,
  requester identifier, and current status.
- **FR-015**: The system MUST require a title, change description, and reason for change when a
  Requester creates or submits a Change Request, and reject the action if any is absent.
- **FR-016**: The system MUST allow only a Draft's owner to permanently delete that Draft, after
  validating the actor's identity, authorization, current state, and concurrency.
- **FR-017**: The system MUST allow a Requester to list and view only Change Requests they own, and
  every eligible Reviewer to list and view every PendingReview Change Request. An actor with both
  roles MUST receive the de-duplicated union of those two result sets when listing.
- **FR-018**: The system MUST permit creation and submission of similar or duplicate Change Requests
  without automatic duplicate detection, warning, or rejection.
- **FR-019**: The system MUST require an authorized Reviewer to provide a non-empty comment when
  requesting changes, retain that comment with the review decision, and reject the action if the
  comment is absent.
- **FR-020**: The system MUST reject a Requester's attempt to cancel a PendingReview Change Request.
- **FR-021**: When a Requester views one of their own Change Requests, the system MUST expose its
  retained review decisions, including the required comment for each ChangesRequested decision.

### Key Entities

- **Change Request**: A request owned by a Requester with a lifecycle state of Draft,
  PendingReview, ChangesRequested, or Approved. It includes a title, change description, reason for
  change, requester identifier, and current status.
- **Actor**: An identified user who may hold the Requester role, the Reviewer role, or both.
- **Review Decision**: An approval or request-for-changes action made by an eligible Reviewer on a
  PendingReview Change Request. A request-for-changes decision includes the Reviewer's comment and
  is visible when the owning Requester views that Change Request.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In acceptance testing, 100% of valid Draft-to-PendingReview,
  PendingReview-to-Approved, PendingReview-to-ChangesRequested, and
  ChangesRequested-to-PendingReview flows result in the specified state.
- **SC-002**: In acceptance testing, 100% of self-approval, invalid-state, unauthorized, and
  Approved-edit attempts are rejected without changing the Change Request.
- **SC-003**: In acceptance testing, 100% of simultaneous conflicting state-change attempts preserve
  one latest valid state and reject each stale attempt.
- **SC-004**: At least 95% of representative Requesters can create and submit a Change Request in
  under three minutes without assistance.
- **SC-005**: At least 95% of representative Reviewers can approve or request changes to a
  PendingReview Change Request in under two minutes without assistance.

## Assumptions

- The baseline supports exactly the specified lifecycle: Draft, PendingReview, ChangesRequested, and
  Approved.
- A ChangesRequested Change Request remains owned by its original Requester and may be edited and
  resubmitted only by that Requester.
- The mechanism that establishes an actor's identity and roles is outside the scope of this baseline.
- No implementation choices, including technology stack, persistence, authentication mechanism,
  framework, or interface design, are made by this specification.

## Clarifications

### Session 2026-11-21

- Q: May a Requester delete their own Draft Change Request? → A: The owner may permanently delete
  only their own Draft.
- Q: Who may list and view Change Requests? → A: Requesters see only their own Change Requests;
  Reviewers see only PendingReview Change Requests within their review scope.
- Q: Should every eligible Reviewer be able to view and act on every PendingReview Change Request?
  → A: Every eligible Reviewer may view and act on every PendingReview Change Request.
- Q: How should the system handle a Requester creating or submitting a Change Request that appears to
  duplicate another request? → A: Permit duplicates without automatic detection or warning.
- Q: Must a Reviewer provide a comment when requesting changes to a Change Request? → A: A non-empty
  reviewer comment is required to request changes.
- Q: May a Requester cancel a PendingReview Change Request before a Reviewer acts? → A: A Requester
  cannot cancel a PendingReview Change Request in the initial baseline.

### Session 2026-11-22

- Q: How do role changes affect a valid JWT in this baseline? → A: Authorization uses verified token
  claims at evaluation time; role changes apply to newly issued tokens and do not revoke valid tokens.
- Q: What does a dual-role actor receive when listing Change Requests? → A: The de-duplicated union
  of owned requests in any state and all PendingReview requests.
- Q: How does the API handle an inaccessible Change Request? → A: Return a generic unavailable
  result without revealing its existence or content; explain operation denial only for accessible requests.
