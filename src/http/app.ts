import express from 'express';
import { ChangeRequestService } from '../application/change-request-service.js';
import type { ChangeRequestRepository } from '../repository/change-request-repository.js';
import { SqliteChangeRequestRepository } from '../repository/sqlite-change-request-repository.js';
import { authMiddleware } from './auth-middleware.js';
import { createChangeRequestRouter } from './change-request-routes.js';
import { errorMiddleware } from './error-middleware.js';

export function createApp(options: { jwtSecret?: string; repository?: ChangeRequestRepository } = {}) {
  const app = express();
  const repository = options.repository ?? new SqliteChangeRequestRepository();
  app.use(express.json());
  app.use(authMiddleware(options.jwtSecret ?? process.env.JWT_SECRET ?? 'development-secret'));
  app.use(createChangeRequestRouter(new ChangeRequestService(repository)));
  app.use(errorMiddleware);
  return app;
}
