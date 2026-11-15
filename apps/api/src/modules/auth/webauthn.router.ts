import { Router } from 'express';
import { z } from 'zod';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { AppError } from '../../lib/errors';
import { setRefreshCookie } from './auth.cookies';
import {
  finishPasskeyLogin,
  finishPasskeyRegistration,
  startPasskeyLogin,
  startPasskeyRegistration,
} from './webauthn.service';

export const webauthnRouter = Router();

const registrationStartSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
});

const ceremonySchema = z.object({
  challengeToken: z.string().trim().min(1),
  response: z.record(z.unknown()),
});

webauthnRouter.post('/register/options', async (req, res, next) => {
  try {
    const parsed = registrationStartSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.validation('Enter a valid email address to create a passkey.', parsed.error.flatten());
    }
    const result = await startPasskeyRegistration(parsed.data.email);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

webauthnRouter.post('/register/verify', async (req, res, next) => {
  try {
    const parsed = ceremonySchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.validation('Invalid biometric sign-up response', parsed.error.flatten());
    }
    const result = await finishPasskeyRegistration(
      parsed.data.challengeToken,
      parsed.data.response as unknown as RegistrationResponseJSON
    );
    setRefreshCookie(res, result.tokens.refreshToken);
    res.status(201).json({
      user: result.user,
      tokens: { accessToken: result.tokens.accessToken },
    });
  } catch (err) {
    next(err);
  }
});

webauthnRouter.post('/login/options', async (_req, res, next) => {
  try {
    const result = await startPasskeyLogin();
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

webauthnRouter.post('/login/verify', async (req, res, next) => {
  try {
    const parsed = ceremonySchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.validation('Invalid biometric sign-in response', parsed.error.flatten());
    }
    const result = await finishPasskeyLogin(
      parsed.data.challengeToken,
      parsed.data.response as unknown as AuthenticationResponseJSON
    );
    setRefreshCookie(res, result.tokens.refreshToken);
    res.status(200).json({
      user: result.user,
      tokens: { accessToken: result.tokens.accessToken },
    });
  } catch (err) {
    next(err);
  }
});
