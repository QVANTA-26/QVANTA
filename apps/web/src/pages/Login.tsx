import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthForm from '@/components/auth/AuthForm';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';
import { isLocalDevHost } from '@/lib/runtime';
import { getSafeAuthRedirect } from '@/lib/auth-navigation';
import { describeBiometricError, signInWithBiometrics } from '@/lib/webauthn';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = React.useState(false);
  const redirectPath = getSafeAuthRedirect(searchParams.get('next'));
  const [error, setError] = React.useState<string | null>(
    searchParams.get('oauth') === 'error' ? 'Google sign-in failed. Please try again.' : null
  );

  const handleSubmit = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<{
        user: Parameters<typeof setAuth>[0];
        tokens: Parameters<typeof setAuth>[1];
      }>('/auth/login', values);
      if (!response.data.user || !response.data.tokens?.accessToken) {
        throw new Error('The sign-in response was incomplete. Please try again.');
      }
      setAuth(response.data.user, response.data.tokens);
      navigate(redirectPath, { replace: true });
      return;
    } catch (err: any) {
      const isLocalDevFallback =
        isLocalDevHost() &&
        values.email.toLowerCase() === 'dev@qvanta.ai' &&
        values.password === 'dev-password';

      if (isLocalDevFallback) {
        const mockUser = {
          id: 'dev-local',
          email: 'dev@qvanta.ai',
          role: 'admin',
          tier: 'free',
          usageMonth: new Date().toISOString().slice(0, 7),
          usageSims: 0,
          avatarPreset: 0,
          createdAt: new Date().toISOString(),
        } as const;

        setAuth(mockUser, {
          accessToken: 'dev-token',
          refreshToken: 'dev-refresh',
        });
        navigate(redirectPath, { replace: true });
        return;
      }

      setError(
        err?.response?.data?.error?.message ??
          (err?.response ? 'Login failed. Check your email and password.' : 'Unable to reach QVANTA. Check your connection and try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const session = await signInWithBiometrics();
      if (!session.user || !session.tokens?.accessToken) {
        throw new Error('The sign-in response was incomplete. Please try again.');
      }
      setAuth(session.user, session.tokens);
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      setError(describeBiometricError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      mode="login"
      title="Welcome back"
      subtitle={
        redirectPath === '/learn'
          ? 'Sign in to continue your guided quantum learning journey in the Learning Lab.'
          : 'Sign in to continue building quantum circuits, running simulations, and learning with your AI tutor.'
      }
      submitLabel="Sign in"
      onSubmit={handleSubmit}
      onBiometricLogin={handleBiometricLogin}
      loading={loading}
      error={error}
    />
  );
};

export default LoginPage;
