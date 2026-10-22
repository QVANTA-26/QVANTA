import React from 'react';
import { Link } from 'react-router-dom';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

/** Keeps a rendering failure from leaving the product on a blank screen. */
class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : undefined,
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // Keep this observable in development without sending user content anywhere.
    if (import.meta.env.DEV) {
      console.error('QVANTA render error', error, info.componentStack);
    }
  }

  private reset = () => {
    this.setState({ hasError: false, message: undefined });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="grid min-h-screen place-items-center bg-bg-1 px-4 text-ink">
        <section className="w-full max-w-lg rounded-2xl border border-red-400/20 bg-bg-900/90 p-6 shadow-2xl sm:p-8" role="alert">
          <p className="font-mono-quantum text-xs uppercase tracking-[0.2em] text-red-300">Workspace paused</p>
          <h1 className="mt-3 font-display text-2xl font-semibold text-text-50">Something interrupted this view.</h1>
          <p className="mt-3 text-sm leading-6 text-text-400">
            Your saved account and local learning progress are still separate from this screen. Try the page again or return to the dashboard.
          </p>
          {import.meta.env.DEV && this.state.message ? (
            <pre className="mt-4 overflow-auto rounded-lg bg-bg-950 p-3 text-xs text-red-200">{this.state.message}</pre>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={this.reset}
              className="inline-flex h-10 items-center rounded-lg bg-primary-600 px-4 text-sm font-medium text-white transition hover:bg-primary-500"
            >
              Try again
            </button>
            <Link to="/dashboard" className="inline-flex h-10 items-center rounded-lg border border-bg-700 bg-bg-800 px-4 text-sm font-medium text-text-100 transition hover:bg-bg-700">
              Go to dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }
}

export default AppErrorBoundary;
