const DEFAULT_AUTH_REDIRECT = '/dashboard';

/**
 * Keep post-auth redirects inside the QVANTA app. Values come from the URL, so
 * external and auth-loop destinations must never be accepted.
 */
export const isSafeAuthRedirect = (value: string | null | undefined): value is string => {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return false;
  }

  const pathname = value.split(/[?#]/, 1)[0];
  return pathname !== '/login' && pathname !== '/register' && pathname !== '/auth/google/callback';
};

export const getSafeAuthRedirect = (value: string | null | undefined): string => {
  return isSafeAuthRedirect(value) ? value : DEFAULT_AUTH_REDIRECT;
};

export const buildAuthPath = (pathname: '/login' | '/register', next: string | null): string => {
  return isSafeAuthRedirect(next) ? `${pathname}?next=${encodeURIComponent(next)}` : pathname;
};
