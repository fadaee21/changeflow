# Quickstart Validation Guide

## Execution Record — 2026-11-22

| Command | Exit status | Result |
|---|---:|---|
| `npm run typecheck` | 0 | TypeScript validation passed. |
| `npm test` | 0 | 5 test files and 18 tests passed. |
| `npm run build` | 0 | TypeScript production build passed. |

The commands above are the only automated checks claimed as executed by this record.

## Prerequisites

- Supported Node.js LTS and installed project dependencies.
- Local SQLite database configuration.
- JWT signing material for local use; tests create signed tokens for known actors.

## Automated Validation

1. Run the implementation-defined type-check command.
2. Run the Vitest unit suite for application services.
3. Run the Vitest integration suite for Express, JWT Bearer, and temporary SQLite.
4. Report each exact command and exit status.

Expected coverage is the six groups in [plan.md](plan.md#test-strategy). See
[data-model.md](data-model.md) and [contracts/openapi.yaml](contracts/openapi.yaml).

## Manual Acceptance

SC-004 and SC-005 are **not executed**. They require representative users completing timed,
observed tasks; automated tests do not satisfy them.

| Criterion | Status | Evidence to record before claiming success |
|---|---|---|
| SC-004: Requester creates and submits in under 3 minutes | Not executed | Date, participant count, task, completion, assistance, elapsed time, exclusions, and calculated percentage. |
| SC-005: Reviewer decides in under 2 minutes | Not executed | Date, participant count, task, completion, assistance, elapsed time, exclusions, and calculated percentage. |
