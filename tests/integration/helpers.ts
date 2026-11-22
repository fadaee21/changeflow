import type { Server } from 'node:http';
import jwt from 'jsonwebtoken';
import { createApp } from '../../src/http/app.js';

export const secret = 'integration-secret';
export const token = (sub: string, roles: string[]) => jwt.sign({ roles }, secret, { subject: sub, expiresIn: '1h' });
export async function startApp(): Promise<{ server: Server; baseUrl: string }> {
  const server = createApp({ jwtSecret: secret }).listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No TCP address');
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}
export const stopApp = (server: Server) => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
export const json = async (baseUrl: string, path: string, tokenValue: string, init: RequestInit = {}) => fetch(`${baseUrl}${path}`, { ...init, headers: { authorization: `Bearer ${tokenValue}`, ...(init.headers ?? {}) } });
