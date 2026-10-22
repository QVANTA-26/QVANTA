import React from 'react';
import { Link } from 'react-router-dom';

const LegalLinks: React.FC = () => {
  return (
    <nav
      aria-label="Legal"
      className="fixed right-4 top-20 z-30 flex items-center gap-2 rounded-md border border-white/10 bg-black/45 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white/60 backdrop-blur-md sm:right-6 sm:top-24"
    >
      <Link to="/terms" className="transition-colors hover:text-white">
        Terms
      </Link>
      <span aria-hidden="true" className="text-white/25">·</span>
      <Link to="/privacy" className="transition-colors hover:text-white">
        Privacy
      </Link>
    </nav>
  );
};

export default LegalLinks;
