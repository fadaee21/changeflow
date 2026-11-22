import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import type { Actor, ChangeRequest, ChangeStatus, CreateCommand, ReviewDecision } from '../domain/types.js';
import { migrate } from './migrations.js';
import type { ChangeRequestRepository, ConditionalUpdate } from './change-request-repository.js';

type RequestRow = { id: string; title: string; description: string; reason: string; requester_id: string; status: ChangeStatus; version: number; created_at: string; updated_at: string };
type DecisionRow = { id: string; change_request_id: string; reviewer_id: string; action: 'APPROVED' | 'CHANGES_REQUESTED'; comment: string | null; created_at: string };
const toRequest = (r: RequestRow): ChangeRequest => ({ id: r.id, title: r.title, description: r.description, reason: r.reason, requesterId: r.requester_id, status: r.status, version: r.version, createdAt: r.created_at, updatedAt: r.updated_at });
const toDecision = (r: DecisionRow): ReviewDecision => ({ id: r.id, changeRequestId: r.change_request_id, reviewerId: r.reviewer_id, action: r.action, comment: r.comment, createdAt: r.created_at });
const now = () => new Date().toISOString();

export class SqliteChangeRequestRepository implements ChangeRequestRepository {
  public readonly db: Database.Database;
  constructor(filename = ':memory:') { this.db = new Database(filename); migrate(this.db); }
  create(actor: Actor, command: CreateCommand): ChangeRequest {
    const record = { id: randomUUID(), ...command, requesterId: actor.userId, status: 'Draft' as const, version: 1, createdAt: now(), updatedAt: now() };
    this.db.prepare('INSERT INTO change_requests (id,title,description,reason,requester_id,status,version,created_at,updated_at) VALUES (@id,@title,@description,@reason,@requesterId,@status,@version,@createdAt,@updatedAt)').run(record);
    return record;
  }
  findById(id: string): ChangeRequest | undefined { const row = this.db.prepare('SELECT * FROM change_requests WHERE id = ?').get(id) as RequestRow | undefined; return row && toRequest(row); }
  listAccessible(actor: Actor): ChangeRequest[] {
    const reviewer = actor.roles.includes('Reviewer');
    const rows = reviewer
      ? this.db.prepare("SELECT * FROM change_requests WHERE requester_id = ? OR status = 'PendingReview' ORDER BY created_at").all(actor.userId)
      : this.db.prepare('SELECT * FROM change_requests WHERE requester_id = ? ORDER BY created_at').all(actor.userId);
    return (rows as RequestRow[]).map(toRequest);
  }
  listDecisions(id: string): ReviewDecision[] { return (this.db.prepare('SELECT * FROM review_decisions WHERE change_request_id = ? ORDER BY created_at').all(id) as DecisionRow[]).map(toDecision); }
  update(input: ConditionalUpdate): ChangeRequest | undefined {
    const fields = Object.entries(input.fields);
    if (!fields.length) return this.findById(input.id);
    const assignments = fields.map(([key]) => `${key === 'status' ? 'status' : key} = @${key}`).join(', ');
    const parameters: Record<string, unknown> = { id: input.id, expectedVersion: input.expectedVersion, updatedAt: now(), ...input.fields };
    const condition = input.expectedStatus ? ' AND status = @expectedStatus' : '';
    if (input.expectedStatus) parameters.expectedStatus = input.expectedStatus;
    const result = this.db.prepare(`UPDATE change_requests SET ${assignments}, version = version + 1, updated_at = @updatedAt WHERE id = @id AND version = @expectedVersion${condition}`).run(parameters);
    return result.changes ? this.findById(input.id) : undefined;
  }
  delete(id: string, expectedVersion: number, expectedStatus: ChangeStatus): boolean {
    return this.db.prepare('DELETE FROM change_requests WHERE id = ? AND version = ? AND status = ?').run(id, expectedVersion, expectedStatus).changes === 1;
  }
  addDecisionAndTransition(input: { id: string; expectedVersion: number; reviewerId: string; action: 'APPROVED' | 'CHANGES_REQUESTED'; comment: string | null; nextStatus: ChangeStatus }): ChangeRequest | undefined {
    const transaction = this.db.transaction(() => {
      const changed = this.db.prepare("UPDATE change_requests SET status = ?, version = version + 1, updated_at = ? WHERE id = ? AND version = ? AND status = 'PendingReview'").run(input.nextStatus, now(), input.id, input.expectedVersion);
      if (!changed.changes) return undefined;
      this.db.prepare('INSERT INTO review_decisions (id,change_request_id,reviewer_id,action,comment,created_at) VALUES (?,?,?,?,?,?)').run(randomUUID(), input.id, input.reviewerId, input.action, input.comment, now());
      return this.findById(input.id);
    });
    return transaction();
  }
  close(): void { this.db.close(); }
}
