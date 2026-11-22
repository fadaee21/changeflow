import { Router, type RequestHandler } from 'express';
import { ChangeRequestService } from '../application/change-request-service.js';
import { AppError } from '../domain/types.js';

const version = (value: string | undefined): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new AppError(400, 'VALIDATION_ERROR', 'If-Match must be a positive integer');
  return parsed;
};
const id = (value: string | string[]): string => {
  if (typeof value !== 'string') throw new AppError(400, 'VALIDATION_ERROR', 'A valid request ID is required');
  return value;
};
const body = (value: unknown): Record<string, string> => value && typeof value === 'object' ? value as Record<string, string> : {};
const run = (handler: RequestHandler): RequestHandler => (req, res, next) => { try { handler(req, res, next); } catch (error) { next(error); } };

export function createChangeRequestRouter(service: ChangeRequestService): Router {
  const router = Router();
  router.get('/change-requests', run((req, res) => { res.json(service.list(req.actor)); }));
  router.post('/change-requests', run((req, res) => { res.status(201).json(service.create(req.actor, body(req.body) as { title: string; description: string; reason: string })); }));
  router.get('/change-requests/:id', run((req, res) => { res.json(service.get(req.actor, id(req.params.id))); }));
  router.put('/change-requests/:id', run((req, res) => { res.json(service.edit(req.actor, id(req.params.id), body(req.body) as { title: string; description: string; reason: string }, version(req.header('if-match')))); }));
  router.delete('/change-requests/:id', run((req, res) => { service.delete(req.actor, id(req.params.id), version(req.header('if-match'))); res.status(204).end(); }));
  router.post('/change-requests/:id/submit', run((req, res) => { res.json(service.submit(req.actor, id(req.params.id), version(req.header('if-match')))); }));
  router.post('/change-requests/:id/approve', run((req, res) => { res.json(service.approve(req.actor, id(req.params.id), version(req.header('if-match')))); }));
  router.post('/change-requests/:id/request-changes', run((req, res) => { res.json(service.requestChanges(req.actor, id(req.params.id), version(req.header('if-match')), body(req.body).comment)); }));
  return router;
}
