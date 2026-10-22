import React from 'react';
import { Link } from 'react-router-dom';

export const PLACEHOLDER_CONTACT_EMAIL = 'placeholder-contact@example.invalid';

interface LegalPageLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  lastUpdated: string;
  children: React.ReactNode;
}

interface LegalSectionProps {
  title: string;
  children: React.ReactNode;
}

export const LegalSection: React.FC<LegalSectionProps> = ({ title, children }) => {
  const sectionId = `legal-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <section aria-labelledby={sectionId} className="space-y-3">
      <h2 id={sectionId} className="font-display text-xl font-semibold text-text-50 sm:text-2xl">
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-7 text-text-300">{children}</div>
    </section>
  );
};

const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({
  eyebrow,
  title,
  description,
  lastUpdated,
  children,
}) => {
  return (
    <div className="min-h-screen bg-bg-1 text-ink">
      <header className="border-b border-bg-800/80 bg-bg-1/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-ink no-underline">
            <span className="font-mono-quantum text-lg font-semibold" aria-hidden="true">
              <span className="text-violet">|</span>
              <span className="qvanta-gradient-text">ψ</span>
              <span className="text-violet">⟩</span>
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">QVANTA</span>
          </Link>

          <nav aria-label="Legal and account navigation" className="flex flex-wrap items-center gap-4 text-sm">
            <Link to="/terms" className="text-text-300 transition-colors hover:text-text-50">
              Terms
            </Link>
            <Link to="/privacy" className="text-text-300 transition-colors hover:text-text-50">
              Privacy
            </Link>
            <Link to="/login" className="text-primary-300 transition-colors hover:text-primary-200">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8 space-y-4">
          <p className="font-mono-quantum text-xs uppercase tracking-[0.2em] text-cyan-500">{eyebrow}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-text-50 sm:text-5xl">
            {title}
          </h1>
          <p className="max-w-3xl text-base leading-7 text-text-300">{description}</p>
          <p className="text-sm text-text-400">
            Last updated: <time dateTime="2026-10-18">{lastUpdated}</time>
          </p>
        </header>

        <article className="space-y-10 rounded-2xl border border-bg-800/90 bg-bg-900/75 p-6 shadow-2xl shadow-bg-950/30 sm:p-10">
          {children}
        </article>
      </main>
    </div>
  );
};

export default LegalPageLayout;
