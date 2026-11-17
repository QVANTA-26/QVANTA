import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import {
  generateTokenPair,
  hashToken,
  verifyRefreshToken as verifyRefresh,
} from '../../lib/jwt';
import { logger } from '../../lib/logger';
import {
  buildEmailVerificationUrl,
  signEmailVerificationToken,
  verifyEmailVerificationToken,
} from '../../lib/email-verification';
import { sendEmailVerificationMail } from '../../lib/mailer';
import type { User as PublicUser, UserRole, UserTier } from '@qvanta/types';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserWithTokens {
  user: PublicUser;
  tokens: Tokens;
}

/** Sign-up result: the account exists but cannot sign in until the email is confirmed. */
export interface PendingVerification {
  user: PublicUser;
  /** False when SMTP is not configured, so the UI can tell the operator to look at the logs. */
  emailSent: boolean;
}

/** The user row shape `toPublicUser` needs; `profileImage` is only present when it was included. */
interface UserRow {
  id: string;
  email: string;
  displayName: string | null;
  emailVerified: boolean;
  role: UserRole;
  tier: UserTier;
  usageMonth: string;
  usageSims: number;
  avatarPreset: number;
  stripeCustomerId: string | null;
  createdAt: Date;
  profileImage?: { updatedAt: Date } | null;
}

/**
 * Maps a persisted user row to the shape every auth response returns. The
 * password hash and Google id never leave the server; `avatarUrl` is a path the
 * web client resolves against the API base URL and uses as a cache-buster.
 */
export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName ?? undefined,
    emailVerified: user.emailVerified,
    role: user.role,
    tier: user.tier,
    usageMonth: user.usageMonth,
    usageSims: user.usageSims,
    avatarPreset: user.avatarPreset,
    avatarUrl: user.profileImage
      ? `/users/${user.id}/avatar?v=${user.profileImage.updatedAt.getTime()}`
      : undefined,
    createdAt: user.createdAt.toISOString(),
    stripeCustomerId: user.stripeCustomerId ?? undefined,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateTokenPairForUser(user: {
  id: string;
  email: string;
  role: UserRole;
  tier: UserTier;
}): Tokens {
  return generateTokenPair({
    id: user.id,
    email: user.email,
    role: user.role,
    tier: user.tier,
  });
}

export async function issueTokensForUser(user: {
  id: string;
  email: string;
  role: UserRole;
  tier: UserTier;
}): Promise<Tokens> {
  const tokens = generateTokenPairForUser(user);
  await saveRefreshToken(user.id, tokens.refreshToken);
  return tokens;
}

/** Sends (or re-sends) the confirmation link. Returns false when SMTP is unset. */
export async function sendVerificationEmailForUser(user: {
  id: string;
  email: string;
  displayName?: string | null;
}): Promise<boolean> {
  const token = signEmailVerificationToken({ userId: user.id, email: user.email });

  try {
    return await sendEmailVerificationMail({
      to: user.email,
      displayName: user.displayName,
      verifyUrl: buildEmailVerificationUrl(token),
    });
  } catch (err) {
    logger.error(
      `Failed to send verification email to ${user.email}: ${err instanceof Error ? err.message : String(err)}`
    );
    return false;
  }
}

export async function registerUser(input: {
  email: string;
  password: string;
}): Promise<PendingVerification> {
  const emailLower = input.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: emailLower } });

  let user;
  if (existing) {
    // A passkey sign-up that was cancelled mid-ceremony leaves an unverified
    // shell with no credentials; reuse it instead of dead-ending the address.
    const isAbandonedShell =
      !existing.emailVerified && !existing.passwordHash && !existing.googleId;

    if (!isAbandonedShell) {
      throw AppError.conflict('Email already registered. Sign in instead.');
    }

    user = await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash: await hashPassword(input.password) },
    });
  } else {
    user = await prisma.user.create({
      data: {
        email: emailLower,
        passwordHash: await hashPassword(input.password),
      },
    });
  }

  const emailSent = await sendVerificationEmailForUser(user);
  logger.info(`User registered, verification pending: ${user.id}`);

  return { user: toPublicUser(user), emailSent };
}

/**
 * Confirms ownership of the mailbox and signs the learner straight in, so the
 * verification click is the only extra step after sign-up.
 */
export async function verifyEmailAndSignIn(token: string): Promise<UserWithTokens> {
  const claims = verifyEmailVerificationToken(token);

  const user = await prisma.user.findUnique({ where: { id: claims.userId } });
  if (!user) {
    throw AppError.notFound('This account no longer exists.');
  }
  if (user.email !== claims.email) {
    throw AppError.badRequest('This verification link does not match the account. Request a new one.');
  }

  const verified = user.emailVerified
    ? user
    : await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });

  const tokens = await issueTokensForUser(verified);
  logger.info(`Email verified for user: ${verified.id}`);

  return { user: toPublicUser(verified), tokens };
}

/**
 * Resends the confirmation link. The response never reveals whether the address
 * is registered, so this cannot be used to enumerate accounts.
 */
export async function resendVerificationEmail(email: string): Promise<{ emailSent: boolean }> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  if (!user || user.emailVerified) {
    return { emailSent: false };
  }

  return { emailSent: await sendVerificationEmailForUser(user) };
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<UserWithTokens> {
  const emailLower = input.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: emailLower },
    include: { profileImage: { select: { updatedAt: true } } },
  });

  if (!user || !user.passwordHash) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) {
    throw AppError.unauthorized('Invalid email or password');
  }

  // Checked after the password so an unconfirmed address is never disclosed to
  // someone who does not already hold the credentials.
  if (!user.emailVerified) {
    throw new AppError(
      'EMAIL_NOT_VERIFIED',
      'Verify your email address before signing in. We can send you a new confirmation link.',
      403
    );
  }

  const tokens = await issueTokensForUser(user);

  logger.info(`User logged in: ${user.id}`);

  return { user: toPublicUser(user), tokens };
}

export async function refreshTokens(refreshToken: string): Promise<Tokens> {
  const payload = verifyRefresh(refreshToken);
  const tokenHash = hashToken(refreshToken);

  const stored = await prisma.refreshToken.findFirst({
    where: { userId: payload.id, tokenHash, expiresAt: { gt: new Date() } },
  });

  if (!stored) {
    throw AppError.unauthorized('Invalid refresh token');
  }

  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user) {
    throw AppError.unauthorized('User not found');
  }

  const tokens = await issueTokensForUser(user);

  return tokens;
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: { tokenHash: hashToken(refreshToken) },
  });
}

/**
 * Google has already verified the mailbox it hands us, so those accounts are
 * created pre-verified and never need the confirmation link.
 */
export async function findOrCreateGoogleUser(profile: {
  id: string;
  email: string;
}): Promise<{
  id: string;
  email: string;
  role: UserRole;
  tier: UserTier;
}> {
  const emailLower = profile.email.toLowerCase();

  let user = await prisma.user.findUnique({ where: { googleId: profile.id } });

  if (!user) {
    user = await prisma.user.upsert({
      where: { email: emailLower },
      update: { googleId: profile.id, emailVerified: true },
      create: {
        email: emailLower,
        googleId: profile.id,
        emailVerified: true,
      },
    });
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    tier: user.tier,
  };
}

async function saveRefreshToken(userId: string, token: string): Promise<void> {
  const tokenHash = hashToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  await prisma.refreshToken.deleteMany({
    where: { userId, expiresAt: { lt: new Date() } },
  });
}
