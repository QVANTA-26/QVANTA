import React from 'react';

interface LogoProps {
  size?: number;
}

export const LogoMark: React.FC<LogoProps> = ({ size = 40 }) => (
  <span
    className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 via-primary-400 to-accent-500 text-white shadow-[0_8px_22px_rgba(109,0,26,0.32)]"
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: size * 0.56, height: size * 0.56 }}
    >
      <path d="M3.5 3.5v17" />
      <path d="M10 3.5v9.25a6 6 0 0 0 12 0V3.5" />
      <path d="M16 3.5v17" />
      <path d="M10 12.75c0 4.15 2.4 7.75 6 7.75s6-3.6 6-7.75" />
      <path d="M27 3.5l-3.5 8.5 3.5 8.5" />
    </svg>
  </span>
);

const Logo: React.FC<LogoProps> = ({ size = 220 }) => {
  const s = size;
  const w = s;
  const h = s * 0.72;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="gradLeft" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f7f1eb" />
          <stop offset="50%" stopColor="#d8ad96" />
          <stop offset="100%" stopColor="#8f102d" />
        </linearGradient>

        <linearGradient id="gradCenter" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fffaf7" />
          <stop offset="45%" stopColor="#e4d5cc" />
          <stop offset="100%" stopColor="#6d001a" />
        </linearGradient>

        <linearGradient id="gradRight" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f7f1eb" />
          <stop offset="50%" stopColor="#d8ad96" />
          <stop offset="100%" stopColor="#8f102d" />
        </linearGradient>

        <filter id="logoGlow">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#logoGlow)">
        {/* Left: Vertical bar | */}
        <rect
          x={w * 0.06}
          y={h * 0.14}
          width={w * 0.095}
          height={h * 0.72}
          rx={w * 0.045}
          fill="url(#gradLeft)"
        />

        {/* Center: Psi ψ */}
        <svg
          x={w * 0.21}
          y={h * 0.14}
          width={w * 0.56}
          height={h * 0.72}
          viewBox="0 0 56 72"
          preserveAspectRatio="xMidYMid meet"
        >
          <rect x="2" y="0" width="10.5" height="50" rx="5.25" fill="url(#gradCenter)" />
          <rect x="22.5" y="0" width="11" height="72" rx="5.5" fill="url(#gradCenter)" />
          <rect x="43.5" y="0" width="10.5" height="50" rx="5.25" fill="url(#gradCenter)" />
          <path
            d="M 7.25 44 Q 7.25 66 28 66 Q 48.75 66 48.75 44"
            fill="none"
            stroke="url(#gradCenter)"
            strokeWidth="10.5"
            strokeLinecap="round"
          />
        </svg>

        {/* Right: Ket ⟩ */}
        <svg
          x={w * 0.8}
          y={h * 0.14}
          width={w * 0.14}
          height={h * 0.72}
          viewBox="0 0 14 72"
          preserveAspectRatio="xMidYMid meet"
        >
          <polygon
            points="2,0 12,36 2,72 4.5,72 13,36 4.5,0"
            fill="url(#gradRight)"
          />
        </svg>
      </g>
    </svg>
  );
};

export default Logo;
