import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { json, startApp, stopApp, token } from './helpers.js';

let server: Server; let baseUrl: string;
const valid = { title: 'Export', description: 'CSV output', reason: 'Reporting' };
beforeEach(async () => ({ server, baseUrl } = await startApp()));
afterEach(async () => stopApp(server));
describe('authentication and visibility', () => {
  it('rejects missing or invalid tokens', async () => {
    expect((await fetch(`${baseUrl}/change-requests`)).status).toBe(401);
    expect((await fetch(`${baseUrl}/change-requests`, { headers: { authorization: 'Bearer invalid' } })).status).toBe(401);
  });
  it('returns a generic 404 without exposing inaccessible requests', async () => {
    const owner = token('owner', ['Requester']); const other = token('other', ['Requester']);
    const created = await json(baseUrl, '/change-requests', owner, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(valid) });
    const request = await created.json() as { id: string; version: number };
    expect((await json(baseUrl, `/change-requests/${request.id}`, other)).status).toBe(404);
  });

  it('requires the Requester role for an owner to view a Draft, while preserving Reviewer access to PendingReview', async () => {
    const requesterToken = token('owner', ['Requester']);
    const reviewerOnlyToken = token('owner', ['Reviewer']);
    const created = await json(baseUrl, '/change-requests', requesterToken, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(valid) });
    const draft = await created.json() as { id: string; version: number };
    expect((await json(baseUrl, `/change-requests/${draft.id}`, reviewerOnlyToken)).status).toBe(404);
    const submitted = await json(baseUrl, `/change-requests/${draft.id}/submit`, requesterToken, { method: 'POST', headers: { 'if-match': String(draft.version) } });
    expect(submitted.status).toBe(200);
    expect((await json(baseUrl, `/change-requests/${draft.id}`, reviewerOnlyToken)).status).toBe(200);
  });

  it('returns the deduplicated union of a dual-role actor’s own requests and another Requester’s pending request', async () => {
    const dual = token('dual', ['Requester', 'Reviewer']);
    const other = token('other', ['Requester']);
    const own = await json(baseUrl, '/change-requests', dual, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(valid) });
    const ownRequest = await own.json() as { id: string };
    const otherCreated = await json(baseUrl, '/change-requests', other, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...valid, title: 'Other request' }) });
    const otherRequest = await otherCreated.json() as { id: string; version: number };
    await json(baseUrl, `/change-requests/${otherRequest.id}/submit`, other, { method: 'POST', headers: { 'if-match': String(otherRequest.version) } });
    const listed = await json(baseUrl, '/change-requests', dual);
    const requests = await listed.json() as Array<{ id: string }>;
    expect(requests.map((item) => item.id).sort()).toEqual([ownRequest.id, otherRequest.id].sort());
    expect(new Set(requests.map((item) => item.id)).size).toBe(2);
  });
});
