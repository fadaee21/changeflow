import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { json, startApp, stopApp, token } from './helpers.js';

let server: Server; let baseUrl: string;
const requester = token('requester', ['Requester']);
const valid = { title: 'Export', description: 'CSV output', reason: 'Reporting' };
beforeEach(async () => ({ server, baseUrl } = await startApp()));
afterEach(async () => stopApp(server));
const create = async () => { const response = await json(baseUrl, '/change-requests', requester, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(valid) }); return { response, request: await response.json() as { id: string; version: number; status: string } }; };

describe('Change Request routes', () => {
  it('creates, edits, submits, and lists a request', async () => {
    const { response, request } = await create();
    expect(response.status).toBe(201); expect(request.status).toBe('Draft');
    const edited = await json(baseUrl, `/change-requests/${request.id}`, requester, { method: 'PUT', headers: { 'content-type': 'application/json', 'if-match': String(request.version) }, body: JSON.stringify({ ...valid, title: 'Updated' }) });
    const editedBody = await edited.json() as { version: number };
    const submitted = await json(baseUrl, `/change-requests/${request.id}/submit`, requester, { method: 'POST', headers: { 'if-match': String(editedBody.version) } });
    expect((await submitted.json() as { status: string }).status).toBe('PendingReview');
    expect((await json(baseUrl, '/change-requests', requester)).status).toBe(200);
  });
  it('rejects missing fields and a stale mutation without overwriting later stored data', async () => {
    const invalid = await json(baseUrl, '/change-requests', requester, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: '' }) });
    expect(invalid.status).toBe(400);
    const { request } = await create();
    const laterValues = { ...valid, title: 'Later stored title' };
    const first = await json(baseUrl, `/change-requests/${request.id}`, requester, { method: 'PUT', headers: { 'content-type': 'application/json', 'if-match': '1' }, body: JSON.stringify(laterValues) });
    expect(first.status).toBe(200);
    const stale = await json(baseUrl, `/change-requests/${request.id}`, requester, { method: 'PUT', headers: { 'content-type': 'application/json', 'if-match': '1' }, body: JSON.stringify({ ...valid, title: 'Stale overwrite' }) });
    expect(stale.status).toBe(409); expect((await stale.json() as { error: { code: string } }).error.code).toBe('STALE_VERSION');
    const stored = await json(baseUrl, `/change-requests/${request.id}`, requester);
    expect(await stored.json()).toMatchObject({ title: 'Later stored title', version: 2 });
  });

  it('deletes an owner Draft but rejects non-owner and non-Draft DELETE attempts', async () => {
    const otherRequester = token('other-requester', ['Requester']);
    const { request } = await create();
    expect((await json(baseUrl, `/change-requests/${request.id}`, otherRequester, { method: 'DELETE', headers: { 'if-match': String(request.version) } })).status).toBe(404);
    expect((await json(baseUrl, `/change-requests/${request.id}`, requester, { method: 'DELETE', headers: { 'if-match': String(request.version) } })).status).toBe(204);
    expect((await json(baseUrl, `/change-requests/${request.id}`, requester)).status).toBe(404);

    const pending = await create();
    const submitted = await json(baseUrl, `/change-requests/${pending.request.id}/submit`, requester, { method: 'POST', headers: { 'if-match': String(pending.request.version) } });
    const pendingBody = await submitted.json() as { version: number };
    expect((await json(baseUrl, `/change-requests/${pending.request.id}`, requester, { method: 'DELETE', headers: { 'if-match': String(pendingBody.version) } })).status).toBe(409);
    expect(await (await json(baseUrl, `/change-requests/${pending.request.id}`, requester)).json()).toMatchObject({ status: 'PendingReview' });
  });
});
