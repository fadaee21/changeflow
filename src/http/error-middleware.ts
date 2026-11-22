import type { ErrorRequestHandler } from 'express';
import { AppError } from '../domain/types.js';

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) return void res.status(error.status).json({ error: { code: error.code, message: error.message, details: {} } });
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', details: {} } });
};
