import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthForm, { type AuthFormValues } from '@/components/auth/AuthForm';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';
import { getSafeAuthRedirect } from '@/lib/auth-navigation';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const redirectPath = getSafeAuthRedirect(searchParams.get('next'));

  const handleSubmit = async (values: AuthFormValues) => {
    if (!values.termsAccepted) {
      setError('Please accept the Terms of Service and Privacy Policy before creating your account.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<{
        user: Parameters<typeof setAuth>[0];
        tokens: Parameters<typeof setAuth>[1];
      }>('/auth/register', {
        email: values.email,
        password: values.password,
      });
      if (!response.data.user || !response.data.tokens?.accessToken) {
        throw new Error('The registration response was incomplete. Please try again.');
      }
      setAuth(response.data.user, response.data.tokens);
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message ??
          (err?.response ? 'Registration failed. Please review your details and try again.' : 'Unable to reach QVANTA. Check your connection and try again.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      mode="register"
      title="Create your account"
      subtitle="Start your quantum learning journey with QVANTA — build circuits, run simulations, and learn with an AI tutor."
      submitLabel="Create account"
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
    />
  );
};

export default RegisterPage;
