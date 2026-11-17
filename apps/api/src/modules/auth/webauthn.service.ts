import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import {
  getWebAuthnOrigins,
  getWebAuthnRpId,
  signWebAuthnChallenge,
  verifyWebAuthnChallenge,
} from '../../lib/webauthn';
import { issueTokensForUser, toPublicUser, sendVerificationEmailForUser } from './auth.service';
import type {
  PendingVerification,
  UserWithTokens,
} from './auth.service';

const RP_NAME = 'QVANTA';
const CREDENTIAL_FAILURE_MESSAGE =
  'Face or fingerprint verification failed. Please try again or sign in with your password.';

const transportsOf = (value: string[]): AuthenticatorTransportFuture[] =>
  value as AuthenticatorTransportFuture[];

export interface PasskeyRegistrationStart {
  options: PublicKeyCredentialCreationOptionsJSON;
  challengeToken: string;
}

export interface PasskeyLoginStart {
  options: PublicKeyCredentialRequestOptionsJSON;
  challengeToken: string;
}

/**
 * Step 1 of passkey sign-up. Creates the account shell (no password) for a new
 * email and returns the WebAuthn creation options the browser needs to invoke
 * Face ID / fingerprint.
 *
 * Accounts that already own a credential must not be reachable from here: an
 * email alone is not proof of ownership, so enrollment for those accounts is
 * refused rather than handing out a new passkey.
 */
export async function startPasskeyRegistration(email: string): Promise<PasskeyRegistrationStart> {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    const ownedCredentials = await prisma.webAuthnCredential.count({
      where: { userId: existing.id },
    });
    if (existing.passwordHash || existing.googleId || ownedCredentials > 0) {
      throw AppError.conflict(
        'An account already exists for this email. Sign in with your password to use it.'
      );
    }
  }

  const user =
    existing ?? (await prisma.user.create({ data: { email } }));

  const credentials = await prisma.webAuthnCredential.findMany({
    where: { userId: user.id },
    select: { credentialId: true, transports: true },
  });

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getWebAuthnRpId(),
    userName: user.email,
    userDisplayName: user.email,
    userID: new TextEncoder().encode(user.id),
    attestationType: 'none',
    excludeCredentials: credentials.map((credential) => ({
      id: credential.credentialId,
      transports: transportsOf(credential.transports),
    })),
    // `residentKey: required` makes the credential a true passkey, which is what
    // allows the usernameless sign-in flow below. `authenticatorAttachment:
    // 'platform'` pins it to the device's built-in biometrics (Face ID, Touch
    // ID, Windows Hello, Android fingerprint), so signing in always asks for a
    // face or fingerprint rather than a roaming security key.
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'required',
      userVerification: 'required',
    },
  });

  return {
    options,
    challengeToken: signWebAuthnChallenge({
      challenge: options.challenge,
      type: 'registration',
      userId: user.id,
    }),
  };
}

/**
 * Step 2 of passkey sign-up. Stores the credential and then follows the same
 * email-verification gate as the password flow: a passkey proves this device,
 * not the mailbox, so a fresh account only gets a session once its email is
 * confirmed.
 */
export async function finishPasskeyRegistration(
  challengeToken: string,
  response: RegistrationResponseJSON
): Promise<UserWithTokens | PendingVerification> {
  const challenge = verifyWebAuthnChallenge(challengeToken, 'registration');
  if (!challenge.userId) {
    throw AppError.unauthorized('This biometric sign-up request is not valid. Please try again.');
  }

  let verified;
  try {
    verified = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: getWebAuthnOrigins(),
      expectedRPID: getWebAuthnRpId(),
      requireUserVerification: true,
    });
  } catch (err) {
    logger.warn(
      `Passkey registration rejected: ${err instanceof Error ? err.message : String(err)}`
    );
    throw AppError.unauthorized(CREDENTIAL_FAILURE_MESSAGE);
  }

  if (!verified.verified) {
    throw AppError.unauthorized(CREDENTIAL_FAILURE_MESSAGE);
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verified.registrationInfo;

  try {
    await prisma.webAuthnCredential.create({
      data: {
        userId: challenge.userId,
        credentialId: credential.id,
        publicKey: isoBase64URL.fromBuffer(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports ?? [],
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
      },
    });
  } catch {
    throw AppError.conflict('This passkey is already registered. Try signing in instead.');
  }

  const user = await prisma.user.findUnique({ where: { id: challenge.userId } });
  if (!user) {
    throw AppError.unauthorized('Account not found. Please try again.');
  }

  logger.info(`Passkey registered for user: ${user.id}`);

  if (!user.emailVerified) {
    return {
      user: toPublicUser(user),
      emailSent: await sendVerificationEmailForUser(user),
    };
  }

  const tokens = await issueTokensForUser(user);
  return { user: toPublicUser(user), tokens };
}

/**
 * Step 1 of passkey sign-in. No email is requested: the challenge is issued for
 * discoverable credentials, so the browser can surface the Face ID / fingerprint
 * prompt on its own.
 */
export async function startPasskeyLogin(): Promise<PasskeyLoginStart> {
  const options = await generateAuthenticationOptions({
    rpID: getWebAuthnRpId(),
    userVerification: 'required',
  });

  return {
    options,
    challengeToken: signWebAuthnChallenge({
      challenge: options.challenge,
      type: 'authentication',
    }),
  };
}

/**
 * Step 2 of passkey sign-in. The credential id in the response selects the
 * stored public key; the authenticator's signature is verified against it and
 * the signature counter is advanced to block replayed assertions.
 */
export async function finishPasskeyLogin(
  challengeToken: string,
  response: AuthenticationResponseJSON
): Promise<UserWithTokens> {
  const challenge = verifyWebAuthnChallenge(challengeToken, 'authentication');

  const stored = await prisma.webAuthnCredential.findUnique({
    where: { credentialId: response.id },
  });
  if (!stored) {
    throw AppError.unauthorized('No passkey is registered for this device. Sign in with your password.');
  }

  let verified;
  try {
    verified = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: getWebAuthnOrigins(),
      expectedRPID: getWebAuthnRpId(),
      requireUserVerification: true,
      credential: {
        id: stored.credentialId,
        publicKey: isoBase64URL.toBuffer(stored.publicKey),
        counter: stored.counter,
        transports: transportsOf(stored.transports),
      },
    });
  } catch (err) {
    logger.warn(`Passkey login rejected: ${err instanceof Error ? err.message : String(err)}`);
    throw AppError.unauthorized(CREDENTIAL_FAILURE_MESSAGE);
  }

  if (!verified.verified) {
    throw AppError.unauthorized(CREDENTIAL_FAILURE_MESSAGE);
  }

  await prisma.webAuthnCredential.update({
    where: { id: stored.id },
    data: {
      counter: verified.authenticationInfo.newCounter,
      backedUp: verified.authenticationInfo.credentialBackedUp,
      lastUsedAt: new Date(),
    },
  });

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user) {
    throw AppError.unauthorized('Account not found. Please try again.');
  }

  // Same gate as password sign-in: an unconfirmed mailbox cannot start a session.
  if (!user.emailVerified) {
    throw new AppError(
      'EMAIL_NOT_VERIFIED',
      'Verify your email address before signing in. We can send you a new confirmation link.',
      403
    );
  }

  const tokens = await issueTokensForUser(user);
  logger.info(`Passkey login for user: ${user.id}`);

  return { user: toPublicUser(user), tokens };
}
