import { Router } from 'express';
import { z } from 'zod';
import { JwtAuthGuard, type AuthRequest } from '../auth/auth.middleware';
import {
  deleteProfileImage,
  getCurrentUser,
  getProfileImage,
  saveProfileImage,
  updateUser,
} from './users.service';
import { AppError } from '../../lib/errors';

export const usersRouter = Router();

const updateMeSchema = z.object({
  avatarPreset: z.number().int().min(0).max(99).optional(),
  // A bare string sets the name; `null` or an empty string clears it.
  displayName: z.string().max(80).nullable().optional(),
});

const avatarUploadSchema = z.object({
  /** A data URL produced by the browser after the client-side crop. */
  dataUrl: z.string().min(1),
  /** Optional hint; the data URL's own media type is authoritative. */
  mimeType: z.string().optional(),
});

const DATA_URL_PATTERN = /^data:([\w/+.-]+);base64,([\s\S]+)$/;

function decodeDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } {
  const match = DATA_URL_PATTERN.exec(dataUrl.trim());
  if (!match) {
    throw AppError.validation('Upload a valid image file for your profile photo.');
  }

  const [, mimeType, base64] = match;
  const buffer = Buffer.from(base64, 'base64');
  if (buffer.byteLength === 0) {
    throw AppError.validation('The uploaded image was empty. Please try again.');
  }

  return { mimeType, buffer };
}

usersRouter.get('/me', JwtAuthGuard, async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw AppError.unauthorized();
    }
    const user = await getCurrentUser(authReq.user.id);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});

usersRouter.patch('/me', JwtAuthGuard, async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw AppError.unauthorized();
    }
    const parsed = updateMeSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.validation('Invalid input', parsed.error.flatten());
    }
    const user = await updateUser(authReq.user.id, parsed.data);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});

usersRouter.post('/me/avatar', JwtAuthGuard, async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw AppError.unauthorized();
    }
    const parsed = avatarUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.validation('Invalid image upload', parsed.error.flatten());
    }
    const { mimeType, buffer } = decodeDataUrl(parsed.data.dataUrl);
    const user = await saveProfileImage(authReq.user.id, mimeType, buffer);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});

usersRouter.delete('/me/avatar', JwtAuthGuard, async (req, res, next) => {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw AppError.unauthorized();
    }
    const user = await deleteProfileImage(authReq.user.id);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});

/**
 * Public, unauthenticated image endpoint so `<img src>` can render the photo
 * without an Authorization header. Returns 404 when the user has no photo, and
 * caches for a short window since the response is versioned by `?v=`.
 */
usersRouter.get('/:id/avatar', async (req, res, next) => {
  try {
    const image = await getProfileImage(req.params.id);
    if (!image) {
      throw AppError.notFound('No profile photo for this user');
    }

    res.setHeader('Content-Type', image.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Content-Length', String(image.data.byteLength));
    res.setHeader('Last-Modified', image.updatedAt.toUTCString());
    res.status(200).end(image.data);
  } catch (err) {
    next(err);
  }
});
