<!--
Sync Impact Report
Version change: scaffold/unratified -> 1.0.0
Modified principles: none; initial constitution established
Added sections: Core Principles; Workflow and Evidence; Product Decisions; Governance
Removed sections: none
Follow-up TODOs: none
-->
# ChangeFlow Constitution

## Core Principles

### I. Application Logic Is Outside HTTP Boundaries
Business logic MUST NOT be placed in controllers, endpoints, or other HTTP-boundary code.
Controllers MUST handle only HTTP request/response concerns, initial authentication context, and
application-layer invocation. Business rules, orchestration, and persistence decisions belong in
application and domain layers so they are testable independently of transport.

### II. No Self-Approval
A user MUST NOT approve, review, or otherwise authorize a request they submitted, including when
that user holds both Requester and Reviewer roles. The application layer MUST enforce this rule;
UI or controller checks alone are insufficient. This preserves independent review and auditability.

### III. Guarded State Transitions
Every request state transition MUST validate the actor's identity, authorization, and the request's
current state. Each transition MUST also use concurrency control that prevents conflicting or stale
updates from silently succeeding. Transition validation belongs in the application/domain boundary
and MUST produce an explicit result for rejected attempts.

### IV. Tests Protect Critical Rules
Automated tests are mandatory for critical business rules, including self-approval prevention,
authorization decisions, allowed state transitions, and concurrency-conflict handling. Tests MUST
exercise rules through the application layer and remain deterministic. A change to a critical rule
is incomplete until its relevant automated tests pass.

### V. Simple, Extensible Design
The architecture MUST remain simple, maintainable, and incrementally extensible. New abstractions,
layers, and infrastructure MUST be introduced only when they solve a demonstrated current need or
make a defined near-term extension materially safer. Avoid speculative generalization and retain
clear ownership of each responsibility.

## Workflow and Evidence

Build, test, and validation reports MUST be based only on commands that were actually executed and
their actual results. Reports MUST identify executed commands, their outcome, and any relevant
failures or limitations; they MUST NOT claim unrun checks or invented results. Code review and
implementation validation MUST verify compliance with the Core Principles before completion.

## Product Decisions

Product ambiguities MUST be recorded and resolved through the Clarify workflow before implementation
depends on a decision. The coding agent MUST NOT silently make product decisions. Where work cannot
proceed safely without a decision, the ambiguity and its impact MUST be documented for resolution.

## Governance

This Constitution supersedes conflicting project development practices. Amendments require a written
change to this document, a Sync Impact Report, and review of affected specifications, plans, tasks,
and validation expectations. The version follows semantic versioning: MAJOR for incompatible
governance redefinitions or removals, MINOR for added or materially expanded principles or sections,
and PATCH for clarifications or editorial refinements.

Every implementation and review MUST assess compliance with this Constitution. Violations require a
documented exception approved before merge or a remediation plan recorded with the affected work.
The constitution itself is reviewed whenever a change introduces a new enduring engineering policy.

**Version**: 1.0.0 | **Ratified**: 2026-11-21 | **Last Amended**: 2026-11-21
