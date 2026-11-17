import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@qvanta/ui';
import { useAuthStore } from '@/store/auth';
import { describeVerificationError, resendVerificationEmail, verifyEmailToken } from '@/lib/email-verification';

type Status = 'verifying' | 'error';

/**
 * Landing page for the emailed confirmation link. On success the token is
 * exchanged for a normal session, so the learner goes straight to the dashboard.
 */
const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);
  const token = searchParams.get('token');

  const [status, setStatus] = React.useState<Status>(token ? 'verifying' : 'error');
  const [error, setError] = React.useState<string | null>(
    token ? null : 'This confirmation link is missing its token. Request a new one below.'
  );
  const [email, setEmail] = React.useState('');
  const [resending, setResending] = React.useState(false);
  const [resendMessage, setResendMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) return;

    let cancelled = false;
    const run = async () => {
      try {
        const session = await verifyEmailToken(token);
        if (cancelled) return;
        setAuth(session.user, session.tokens);
        // Drop the one-time token from the address bar before moving on.
        navigate('/dashboard', { replace: true });
      } catch (err) {
        if (cancelled) return;
        setError(describeVerificationError(err));
        setStatus('error');
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [token, setAuth, navigate]);

  const handleResend = async () => {
    const normalized = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      setResendMessage('Enter the email address you signed up with.');
      return;
    }
    setResending(true);
    setResendMessage(null);
    try {
      const result = await resendVerificationEmail(normalized);
      setResendMessage(
        result.emailSent
          ? 'A fresh confirmation link is on its way. Check your inbox.'
          : 'We could not send the email right now. Please try again in a moment.'
      );
    } catch {
      setResendMessage('We could not send the email right now. Please try again in a moment.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,_rgba(109,0,26,0.28),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(216,173,150,0.08),_transparent_34%),#0c0a0c] px-4 py-10">
      <Card className="w-full max-w-md border-bg-800/80 bg-bg-900/90 backdrop-blur">
        <CardHeader className="space-y-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-sm font-bold text-white">
            Q
          </div>
          <div>
            <CardTitle>{status === 'verifying' ? 'Confirming your email' : 'We could not confirm this link'}</CardTitle>
            {status === 'verifying' ? (
              <p className="mt-2 text-sm text-text-400">
                Hold on while we verify your address and sign you in.
              </p>
            ) : (
              <p className="mt-2 text-sm text-text-400">{error}</p>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'verifying' ? (
            <div className="flex justify-center py-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-bg-700 border-t-primary-500" />
            </div>
          ) : (
            <>
              <p className="text-sm text-text-300">
                Enter your email address and we will send you a fresh confirmation link.
              </p>
              <Input
                id="verify-email"
                label="Email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@qvanta.ai"
                autoComplete="email"
                disabled={resending}
              />
              {resendMessage && (
                <div className="rounded-lg border border-bg-700 bg-bg-800/60 px-3 py-2 text-sm text-text-200" role="status">
                  {resendMessage}
                </div>
              )}
              <Button variant="primary" className="w-full" onClick={() => void handleResend()} loading={resending}>
                Resend confirmation link
              </Button>
              <Link to="/login" className="block text-center text-sm text-primary-300 hover:text-primary-200">
                Back to sign in
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmailPage;
