import type Database from 'better-sqlite3';

export function migrate(db: Database.Database): void {
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS change_requests (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      reason TEXT NOT NULL,
      requester_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('Draft','PendingReview','ChangesRequested','Approved')),
      version INTEGER NOT NULL CHECK (version > 0),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS change_requests_requester_idx ON change_requests(requester_id);
    CREATE INDEX IF NOT EXISTS change_requests_status_idx ON change_requests(status);
    CREATE TABLE IF NOT EXISTS review_decisions (
      id TEXT PRIMARY KEY,
      change_request_id TEXT NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
      reviewer_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('APPROVED','CHANGES_REQUESTED')),
      comment TEXT,
      created_at TEXT NOT NULL,
      CHECK ((action = 'APPROVED' AND comment IS NULL) OR (action = 'CHANGES_REQUESTED' AND length(trim(comment)) > 0))
    );
    CREATE INDEX IF NOT EXISTS review_decisions_request_idx ON review_decisions(change_request_id);
  `);
}
