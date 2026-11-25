import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../lib/jwt';
import { AppError } from '../../lib/errors';
import type { JwtPayload } from '../../lib/jwt';
import type { UserRole } from '@qvanta/types';

/** Matches the local dev fallback token set by the web app (Login.tsx). */
const DEV_TOKEN = 'dev-token';

/**
 * The web app's local dev fallback stores a literal `dev-token` instead of a
 * signed JWT. Accept it outside production so Paper Lab, simulations, etc.
 * work against a locally running API without a database-backed login.
 */
function resolveDevPayload(token: string): JwtPayload | null {
  if (process.env.NODE_ENV === 'production' || token !== DEV_TOKEN) {
    return null;
  }
  return {
    id: 'dev-local',
    email: 'dev@qvanta.ai',
    role: 'admin',
    tier: 'free',
  };
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return header.slice(7);
  }
  return null;
}

export function JwtAuthGuard(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const token = extractBearerToken(req);

  if (!token) {
    return next(AppError.unauthorized('No authentication token provided'));
  }

  try {
    const payload = resolveDevPayload(token) ?? verifyAccessToken(token);
    (req as AuthRequest).user = payload;
    next();
  } catch (err) {
    next(err);
  }
}

export function RequireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      return next(AppError.unauthorized());
    }
    if (!roles.includes(authReq.user.role)) {
      return next(AppError.forbidden('Insufficient permissions'));
    }
    next();
  };
}
