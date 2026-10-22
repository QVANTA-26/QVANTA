import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => (
  <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,_rgba(109,0,26,0.24),_transparent_42%),#0d0b0c] px-4 text-ink">
    <section className="w-full max-w-lg text-center">
      <p className="font-mono-quantum text-xs uppercase tracking-[0.24em] text-cyan-300">404 · state not found</p>
      <h1 className="mt-4 font-display text-4xl font-semibold text-text-50 sm:text-6xl">This route collapsed.</h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-text-400">
        The page you requested does not exist. Return to the QVANTA landing page or open the learning workspace.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="inline-flex h-10 items-center rounded-lg bg-primary-600 px-4 text-sm font-medium text-white transition hover:bg-primary-500">
          Back to landing
        </Link>
        <Link to="/learn" className="inline-flex h-10 items-center rounded-lg border border-bg-700 bg-bg-900 px-4 text-sm font-medium text-text-100 transition hover:bg-bg-800">
          Open Learning Lab
        </Link>
      </div>
    </section>
  </main>
);

export default NotFoundPage;
