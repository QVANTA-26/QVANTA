import type { Response } from 'express';

interface RefreshCookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: 'none' | 'lax';
  maxAge?: number;
}

const refreshCookieOptions = (): RefreshCookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
});

export const setRefreshCookie = (res: Response, refreshToken: string): void => {
  res.cookie('refreshToken', refreshToken, {
    ...refreshCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const clearRefreshCookie = (res: Response): void => {
  res.clearCookie('refreshToken', refreshCookieOptions());
};
