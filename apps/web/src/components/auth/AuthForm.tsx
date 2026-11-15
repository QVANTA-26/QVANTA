import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@qvanta/ui';
import { isLocalDevHost } from '@/lib/runtime';
import { buildAuthPath, isSafeAuthRedirect } from '@/lib/auth-navigation';
import { getApiUrl } from '@/lib/api-client';
import { biometricSignInSupported } from '@/lib/webauthn';

interface AuthFormProps {
  mode: 'login' | 'register';
  title: string;
  subtitle: string;
  submitLabel: string;
  onSubmit: (values: AuthFormValues) => Promise<void>;
  onBiometricLogin?: () => Promise<void>;
  onBiometricRegister?: (email: string) => Promise<void>;
  loading?: boolean;
  error?: string | null;
}

export interface AuthFormValues {
  email: string;
  password: string;
  termsAccepted?: boolean;
}

const AuthForm: React.FC<AuthFormProps> = ({
  mode,
  title,
  subtitle,
  submitLabel,
  onSubmit,
  onBiometricLogin,
  onBiometricRegister,
  loading,
  error,
}) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [termsError, setTermsError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<{ email?: string; password?: string }>({});
  const termsCheckboxRef = React.useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');
  const localDemoAvailable = mode === 'login' && isLocalDevHost();
  const termsAcceptanceMessage = 'Please accept the Terms of Service and Privacy Policy before creating your account.';

  const requireTermsAcceptance = () => {
    if (mode !== 'register' || termsAccepted) {
      return true;
    }

    setTermsError(termsAcceptanceMessage);
    termsCheckboxRef.current?.focus();
    return false;
  };

  const useLocalDemoAccount = () => {
    setEmail('dev@qvanta.ai');
    setPassword('dev-password');
    setFieldErrors({});
  };

  const validate = (): AuthFormValues | null => {
    const normalizedEmail = email.trim().toLowerCase();
    const nextFieldErrors: { email?: string; password?: string } = {};

    if (!normalizedEmail) {
      nextFieldErrors.email = 'Enter your email address.';
    } else if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      nextFieldErrors.email = 'Enter a valid email address.';
    }

    if (!password) {
      nextFieldErrors.password = 'Enter your password.';
    } else if (mode === 'register' && password.length < 8) {
      nextFieldErrors.password = 'Use at least 8 characters for your password.';
    }

    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0 || !requireTermsAcceptance()) {
      return null;
    }

    return mode === 'register'
      ? { email: normalizedEmail, password, termsAccepted: true }
      : { email: normalizedEmail, password };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const values = validate();
    if (!values) {
      return;
    }

    setTermsError(null);
    await onSubmit(values);
  };

  const biometricsAvailable =
    React.useMemo(() => biometricSignInSupported(), []) &&
    (mode === 'login' ? Boolean(onBiometricLogin) : Boolean(onBiometricRegister));

  const handleBiometricLogin = async () => {
    if (!onBiometricLogin) {
      return;
    }
    setTermsError(null);
    await onBiometricLogin();
  };

  const handleBiometricRegister = async () => {
    if (!onBiometricRegister) {
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setFieldErrors({ email: 'Enter your email address to create your passkey.' });
      return;
    }

    if (!requireTermsAcceptance()) {
      return;
    }

    setFieldErrors({});
    setTermsError(null);
    await onBiometricRegister(normalizedEmail);
  };

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const googleIsConfigured = Boolean(googleClientId && googleClientId !== 'your-google-client-id');
  const googleUrl = getApiUrl('/auth/google');
  const authSwitchPath = buildAuthPath(mode === 'login' ? '/register' : '/login', next);

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,_rgba(109,0,26,0.28),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(216,173,150,0.08),_transparent_34%),#0c0a0c] px-4 py-10">
      <Card className="w-full max-w-md border-bg-800/80 bg-bg-900/90 backdrop-blur">
        <CardHeader className="space-y-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-sm font-bold text-white">
            Q
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <p className="mt-2 text-sm text-text-400">{subtitle}</p>
          </div>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate aria-busy={loading}>
            <Input
              id="auth-email"
              label="Email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (fieldErrors.email) {
                  setFieldErrors((current) => ({ ...current, email: undefined }));
                }
              }}
              placeholder="you@qvanta.ai"
              autoComplete="email"
              aria-invalid={fieldErrors.email ? 'true' : 'false'}
              aria-describedby={fieldErrors.email ? 'auth-email-error' : undefined}
              disabled={loading}
            />
            {fieldErrors.email ? (
              <p id="auth-email-error" className="-mt-2 text-sm text-red-300" role="alert">
                {fieldErrors.email}
              </p>
            ) : null}
            <Input
              id="auth-password"
              label="Password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((current) => ({ ...current, password: undefined }));
                }
              }}
              placeholder="At least 8 characters"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={mode === 'register' ? 8 : undefined}
              aria-invalid={fieldErrors.password ? 'true' : 'false'}
              aria-describedby={fieldErrors.password ? 'auth-password-error' : undefined}
              disabled={loading}
            />
            {fieldErrors.password ? (
              <p id="auth-password-error" className="-mt-2 text-sm text-red-300" role="alert">
                {fieldErrors.password}
              </p>
            ) : null}

            {mode === 'register' && (
              <div className="space-y-2">
                <label htmlFor="terms-consent" className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-text-300">
                  <input
                    ref={termsCheckboxRef}
                    id="terms-consent"
                    name="terms-consent"
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(event) => {
                      setTermsAccepted(event.target.checked);
                      if (event.target.checked) {
                        setTermsError(null);
                      }
                    }}
                    disabled={loading}
                    aria-required="true"
                    aria-invalid={termsError ? 'true' : 'false'}
                    aria-describedby={termsError ? 'terms-consent-error' : undefined}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-bg-700 bg-bg-900 text-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-bg-950"
                  />
                  <span>
                    I agree to the{' '}
                    <Link to="/terms" className="text-primary-300 underline hover:text-primary-200">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="text-primary-300 underline hover:text-primary-200">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
                {termsError ? (
                  <p id="terms-consent-error" role="alert" className="text-sm text-red-300">
                    {termsError}
                  </p>
                ) : null}
              </div>
            )}

            {error ? (
              <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            ) : null}

            {localDemoAvailable && (
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-text-400">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-cyan-200">Local demo account</p>
                    <p className="mt-1 font-mono-quantum text-[11px] text-text-500">dev@qvanta.ai · dev-password</p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-md border border-cyan-500/30 px-2.5 py-1.5 font-medium text-cyan-200 transition hover:bg-cyan-500/10"
                    onClick={useLocalDemoAccount}
                  >
                    Use demo ID
                  </button>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : submitLabel}
            </Button>

            {biometricsAvailable && (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={
                  mode === 'login'
                    ? () => void handleBiometricLogin()
                    : () => void handleBiometricRegister()
                }
                disabled={loading}
              >
                {mode === 'login'
                  ? 'Sign in with Face ID / fingerprint'
                  : 'Create account with Face ID / fingerprint'}
              </Button>
            )}

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                if (!googleIsConfigured) {
                  return;
                }
                if (mode === 'register' && !requireTermsAcceptance()) {
                  return;
                }
                try {
                  if (isSafeAuthRedirect(next)) {
                    sessionStorage.setItem('qvanta_auth_redirect', next);
                  } else {
                    sessionStorage.removeItem('qvanta_auth_redirect');
                  }
                } catch {
                  // Ignore storage restrictions; the callback still completes sign-in.
                }
                window.location.href = googleUrl;
              }}
              disabled={!googleIsConfigured || loading}
            >
              {googleIsConfigured ? 'Continue with Google' : 'Google OAuth not configured'}
            </Button>
            {!googleIsConfigured && (
              <p className="text-center text-xs text-text-400">
                Set VITE_GOOGLE_CLIENT_ID to enable Google sign-in for localhost.
              </p>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-text-400">
            {mode === 'login' ? 'New to QVANTA?' : 'Already have an account?'}{' '}
            <Link
              to={authSwitchPath}
              className="font-medium text-primary-300 hover:text-primary-200"
            >
              {mode === 'login' ? 'Create account' : 'Sign in'}
            </Link>
          </p>

          <nav aria-label="Legal" className="mt-4 flex justify-center gap-4 text-xs text-text-500">
            <Link to="/terms" className="transition-colors hover:text-text-200">
              Terms of Service
            </Link>
            <Link to="/privacy" className="transition-colors hover:text-text-200">
              Privacy Policy
            </Link>
          </nav>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;
