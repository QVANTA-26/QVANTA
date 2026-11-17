import jwt from 'jsonwebtoken';
import { AppError } from './errors';

/**
 * Email verification links, following the same pattern as the WebAuthn
 * challenges: the proof of ownership travels in a short-lived signed token
 * rather than a database row, so verifying stays O(1) with no extra table.
 */

const TTL_SECONDS = 24 * 60 * 60;

export interface EmailVerificationClaims {
  purpose: 'email-verification';
  userId: string;
  email: string;
}

const verificationSecret = (): string =>
  process.env.EMAIL_VERIFICATION_SECRET ??
  process.env.JWT_SECRET ??
  'qvanta-email-verification-dev-secret';

export function signEmailVerificationToken(input: { userId: string; email: string }): string {
  const claims: EmailVerificationClaims = { purpose: 'email-verification', ...input };
  return jwt.sign(claims, verificationSecret(), { expiresIn: TTL_SECONDS });
}

export function verifyEmailVerificationToken(token: string): EmailVerificationClaims {
  let decoded: EmailVerificationClaims;
  try {
    decoded = jwt.verify(token, verificationSecret()) as EmailVerificationClaims;
  } catch {
    throw AppError.badRequest('This verification link is invalid or has expired. Request a new one.');
  }

  if (decoded.purpose !== 'email-verification' || !decoded.userId || !decoded.email) {
    throw AppError.badRequest('This verification link is invalid. Request a new one.');
  }

  return decoded;
}

/** Points back at the deployed frontend so the link works from any mailbox. */
export function buildEmailVerificationUrl(token: string): string {
  const origin = (process.env.WEB_ORIGIN ?? 'http://localhost:5173').replace(/\/+$/, '');
  return `${origin}/verify-email?token=${encodeURIComponent(token)}`;
}
