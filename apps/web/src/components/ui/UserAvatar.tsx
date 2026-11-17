import React from 'react';
import type { User } from '@qvanta/types';
import { getApiUrl } from '@/lib/api-client';

type AvatarUser = Pick<User, 'email' | 'displayName' | 'avatarUrl' | 'avatarPreset'> | null | undefined;

/** Shape + colour per avatar preset, mirroring the picker in @qvanta/ui. */
const PRESET_STYLES: Record<number, string> = {
  0: 'rounded-full bg-primary-500',
  1: 'rounded-xl bg-accent-500',
  2: 'rounded-full bg-primary-400',
};

function normalizePreset(value: number | undefined): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(2, Math.trunc(n)));
}

/** The learner's chosen name, falling back to the email local part. */
export function displayNameOf(user: AvatarUser): string {
  const chosen = user?.displayName?.trim();
  if (chosen) return chosen;
  const localPart = user?.email?.split('@')[0];
  return localPart || 'Quantum learner';
}

function initialsOf(user: AvatarUser): string {
  const name = displayNameOf(user);
  return name.slice(0, 2).toUpperCase();
}

interface UserAvatarProps {
  user: AvatarUser;
  /** Rendered size in pixels. */
  size?: number;
  className?: string;
  /** Overrides the preset-derived rounding/colour (used by the big dashboard avatar). */
  shapeClassName?: string;
  textClassName?: string;
}

/**
 * Single source of truth for the profile picture: shows the uploaded photo when
 * one exists and otherwise the initials on the preset shape. Using one component
 * everywhere is what keeps the sidebar, top bar and dashboard in sync.
 */
const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 36,
  className = '',
  shapeClassName,
  textClassName = 'text-sm font-semibold text-white',
}) => {
  const shape = shapeClassName ?? PRESET_STYLES[normalizePreset(user?.avatarPreset)];
  const label = displayNameOf(user);

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden ${shape} ${className}`}
      style={{ width: size, height: size }}
    >
      {user?.avatarUrl ? (
        <img
          src={getApiUrl(user.avatarUrl)}
          alt={`${label}'s profile photo`}
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <span className={textClassName} aria-hidden="true">
          {initialsOf(user)}
        </span>
      )}
    </div>
  );
};

export default UserAvatar;
