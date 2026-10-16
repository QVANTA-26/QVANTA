import { useEffect, useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import Logo from '@/components/ui/Logo';
import './landing/Landing.css';

const ArrowIcon: FC = () => (
  <svg aria-hidden="true" className="landing-icon landing-icon--arrow" viewBox="0 0 16 16" fill="none">
    <path d="M3 8h9M8.5 3.5 13 8l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const OrbitGraphic: FC = () => (
  <div className="landing-orbit" role="img" aria-label="A glowing qubit state orbit visualization">
    <div className="landing-orbit__halo" aria-hidden="true" />
    <svg className="landing-orbit__svg" viewBox="0 0 540 520" aria-hidden="true">
      <defs>
        <radialGradient id="orbit-core" cx="35%" cy="28%" r="75%">
          <stop offset="0" stopColor="#e4dcff" />
          <stop offset="0.28" stopColor="#8b6bff" />
          <stop offset="0.7" stopColor="#3d2e9f" />
          <stop offset="1" stopColor="#16122f" />
        </radialGradient>
        <linearGradient id="orbit-line" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#bb9cff" />
          <stop offset="0.5" stopColor="#34e0ff" />
          <stop offset="1" stopColor="#e459ca" />
        </linearGradient>
        <filter id="orbit-blur" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
        <filter id="orbit-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="270" cy="250" r="116" fill="#7561ff" opacity="0.15" filter="url(#orbit-blur)" />
      <ellipse className="landing-orbit__ring landing-orbit__ring--one" cx="270" cy="250" rx="218" ry="88" transform="rotate(-23 270 250)" />
      <ellipse className="landing-orbit__ring landing-orbit__ring--two" cx="270" cy="250" rx="218" ry="88" transform="rotate(41 270 250)" />
      <ellipse className="landing-orbit__ring landing-orbit__ring--three" cx="270" cy="250" rx="218" ry="88" transform="rotate(90 270 250)" />
      <circle cx="270" cy="250" r="92" fill="url(#orbit-core)" opacity="0.96" filter="url(#orbit-glow)" />
      <path d="M270 178v144M198 250h144" stroke="#d5ccff" strokeOpacity="0.22" strokeDasharray="3 8" />
      <path d="M270 250 340 153" stroke="url(#orbit-line)" strokeWidth="3" strokeLinecap="round" filter="url(#orbit-glow)" />
      <circle cx="340" cy="153" r="8" fill="#d9fbff" filter="url(#orbit-glow)" />
      <circle className="landing-orbit__node landing-orbit__node--a" cx="112" cy="188" r="5" />
      <circle className="landing-orbit__node landing-orbit__node--b" cx="421" cy="319" r="5" />
      <circle className="landing-orbit__node landing-orbit__node--c" cx="270" cy="66" r="4" />
    </svg>
    <div className="landing-orbit__label landing-orbit__label--top">
      <span className="landing-mono">QUBIT 01</span>
      <strong>IN SUPERPOSITION</strong>
    </div>
    <div className="landing-orbit__label landing-orbit__label--bottom">
      <span className="landing-mono">STATE VECTOR</span>
      <strong>|ψ⟩ = α|0⟩ + β|1⟩</strong>
    </div>
  </div>
);

const BlochGraphic: FC = () => (
  <div className="landing-bloch" role="img" aria-label="Interactive-style Bloch sphere showing a qubit state vector">
    <div className="landing-bloch__toolbar" aria-hidden="true">
      <span className="landing-bloch__dot landing-bloch__dot--violet" />
      <span className="landing-bloch__dot landing-bloch__dot--cyan" />
      <span className="landing-bloch__dot landing-bloch__dot--pink" />
      <span className="landing-mono">BLOCH / QUBIT 01</span>
    </div>
    <svg className="landing-bloch__svg" viewBox="0 0 620 400" aria-hidden="true">
      <defs>
        <radialGradient id="sphere-fill" cx="35%" cy="28%" r="74%">
          <stop offset="0" stopColor="#b6f6ff" stopOpacity="0.86" />
          <stop offset="0.22" stopColor="#5a9bff" stopOpacity="0.5" />
          <stop offset="0.7" stopColor="#5f3dcd" stopOpacity="0.32" />
          <stop offset="1" stopColor="#24185a" stopOpacity="0.12" />
        </radialGradient>
        <linearGradient id="vector-stroke" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#8b6bff" />
          <stop offset="1" stopColor="#34e0ff" />
        </linearGradient>
        <filter id="vector-glow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g transform="translate(310 202)">
        <ellipse cx="0" cy="0" rx="156" ry="57" fill="none" stroke="#aea1ec" strokeOpacity="0.24" strokeDasharray="4 7" />
        <ellipse cx="0" cy="0" rx="156" ry="57" fill="none" stroke="#aea1ec" strokeOpacity="0.18" transform="rotate(90)" strokeDasharray="4 7" />
        <circle cx="0" cy="0" r="116" fill="url(#sphere-fill)" stroke="#9585e8" strokeOpacity="0.58" />
        <ellipse cx="0" cy="0" rx="116" ry="39" fill="none" stroke="#b4a9ef" strokeOpacity="0.24" />
        <ellipse cx="0" cy="0" rx="39" ry="116" fill="none" stroke="#b4a9ef" strokeOpacity="0.2" />
        <path d="M0 0 72-82" stroke="url(#vector-stroke)" strokeWidth="4" strokeLinecap="round" filter="url(#vector-glow)" />
        <circle cx="72" cy="-82" r="8" fill="#d5fcff" filter="url(#vector-glow)" />
        <path d="M0-126v252M-148 0h296" stroke="#d9d2ff" strokeOpacity="0.24" strokeDasharray="3 8" />
        <text x="-11" y="-136" fill="#d9d2ff" fontSize="14" fontFamily="monospace">|0⟩</text>
        <text x="-11" y="151" fill="#d9d2ff" fontSize="14" fontFamily="monospace">|1⟩</text>
        <text x="158" y="5" fill="#d9d2ff" fontSize="12" fontFamily="monospace">X</text>
      </g>
    </svg>
    <div className="landing-bloch__readout">
      <span className="landing-mono">MEASURED PROBABILITY</span>
      <span className="landing-bloch__probability"><strong>73%</strong><span><i style={{ width: '73%' }} /></span><em>|0⟩</em></span>
      <span className="landing-bloch__probability"><strong>27%</strong><span><i className="is-cyan" style={{ width: '27%' }} /></span><em>|1⟩</em></span>
    </div>
  </div>
);

const ModuleIcon: FC = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
    <path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v12.5H7.5A2.5 2.5 0 0 1 5 17V4.5Z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5 5h-.5A2.5 2.5 0 0 0 2 7.5v9A2.5 2.5 0 0 0 4.5 19H18M9 8h5M9 11.5h5M9 15h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const TrophyIcon: FC = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
    <path d="M8 4h8v5.5a4 4 0 0 1-8 0V4Z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 6H4.5v1.5A3.5 3.5 0 0 0 8 11M16 6h3.5v1.5A3.5 3.5 0 0 1 16 11M12 13.5V18M8.5 20h7M9 18h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const DiscussionIcon: FC = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
    <path d="M4.5 5.5h15v10h-8l-4.5 3v-3h-2.5v-10Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M8 9h8M8 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const Landing: FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="landing-shell">
      <a className="landing-skip-link" href="#landing-main">Skip to content</a>

      <header className={`landing-header${scrolled ? ' is-scrolled' : ''}`}>
        <div className="landing-container landing-header__inner">
          <Link className="landing-brand" to="/" onClick={closeMenu} aria-label="QVANTA home">
            <span className="landing-brand__mark" aria-hidden="true"><Logo size={38} /></span>
            <span className="landing-brand__word">QVANTA</span>
          </Link>

          <button
            type="button"
            className="landing-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="landing-navigation"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>

          <div id="landing-navigation" className={`landing-header__panel${menuOpen ? ' is-open' : ''}`}>
            <nav className="landing-nav" aria-label="Primary navigation">
              <a href="#explore" onClick={closeMenu}>Explore</a>
              <a href="#visual-learning" onClick={closeMenu}>Visual learning</a>
              <Link to="/home" onClick={closeMenu}>Showcase</Link>
            </nav>
            <div className="landing-nav__actions">
              <Link className="landing-nav__sign-in" to="/login" onClick={closeMenu}>Sign in</Link>
              <Link className="landing-button landing-button--small landing-button--primary" to="/register" onClick={closeMenu}>Create account</Link>
            </div>
          </div>
        </div>
      </header>

      <main id="landing-main" tabIndex={-1}>
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero__ambient landing-hero__ambient--left" aria-hidden="true" />
          <div className="landing-hero__ambient landing-hero__ambient--right" aria-hidden="true" />
          <div className="landing-container landing-hero__grid">
            <div className="landing-hero__copy">
              <p className="landing-eyebrow"><span className="landing-eyebrow__pulse" aria-hidden="true" /> Quantum learning, made tangible</p>
              <h1 id="landing-title">Make quantum <span className="qvanta-gradient-text">visible.</span></h1>
              <p className="landing-hero__lede">QVANTA is the visual workspace for understanding quantum computing — from your first qubit to your next breakthrough.</p>
              <div className="landing-hero__actions">
                <Link className="landing-button landing-button--primary" to="/home">
                  Explore the workspace <ArrowIcon />
                </Link>
                <Link className="landing-button landing-button--quiet" to="/register">Start learning free <span aria-hidden="true">↗</span></Link>
              </div>
              <div className="landing-hero__signals" aria-label="QVANTA highlights">
                <div><span className="landing-mono">01</span><strong>Build</strong><span>circuits that explain themselves</span></div>
                <div><span className="landing-mono">02</span><strong>See</strong><span>states in motion, not just symbols</span></div>
              </div>
            </div>

            <div className="landing-hero__visual">
              <OrbitGraphic />
              <div className="landing-hero__caption landing-hero__caption--left"><span className="landing-caption__line" /> <span>Think in states</span></div>
              <div className="landing-hero__caption landing-hero__caption--right"><span>Build with qubits</span> <span className="landing-caption__line" /></div>
            </div>
          </div>
          <a className="landing-scroll-cue" href="#explore"><span className="landing-scroll-cue__line" /> <span>Scroll to explore</span></a>
        </section>

        <section className="landing-section landing-explore" id="explore" aria-labelledby="explore-title">
          <div className="landing-container">
            <div className="landing-section-heading">
              <div>
                <p className="landing-kicker">One workspace / three ways in</p>
                <h2 id="explore-title">Find your next <span className="qvanta-gradient-text">small win.</span></h2>
              </div>
              <p>Learn by doing, keep your momentum, and bring questions to a community that speaks in circuits.</p>
            </div>

            <div className="landing-preview-grid">
              <article className="landing-preview-card landing-preview-card--violet">
                <div className="landing-preview-card__topline"><span className="landing-card-icon"><ModuleIcon /></span><span className="landing-mono">01 / MODULES</span></div>
                <h3>Build a path that compounds.</h3>
                <p>Short, visual lessons connect gates, states, and algorithms into a roadmap you can actually finish.</p>
                <div className="landing-preview-card__meta"><span>08 pathways</span><span>42 lessons</span></div>
                <Link className="landing-card-link" to="/learn">Browse the module hub <ArrowIcon /></Link>
              </article>

              <article className="landing-preview-card landing-preview-card--cyan">
                <div className="landing-preview-card__topline"><span className="landing-card-icon"><TrophyIcon /></span><span className="landing-mono">02 / CONTESTS</span></div>
                <h3>Turn curiosity into a challenge.</h3>
                <p>Practice with focused circuit prompts, compare approaches, and collect the confidence to try harder problems.</p>
                <div className="landing-preview-card__meta"><span>Weekly prompts</span><span>All levels</span></div>
                <Link className="landing-card-link" to="/learn">See community challenges <ArrowIcon /></Link>
              </article>

              <article className="landing-preview-card landing-preview-card--pink">
                <div className="landing-preview-card__topline"><span className="landing-card-icon"><DiscussionIcon /></span><span className="landing-mono">03 / DISCUSSIONS</span></div>
                <h3>Learn out loud.</h3>
                <p>Ask the question you are stuck on, share a cleaner circuit, and make the next idea easier for someone else.</p>
                <div className="landing-preview-card__meta"><span>24 active threads</span><span>Local-first</span></div>
                <Link className="landing-card-link" to="/learn">Join the conversation <ArrowIcon /></Link>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-section landing-visual-learning" id="visual-learning" aria-labelledby="visual-learning-title">
          <div className="landing-container landing-visual-learning__grid">
            <div className="landing-visual-learning__visual">
              <BlochGraphic />
              <div className="landing-visual-learning__badge"><span className="landing-eyebrow__pulse" aria-hidden="true" /> Live visual model</div>
            </div>
            <div className="landing-visual-learning__copy">
              <p className="landing-kicker">The visual layer</p>
              <h2 id="visual-learning-title">See the state, not just the equation.</h2>
              <p>Quantum ideas get easier when the abstraction has somewhere to move. Explore a Bloch sphere, trace a state vector, and watch a circuit change the probability you can measure.</p>
              <ul className="landing-check-list">
                <li><span aria-hidden="true">✓</span><span><strong>Understand the why.</strong> Connect every gate to the state it changes.</span></li>
                <li><span aria-hidden="true">✓</span><span><strong>Keep your bearings.</strong> Visual feedback makes complex concepts feel navigable.</span></li>
                <li><span aria-hidden="true">✓</span><span><strong>Move from theory to code.</strong> Turn a mental model into a working circuit.</span></li>
              </ul>
              <Link className="landing-button landing-button--secondary" to="/learn">Enter the learning lab <ArrowIcon /></Link>
            </div>
          </div>
        </section>

        <section className="landing-section landing-cta" aria-labelledby="landing-cta-title">
          <div className="landing-container landing-cta__inner">
            <div>
              <p className="landing-kicker">Begin with one qubit</p>
              <h2 id="landing-cta-title">Curiosity has a place to run.</h2>
              <p>Start with a guided module or open the workspace and make something that surprises you.</p>
            </div>
            <div className="landing-cta__actions">
              <Link className="landing-button landing-button--primary" to="/register">Create your free account <ArrowIcon /></Link>
              <Link className="landing-button landing-button--quiet" to="/home">Take the visual tour <span aria-hidden="true">↗</span></Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container landing-footer__inner">
          <Link className="landing-brand" to="/" aria-label="QVANTA home"><span className="landing-brand__mark" aria-hidden="true"><Logo size={30} /></span><span className="landing-brand__word">QVANTA</span></Link>
          <span className="landing-footer__note">Quantum learning, made visible.</span>
          <div className="landing-footer__links"><Link to="/home">Showcase</Link><Link to="/login">Sign in</Link><Link to="/register">Create account</Link></div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
