import { useEffect, useState } from 'react';
import Landing, { type LandingPhase } from '@/components/Landing';
import LegalLinks from '@/components/landing/LegalLinks';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

const LandingPage = () => {
  const reducedMotion = usePrefersReducedMotion();
  const [phase, setPhase] = useState<LandingPhase>(() =>
    reducedMotion ? 'interaction' : 'init'
  );

  useEffect(() => {
    if (reducedMotion) {
      setPhase('interaction');
      return undefined;
    }

    setPhase('init');
    const timers = [
      window.setTimeout(() => setPhase('text_particles'), 100),
      window.setTimeout(() => setPhase('text_break'), 2600),
      window.setTimeout(() => setPhase('particles_to_logo'), 3700),
      window.setTimeout(() => setPhase('logo_done'), 5600),
      window.setTimeout(() => setPhase('qvanta_in'), 5900),
      window.setTimeout(() => setPhase('tagline'), 7100),
      window.setTimeout(() => setPhase('interaction'), 8200),
    ];

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [reducedMotion]);

  return (
    <>
      <Landing phase={phase} reducedMotion={reducedMotion} />
      <LegalLinks />
    </>
  );
};

export default LandingPage;
