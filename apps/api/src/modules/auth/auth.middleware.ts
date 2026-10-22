import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../../lib/jwt';
import { AppError } from '../../lib/errors';
import type { JwtPayload } from '../../lib/jwt';
import type { UserRole } from '@qvanta/types';

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
    const payload = verifyAccessToken(token);
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
