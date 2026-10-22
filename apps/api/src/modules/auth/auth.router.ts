import { Router, type Response } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { z } from 'zod';
import {
  registerUser,
  loginUser,
  refreshTokens,
  revokeRefreshToken,
  findOrCreateGoogleUser,
  issueTokensForUser,
} from './auth.service';
import { logger } from '../../lib/logger';
import { AppError } from '../../lib/errors';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().trim().min(1),
});

const GOOGLE_CALLBACK_PATH = '/auth/google/callback';
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const hasUsableGoogleConfig = Boolean(
  googleClientId &&
    googleClientSecret &&
    !googleClientId.startsWith('your-') &&
    !googleClientSecret.startsWith('your-')
);

const setRefreshCookie = (res: Response, refreshToken: string): void => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

if (googleClientId && googleClientSecret && hasUsableGoogleConfig) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: process.env.GOOGLE_CALLBACK_URL ?? GOOGLE_CALLBACK_PATH,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email || !profile.id) {
            return done(new Error('Invalid Google profile'));
          }
          const user = await findOrCreateGoogleUser({
            id: profile.id,
            email,
          });
          return done(null, user);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((obj, done) => {
    done(null, obj as Express.User);
  });
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.validation('Invalid input', parsed.error.flatten());
    }
    const result = await registerUser(parsed.data);
    setRefreshCookie(res, result.tokens.refreshToken);
    res.status(201).json({
      user: result.user,
      tokens: { accessToken: result.tokens.accessToken },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.validation('Invalid input', parsed.error.flatten());
    }
    const result = await loginUser(parsed.data);
    setRefreshCookie(res, result.tokens.refreshToken);
    res.status(200).json({
      user: result.user,
      tokens: { accessToken: result.tokens.accessToken },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const cookieToken = req.cookies?.refreshToken as string | undefined;
    let refreshToken: string;

    if (cookieToken) {
      refreshToken = cookieToken;
    } else {
      const parsed = refreshSchema.safeParse(req.body);
      if (!parsed.success) {
        throw AppError.validation('Invalid input', parsed.error.flatten());
      }
      refreshToken = parsed.data.refreshToken;
    }

    const tokens = await refreshTokens(refreshToken);
    setRefreshCookie(res, tokens.refreshToken);
    res.status(200).json({ accessToken: tokens.accessToken });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const cookieToken = req.cookies?.refreshToken as string | undefined;
    if (cookieToken) {
      await revokeRefreshToken(cookieToken);
    }
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

authRouter.get('/google', (req, res, next) => {
  if (!hasUsableGoogleConfig) {
    throw AppError.internal('Google OAuth is not configured');
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

authRouter.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.WEB_ORIGIN ?? 'http://localhost:5173'}/login?oauth=error`,
  }),
  async (req, res) => {
    try {
      const user = req.user as
        | { id: string; email: string; role: import('@qvanta/types').UserRole; tier: import('@qvanta/types').UserTier }
        | undefined;
      if (!user) {
        throw AppError.unauthorized('Google authentication failed');
      }
      const tokens = await issueTokensForUser(user);
      setRefreshCookie(res, tokens.refreshToken);
       // Keep the short-lived access token out of the query string so it is not
       // copied into ordinary referrer and server access logs. The callback
       // page consumes the fragment and immediately removes it from history;
       // the refresh token stays in the httpOnly cookie set above.
       const redirectUrl = `${process.env.WEB_ORIGIN ?? 'http://localhost:5173'}/auth/google/callback#accessToken=${encodeURIComponent(tokens.accessToken)}`;
      logger.info(`Google OAuth success for user: ${user.id}`);
      res.redirect(redirectUrl);
    } catch (err) {
      logger.error(`Google OAuth callback error: ${err instanceof Error ? err.message : String(err)}`);
      const redirectUrl = `${process.env.WEB_ORIGIN ?? 'http://localhost:5173'}/login?oauth=error`;
      res.redirect(redirectUrl);
    }
  }
);
