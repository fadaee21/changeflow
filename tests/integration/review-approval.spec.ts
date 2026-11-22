import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { json, startApp, stopApp, token } from './helpers.js';
let server: Server; let baseUrl: string;
const valid = { title: 'Export', description: 'CSV output', reason: 'Reporting' };
beforeEach(async () => ({ server, baseUrl } = await startApp())); afterEach(async () => stopApp(server));
it('approves only with an independent Reviewer', async () => {
  const owner = token('owner', ['Requester', 'Reviewer']); const reviewer = token('reviewer', ['Reviewer']);
  const created = await json(baseUrl, '/change-requests', owner, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(valid) });
  const draft = await created.json() as { id: string; version: number };
  const submitted = await json(baseUrl, `/change-requests/${draft.id}/submit`, owner, { method: 'POST', headers: { 'if-match': String(draft.version) } }); const pending = await submitted.json() as { version: number };
  expect((await json(baseUrl, `/change-requests/${draft.id}/approve`, owner, { method: 'POST', headers: { 'if-match': String(pending.version) } })).status).toBe(403);
  const approved = await json(baseUrl, `/change-requests/${draft.id}/approve`, reviewer, { method: 'POST', headers: { 'if-match': String(pending.version) } });
  expect((await approved.json() as { status: string }).status).toBe('Approved');
});
