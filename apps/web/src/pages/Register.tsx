import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@qvanta/ui';
import AuthForm, { type AuthFormValues } from '@/components/auth/AuthForm';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth';
import { getSafeAuthRedirect } from '@/lib/auth-navigation';
import { createAccountWithBiometrics, describeBiometricError } from '@/lib/webauthn';
import { resendVerificationEmail } from '@/lib/email-verification';

interface PendingState {
  email: string;
  emailSent: boolean;
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<PendingState | null>(null);
  const [resending, setResending] = React.useState(false);
  const [resendMessage, setResendMessage] = React.useState<string | null>(null);
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
        user?: Parameters<typeof setAuth>[0];
        tokens?: Parameters<typeof setAuth>[1];
        verificationRequired?: boolean;
        emailSent?: boolean;
      }>('/auth/register', {
        email: values.email,
        password: values.password,
      });

      // The account stays inert until the mailbox is confirmed, so no session
      // comes back here — the learner gets a "check your inbox" screen instead.
      if (response.data.verificationRequired) {
        setPending({ email: values.email, emailSent: Boolean(response.data.emailSent) });
        return;
      }

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

  const handleBiometricRegister = async (email: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await createAccountWithBiometrics(email);

      if (!('tokens' in result)) {
        setPending({ email, emailSent: result.emailSent });
        return;
      }

      setAuth(result.user, result.tokens);
      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      setError(describeBiometricError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pending) return;
    setResending(true);
    setResendMessage(null);
    try {
      const result = await resendVerificationEmail(pending.email);
      setResendMessage(
        result.emailSent
          ? 'A fresh confirmation link is on its way.'
          : 'We could not send the email right now. Please try again in a moment.'
      );
    } catch {
      setResendMessage('We could not send the email right now. Please try again in a moment.');
    } finally {
      setResending(false);
    }
  };

  if (pending) {
    return (
      <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,_rgba(109,0,26,0.28),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(216,173,150,0.08),_transparent_34%),#0c0a0c] px-4 py-10">
        <Card className="w-full max-w-md border-bg-800/80 bg-bg-900/90 backdrop-blur">
          <CardHeader className="space-y-3">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-sm font-bold text-white">
              Q
            </div>
            <div>
              <CardTitle>Confirm your email</CardTitle>
              <p className="mt-2 text-sm text-text-400">
                We sent a confirmation link to{' '}
                <span className="font-medium text-text-200">{pending.email}</span>. Open it to
                activate your account and sign in — this keeps your account tied to an address you
                actually own.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!pending.emailSent && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                Email delivery is not configured on this deployment, so the link could not be sent.
                An administrator needs to set the SMTP details.
              </div>
            )}

            {resendMessage && (
              <div className="rounded-lg border border-bg-700 bg-bg-800/60 px-3 py-2 text-sm text-text-200">
                {resendMessage}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => void handleResend()} loading={resending}>
                Resend confirmation link
              </Button>
              <Link to="/login">
                <Button variant="secondary">Back to sign in</Button>
              </Link>
            </div>

            <p className="text-xs text-text-500">
              Check your spam folder if it does not arrive within a few minutes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AuthForm
      mode="register"
      title="Create your account"
      subtitle="Start your quantum learning journey with QVANTA — build circuits, run simulations, and learn with an AI tutor."
      submitLabel="Create account"
      onSubmit={handleSubmit}
      onBiometricRegister={handleBiometricRegister}
      loading={loading}
      error={error}
    />
  );
};

export default RegisterPage;
