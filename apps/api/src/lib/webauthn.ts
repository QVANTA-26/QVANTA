import jwt from 'jsonwebtoken';
import { AppError } from './errors';

/**
 * WebAuthn (passkey) configuration and challenge handling.
 *
 * Challenges are carried in a short-lived signed token instead of server side
 * storage. That keeps the biometric flow at the same asymptotic cost as the
 * password flow: no extra datastore round trip, no extra table, and every
 * verification stays O(1). Replay is bounded by the 5 minute TTL and by the
 * authenticator signature counter that `verifyAuthenticationResponse` enforces.
 */

export type WebAuthnChallengeType = 'registration' | 'authentication';

export interface WebAuthnChallenge {
  challenge: string;
  type: WebAuthnChallengeType;
  userId?: string;
}

const CHALLENGE_TTL_SECONDS = 5 * 60;

const challengeSecret = (): string =>
  process.env.WEBAUTHN_CHALLENGE_SECRET ?? process.env.JWT_SECRET ?? 'qvanta-webauthn-dev-secret';

/**
 * Relying party id: the domain a passkey is bound to. Derived from WEB_ORIGIN so
 * a single configuration value keeps the API and the browser in agreement.
 */
export function getWebAuthnRpId(): string {
  const configured = process.env.WEBAUTHN_RP_ID;
  if (configured) {
    return configured;
  }

  try {
    return new URL(process.env.WEB_ORIGIN ?? 'http://localhost:5173').hostname;
  } catch {
    return 'localhost';
  }
}

/**
 * Origins the ceremony is allowed to have happened on. The configured web
 * origin is always trusted; localhost development ports are added outside
 * production so the feature is testable without extra configuration.
 */
export function getWebAuthnOrigins(): string[] {
  const origins = new Set<string>();

  const configured = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
  try {
    origins.add(new URL(configured).origin);
  } catch {
    origins.add(configured);
  }

  if (process.env.NODE_ENV !== 'production') {
    for (const port of ['5173', '5174', '5175', '5176', '8080']) {
      origins.add(`http://localhost:${port}`);
      origins.add(`http://127.0.0.1:${port}`);
    }
  }

  return [...origins];
}

export function signWebAuthnChallenge(challenge: WebAuthnChallenge): string {
  return jwt.sign(challenge, challengeSecret(), { expiresIn: CHALLENGE_TTL_SECONDS });
}

export function verifyWebAuthnChallenge(
  token: string,
  expectedType: WebAuthnChallengeType
): WebAuthnChallenge {
  let decoded: WebAuthnChallenge;
  try {
    decoded = jwt.verify(token, challengeSecret()) as WebAuthnChallenge;
  } catch {
    throw AppError.unauthorized('This biometric request expired. Please try again.');
  }

  if (decoded.type !== expectedType || typeof decoded.challenge !== 'string') {
    throw AppError.unauthorized('This biometric request is not valid. Please try again.');
  }

  return decoded;
}
