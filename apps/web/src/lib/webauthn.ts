import axios from 'axios';
import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';
import type { User } from '@qvanta/types';
import { apiClient } from '@/lib/api-client';

export interface PasskeySession {
  user: User;
  tokens: { accessToken: string };
}

interface CeremonyChallenge<T> {
  options: T;
  challengeToken: string;
}

/**
 * Passkeys need a secure context (https, or localhost during development) and a
 * browser that exposes the WebAuthn API. Synchronous so the auth forms can
 * decide whether to render the biometric button without delaying the first
 * paint.
 */
export const biometricSignInSupported = (): boolean => {
  try {
    return browserSupportsWebAuthn();
  } catch {
    return false;
  }
};

/** Creates a passkey-first account using Face ID / fingerprint. */
export async function createAccountWithBiometrics(email: string): Promise<PasskeySession> {
  const { data } = await apiClient.post<
    CeremonyChallenge<PublicKeyCredentialCreationOptionsJSON>
  >('/auth/webauthn/register/options', { email });

  const response = await startRegistration({ optionsJSON: data.options });

  const verified = await apiClient.post<PasskeySession>('/auth/webauthn/register/verify', {
    challengeToken: data.challengeToken,
    response,
  });

  return verified.data;
}

/** Signs in with an existing passkey. No email is required. */
export async function signInWithBiometrics(): Promise<PasskeySession> {
  const { data } = await apiClient.post<
    CeremonyChallenge<PublicKeyCredentialRequestOptionsJSON>
  >('/auth/webauthn/login/options');

  const response = await startAuthentication({ optionsJSON: data.options });

  const verified = await apiClient.post<PasskeySession>('/auth/webauthn/login/verify', {
    challengeToken: data.challengeToken,
    response,
  });

  return verified.data;
}

/**
 * Turns a failed ceremony into copy that tells the learner what to do next.
 * Server messages win, then known WebAuthn error names, then a generic fallback.
 */
export function describeBiometricError(error: unknown): string {
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

  switch ((error as { name?: string } | undefined)?.name) {
    case 'NotAllowedError':
    case 'AbortError':
      return 'Face or fingerprint sign-in was cancelled. Try again, or use your email and password.';
    case 'InvalidStateError':
      return 'This device already has a passkey for QVANTA. Use the sign-in option instead.';
    case 'NotSupportedError':
      return 'This device or browser does not support passkeys. Use your email and password instead.';
    case 'SecurityError':
      return 'Passkeys need a secure (https) connection. Use your email and password instead.';
    default:
      return 'Face or fingerprint sign-in did not complete. Try again, or use your email and password.';
  }
}
