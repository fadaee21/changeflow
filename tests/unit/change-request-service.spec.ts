import { afterEach, describe, expect, it } from 'vitest';
import { ChangeRequestService } from '../../src/application/change-request-service.js';
import { AppError, type Actor } from '../../src/domain/types.js';
import { SqliteChangeRequestRepository } from '../../src/repository/sqlite-change-request-repository.js';

const requester: Actor = { userId: 'requester-1', roles: ['Requester'] };
const reviewer: Actor = { userId: 'reviewer-1', roles: ['Reviewer'] };
const dualRole: Actor = { userId: 'requester-1', roles: ['Requester', 'Reviewer'] };
const valid = { title: 'Export data', description: 'Add CSV export', reason: 'Reporting' };
const repositories: SqliteChangeRequestRepository[] = [];
const makeService = () => { const repository = new SqliteChangeRequestRepository(); repositories.push(repository); return new ChangeRequestService(repository); };
const errorCode = async (promise: Promise<unknown>) => expect(promise).rejects.toMatchObject({ code: expect.any(String) } as Partial<AppError>);
afterEach(() => { repositories.splice(0).forEach((repository) => repository.close()); });

describe('ChangeRequestService', () => {
  it('creates an owned Draft and validates required fields', () => {
    const service = makeService();
    const created = service.create(requester, valid);
    expect(created).toMatchObject({ requesterId: requester.userId, status: 'Draft', version: 1, ...valid });
    expect(() => service.create(requester, { ...valid, title: '  ' })).toThrowError(/title/i);
  });

  it('allows the owner to edit and submit a valid Draft, but permits duplicates', () => {
    const service = makeService();
    const first = service.create(requester, valid);
    const duplicate = service.create(requester, valid);
    expect(duplicate.id).not.toBe(first.id);
    const edited = service.edit(requester, first.id, { ...valid, title: 'Updated' }, first.version);
    const submitted = service.submit(requester, edited.id, edited.version);
    expect(submitted.status).toBe('PendingReview');
  });

  it('rejects non-owner edits, invalid submissions, and stale mutations', async () => {
    const service = makeService();
    const request = service.create(requester, valid);
    await errorCode(Promise.resolve().then(() => service.edit({ userId: 'other', roles: ['Requester'] }, request.id, valid, request.version)));
    await errorCode(Promise.resolve().then(() => service.submit(requester, request.id, request.version + 1)));
  });

  it('deletes only an owner Draft', async () => {
    const service = makeService();
    const request = service.create(requester, valid);
    await errorCode(Promise.resolve().then(() => service.delete({ userId: 'other', roles: ['Requester'] }, request.id, request.version)));
    service.delete(requester, request.id, request.version);
    expect(service.list(requester)).toEqual([]);
  });

  it('applies requester, reviewer, and dual-role listing visibility', () => {
    const service = makeService();
    const own = service.create(requester, valid);
    const other = service.create({ userId: 'other', roles: ['Requester'] }, { ...valid, title: 'Other' });
    service.submit({ userId: 'other', roles: ['Requester'] }, other.id, other.version);
    expect(service.list(requester).map((item) => item.id)).toEqual([own.id]);
    expect(service.list(reviewer).map((item) => item.id)).toEqual([other.id]);
    expect(service.list(dualRole).map((item) => item.id).sort()).toEqual([own.id, other.id].sort());
  });

  it('requires the Requester role for an owner to view a non-pending request', async () => {
    const service = makeService();
    const draft = service.create(requester, valid);
    const reviewerOnlyOwner: Actor = { userId: requester.userId, roles: ['Reviewer'] };
    await expect(Promise.resolve().then(() => service.get(reviewerOnlyOwner, draft.id)))
      .rejects.toMatchObject({ status: 404, code: 'UNAVAILABLE' } as Partial<AppError>);
    const pending = service.submit(requester, draft.id, draft.version);
    expect(service.get(reviewerOnlyOwner, pending.id)).toMatchObject({ id: pending.id, status: 'PendingReview' });
  });

  it('allows independent approval and forbids self-approval and Approved edits', async () => {
    const service = makeService();
    const draft = service.create(requester, valid);
    const pending = service.submit(requester, draft.id, draft.version);
    await errorCode(Promise.resolve().then(() => service.approve(dualRole, pending.id, pending.version)));
    const approved = service.approve(reviewer, pending.id, pending.version);
    expect(approved.status).toBe('Approved');
    await errorCode(Promise.resolve().then(() => service.edit(requester, approved.id, valid, approved.version)));
  });

  it('requires a comment for requested changes, retains decisions, and supports resubmission', async () => {
    const service = makeService();
    const draft = service.create(requester, valid);
    const pending = service.submit(requester, draft.id, draft.version);
    await errorCode(Promise.resolve().then(() => service.requestChanges(reviewer, pending.id, pending.version, ' ')));
    const returned = service.requestChanges(reviewer, pending.id, pending.version, 'Please add scope');
    const detail = service.get(requester, returned.id);
    expect(detail.reviewDecisions).toMatchObject([{ action: 'CHANGES_REQUESTED', comment: 'Please add scope' }]);
    const edited = service.edit(requester, returned.id, valid, returned.version);
    expect(service.submit(requester, edited.id, edited.version).status).toBe('PendingReview');
  });
});
