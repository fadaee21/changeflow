# Research: ChangeFlow Request Review API

## Express and TypeScript

**Decision**: Keep Express routes thin and place all authorization and lifecycle rules in application
services.

**Rationale**: This directly enforces the Constitution and enables independent business-rule tests.

**Alternatives considered**: Controllers containing authorization or state logic were rejected.

## JWT Bearer Authentication

**Decision**: Verify signed Bearer tokens before creating immutable actor context with user ID and
roles.

**Rationale**: The scope needs trusted identity/roles but excludes login and user management.

**Alternatives considered**: Unverified decoded claims and authentication endpoints were rejected.

## SQLite and Concurrency

**Decision**: Use `version INTEGER NOT NULL`, beginning at 1, with parameterized conditional writes
matching ID, version, and expected state; increment the version atomically.

**Rationale**: SQLite is simple locally and conditional writes prevent stale overwrites without locks.

**Alternatives considered**: Pessimistic locking, an ORM, event sourcing, and extra services were
rejected as unnecessary.

## Review Decisions

**Decision**: Persist review decisions separately and atomically with their corresponding transition.

**Rationale**: This retains required review outcomes and request-changes comments without complicating
the request record.

**Alternatives considered**: A single overwritten review field was rejected because it loses history.

## Vitest

**Decision**: Use Vitest service tests plus Express integration tests using temporary SQLite and signed
test tokens.

**Rationale**: This protects critical rules both independently and through the HTTP path.

**Alternatives considered**: HTTP-only tests and mocked JWT integration were rejected.
