import React from 'react';
import Logo from '@/components/ui/Logo';

export interface TutorIntroLoaderProps {
  reducedMotion?: boolean;
}

interface LoaderParticle {
  left: string;
  top: string;
  delay: string;
  size: number;
  color: string;
}

const PARTICLES: LoaderParticle[] = [
  { left: '12%', top: '49%', delay: '-0.2s', size: 4, color: '#b76e79' },
  { left: '19%', top: '22%', delay: '-1.1s', size: 3, color: '#d19b83' },
  { left: '34%', top: '8%', delay: '-0.7s', size: 5, color: '#e4d5cc' },
  { left: '66%', top: '9%', delay: '-1.8s', size: 3, color: '#8f102d' },
  { left: '82%', top: '25%', delay: '-0.4s', size: 4, color: '#f0ddd3' },
  { left: '89%', top: '57%', delay: '-1.5s', size: 3, color: '#b76e79' },
  { left: '74%', top: '82%', delay: '-2.1s', size: 5, color: '#d19b83' },
  { left: '28%', top: '85%', delay: '-1.3s', size: 3, color: '#e4d5cc' },
];

const TutorIntroLoader: React.FC<TutorIntroLoaderProps> = ({ reducedMotion = false }) => (
  <div
    className={`absolute inset-0 z-20 flex items-center justify-center overflow-hidden bg-[#0c0a0c]/95 backdrop-blur-[2px] ${
      reducedMotion ? 'tutor-logo-loader--reduced' : ''
    }`}
    role="status"
    aria-live="polite"
    aria-label="Loading QVANTA virtual tutor"
  >
    <style>{`
      .tutor-logo-loader__stage {
        position: relative;
        display: flex;
        width: min(13rem, 72vw);
        height: min(12rem, 52vh);
        align-items: center;
        justify-content: center;
      }

      .tutor-logo-loader__logo {
        position: relative;
        z-index: 2;
        display: grid;
        place-items: center;
        animation: qvanta-tutor-logo-breathe 1.8s ease-in-out infinite;
         filter: drop-shadow(0 0 18px rgba(109, 0, 26, 0.52));
      }

      .tutor-logo-loader__orbit {
        position: absolute;
         border: 1px solid rgba(216, 173, 150, 0.5);
        border-radius: 999px;
         box-shadow: 0 0 16px rgba(216, 173, 150, 0.13), inset 0 0 16px rgba(109, 0, 26, 0.14);
      }

      .tutor-logo-loader__orbit--outer {
        width: 100%;
        height: 47%;
        transform: rotate(-22deg);
        animation: qvanta-tutor-orbit 4.8s linear infinite;
      }

      .tutor-logo-loader__orbit--inner {
        width: 76%;
        height: 35%;
         border-color: rgba(228, 213, 204, 0.58);
        transform: rotate(54deg);
        animation: qvanta-tutor-orbit-reverse 3.6s linear infinite;
      }

      .tutor-logo-loader__orbit::after {
        position: absolute;
        top: 50%;
        left: -0.25rem;
        width: 0.45rem;
        height: 0.45rem;
        border-radius: 50%;
         background: #e4d5cc;
         box-shadow: 0 0 10px #e4d5cc;
        content: '';
        transform: translateY(-50%);
      }

      .tutor-logo-loader__orbit--inner::after {
        right: -0.2rem;
        left: auto;
        width: 0.35rem;
        height: 0.35rem;
         background: #8f102d;
         box-shadow: 0 0 10px #8f102d;
      }

      .tutor-logo-loader__particle {
        position: absolute;
        z-index: 1;
        border-radius: 50%;
        opacity: 0.78;
        animation: qvanta-tutor-particle 2.8s ease-in-out infinite;
      }

      .tutor-logo-loader__progress {
        position: absolute;
        right: 12%;
        bottom: 5%;
        left: 12%;
        height: 1px;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(51, 65, 85, 0.78);
      }

      .tutor-logo-loader__progress::after {
        display: block;
        width: 42%;
        height: 100%;
        border-radius: inherit;
         background: linear-gradient(90deg, #6d001a, #d8ad96, #f0ddd3);
         box-shadow: 0 0 12px rgba(216, 173, 150, 0.62);
        content: '';
        animation: qvanta-tutor-progress 1.05s cubic-bezier(0.2, 0.75, 0.3, 1) forwards;
      }

      .tutor-logo-loader--reduced .tutor-logo-loader__logo,
      .tutor-logo-loader--reduced .tutor-logo-loader__orbit,
      .tutor-logo-loader--reduced .tutor-logo-loader__particle,
      .tutor-logo-loader--reduced .tutor-logo-loader__progress::after {
        animation: none;
      }

      @keyframes qvanta-tutor-logo-breathe {
        0%, 100% { transform: scale(0.96); opacity: 0.82; }
        50% { transform: scale(1.04); opacity: 1; }
      }

      @keyframes qvanta-tutor-orbit {
        from { transform: rotate(-22deg) rotate(0deg); }
        to { transform: rotate(-22deg) rotate(360deg); }
      }

      @keyframes qvanta-tutor-orbit-reverse {
        from { transform: rotate(54deg) rotate(360deg); }
        to { transform: rotate(54deg) rotate(0deg); }
      }

      @keyframes qvanta-tutor-particle {
        0%, 100% { transform: translate3d(0, 0, 0) scale(0.7); opacity: 0.35; }
        50% { transform: translate3d(0, -0.5rem, 0) scale(1.15); opacity: 1; }
      }

      @keyframes qvanta-tutor-progress {
        from { transform: translateX(-120%); }
        to { transform: translateX(265%); }
      }

      @media (prefers-reduced-motion: reduce) {
        .tutor-logo-loader__logo,
        .tutor-logo-loader__orbit,
        .tutor-logo-loader__particle,
        .tutor-logo-loader__progress::after {
          animation: none;
        }
      }
    `}</style>

    <div className="relative flex w-full max-w-xs flex-col items-center">
      <div className="tutor-logo-loader__stage" aria-hidden="true">
        <div className="tutor-logo-loader__orbit tutor-logo-loader__orbit--outer" />
        <div className="tutor-logo-loader__orbit tutor-logo-loader__orbit--inner" />
        {PARTICLES.map((particle, index) => (
          <span
            key={`${particle.left}-${particle.top}-${index}`}
            className="tutor-logo-loader__particle"
            style={{
              left: particle.left,
              top: particle.top,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: particle.color,
              boxShadow: `0 0 10px ${particle.color}`,
              animationDelay: particle.delay,
            }}
          />
        ))}
        <div className="tutor-logo-loader__logo">
          <Logo size={136} />
        </div>
        <div className="tutor-logo-loader__progress" />
      </div>

       <div className="font-mono-quantum text-[10px] uppercase tracking-[0.24em] text-accent-300/90">
        Syncing tutor signal
      </div>
      <div className="mt-2 text-xs text-text-500">Preparing a quantum guide for you</div>
    </div>
  </div>
);

export default TutorIntroLoader;
