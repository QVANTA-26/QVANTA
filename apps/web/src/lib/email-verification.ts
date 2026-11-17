import axios from 'axios';
import type { User } from '@qvanta/types';
import { apiClient } from '@/lib/api-client';

export interface VerifiedSession {
  user: User;
  tokens: { accessToken: string };
}

/**
 * Confirms the token from the emailed link and returns a signed-in session, so
 * the click is the only extra step between sign-up and the dashboard.
 */
export async function verifyEmailToken(token: string): Promise<VerifiedSession> {
  const { data } = await apiClient.post<VerifiedSession>('/auth/verify-email', { token });
  return data;
}

/**
 * Asks the API to re-send the confirmation link. The endpoint never reveals
 * whether the address is registered, so `emailSent` only says whether SMTP
 * accepted the message.
 */
export async function resendVerificationEmail(email: string): Promise<{ emailSent: boolean }> {
  const { data } = await apiClient.post<{ ok: boolean; emailSent: boolean }>(
    '/auth/resend-verification',
    { email }
  );
  return { emailSent: Boolean(data?.emailSent) };
}

/** Server messages win, then a network-aware fallback. */
export function describeVerificationError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { error?: { message?: string } } | undefined)?.error
      ?.message;
    if (message) {
      return message;
    }
    if (!error.response) {
      return 'Unable to reach QVANTA. Check your connection and try again.';
    }
  }
  return 'We could not confirm this link. Request a new one below.';
}
