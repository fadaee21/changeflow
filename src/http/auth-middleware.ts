import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { AppError, roles, type Actor, type Role } from '../domain/types.js';

declare global { namespace Express { interface Request { actor: Actor } } }

export function authMiddleware(secret: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const value = req.header('authorization');
    if (!value?.startsWith('Bearer ')) return next(new AppError(401, 'UNAUTHORIZED', 'A valid Bearer token is required'));
    try {
      const claims = jwt.verify(value.slice(7), secret) as jwt.JwtPayload;
      const userId = typeof claims.sub === 'string' ? claims.sub : undefined;
      const claimRoles = Array.isArray(claims.roles) ? claims.roles.filter((role): role is Role => typeof role === 'string' && (roles as readonly string[]).includes(role)) : [];
      if (!userId) throw new Error('missing subject');
      req.actor = Object.freeze({ userId, roles: Object.freeze(claimRoles) as Role[] });
      next();
    } catch { next(new AppError(401, 'UNAUTHORIZED', 'A valid Bearer token is required')); }
  };
}
