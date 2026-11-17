import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { toPublicUser } from '../auth/auth.service';
import type { User } from '@qvanta/types';

export interface UpdateUserInput {
  displayName?: string | null;
  avatarPreset?: number;
}

export interface ProfileImageRecord {
  mimeType: string;
  data: Buffer;
  updatedAt: Date;
}

const DISPLAY_NAME_MIN = 2;
const DISPLAY_NAME_MAX = 40;

/** Only image types a browser can safely render inline are accepted. */
export const ALLOWED_AVATAR_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const MAX_AVATAR_BYTES = 4 * 1024 * 1024;

const profileImageSelect = { profileImage: { select: { updatedAt: true } } } as const;

export async function getCurrentUser(userId: string): Promise<User> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: profileImageSelect,
  });

  if (!user) {
    throw AppError.notFound('User not found');
  }

  return toPublicUser(user);
}

export async function updateUser(userId: string, input: UpdateUserInput): Promise<User> {
  const data: { displayName?: string | null; avatarPreset?: number } = {};

  if (input.displayName !== undefined) {
    const trimmed = input.displayName === null ? '' : input.displayName.trim();
    if (trimmed.length === 0) {
      // An empty name clears it; the UI then falls back to the email local part.
      data.displayName = null;
    } else if (trimmed.length < DISPLAY_NAME_MIN || trimmed.length > DISPLAY_NAME_MAX) {
      throw AppError.validation(
        `Your name must be between ${DISPLAY_NAME_MIN} and ${DISPLAY_NAME_MAX} characters.`
      );
    } else {
      data.displayName = trimmed;
    }
  }

  if (input.avatarPreset !== undefined) {
    if (input.avatarPreset < 0 || input.avatarPreset > 99) {
      throw AppError.validation('avatarPreset must be between 0 and 99');
    }
    data.avatarPreset = input.avatarPreset;
  }

  if (Object.keys(data).length === 0) {
    return getCurrentUser(userId);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    include: profileImageSelect,
  });

  return toPublicUser(user);
}

/**
 * Stores the (already cropped) profile photo. One row per user, so an upload
 * overwrites the previous image rather than accumulating versions.
 */
export async function saveProfileImage(
  userId: string,
  mimeType: string,
  data: Buffer
): Promise<User> {
  if (!ALLOWED_AVATAR_MIME_TYPES.includes(mimeType as (typeof ALLOWED_AVATAR_MIME_TYPES)[number])) {
    throw AppError.validation('Upload a PNG, JPEG or WebP image for your profile photo.');
  }
  if (data.byteLength === 0) {
    throw AppError.validation('The uploaded image was empty. Please try again.');
  }
  if (data.byteLength > MAX_AVATAR_BYTES) {
    throw AppError.validation('Please choose an image smaller than 4 MB.');
  }

  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!exists) {
    throw AppError.notFound('User not found');
  }

  await prisma.profileImage.upsert({
    where: { userId },
    update: { mimeType, data },
    create: { userId, mimeType, data },
  });

  return getCurrentUser(userId);
}

export async function deleteProfileImage(userId: string): Promise<User> {
  await prisma.profileImage.deleteMany({ where: { userId } });
  return getCurrentUser(userId);
}

/** Public read used by `<img>` tags; returns null when the user has no photo. */
export async function getProfileImage(userId: string): Promise<ProfileImageRecord | null> {
  const image = await prisma.profileImage.findUnique({
    where: { userId },
    select: { mimeType: true, data: true, updatedAt: true },
  });

  if (!image) {
    return null;
  }

  return {
    mimeType: image.mimeType,
    data: Buffer.from(image.data),
    updatedAt: image.updatedAt,
  };
}
