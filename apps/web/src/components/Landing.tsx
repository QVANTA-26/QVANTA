import { useEffect, useRef, useState, type FC } from 'react';
import { Link } from 'react-router-dom';
import Logo from '@/components/ui/Logo';
import './landing/Landing.css';

export type LandingPhase =
  | 'init'
  | 'text_particles'
  | 'text_break'
  | 'particles_to_logo'
  | 'logo_done'
  | 'qvanta_in'
  | 'tagline'
  | 'interaction';

interface LandingProps {
  phase: LandingPhase;
  reducedMotion: boolean;
}

interface Particle {
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  ox: number;
  oy: number;
}

const PARTICLE_COUNT = 2400;
const TEXT_STRING = 'MAKE QUANTUM VISIBLE';

const sampleImageData = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stride: number,
  alphaThreshold = 24,
): Array<{ x: number; y: number; color: string }> => {
  const data = ctx.getImageData(0, 0, width, height).data;
  const points: Array<{ x: number; y: number; color: string }> = [];

  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3];
      if (alpha <= alphaThreshold) continue;

      const red = Math.min(255, data[index] + 40);
      const green = Math.min(255, data[index + 1] + 40);
      const blue = Math.min(255, data[index + 2] + 40);
      points.push({ x, y, color: `rgba(${red},${green},${blue},1)` });
    }
  }

  return points;
};

const logoColorForY = (percentage: number): string => {
  const stops = [
    [0, [139, 92, 246]],
    [0.25, [99, 102, 241]],
    [0.55, [59, 130, 246]],
    [0.85, [34, 211, 238]],
    [1, [236, 72, 153]],
  ] as const;
  const value = Math.max(0, Math.min(1, percentage));

  for (let index = 1; index < stops.length; index += 1) {
    const [end, endColor] = stops[index];
    if (value > end) continue;

    const [start, startColor] = stops[index - 1];
    const progress = (value - start) / (end - start);
    const red = Math.round(startColor[0] + (endColor[0] - startColor[0]) * progress);
    const green = Math.round(startColor[1] + (endColor[1] - startColor[1]) * progress);
    const blue = Math.round(startColor[2] + (endColor[2] - startColor[2]) * progress);
    return `rgba(${red},${green},${blue},1)`;
  }

  const [, finalColor] = stops[stops.length - 1];
  return `rgba(${finalColor[0]},${finalColor[1]},${finalColor[2]},1)`;
};

const lerp = (start: number, end: number, amount: number) =>
  start + (end - start) * amount;
const easeOutCubic = (amount: number) => 1 - (1 - amount) ** 3;
const easeInCubic = (amount: number) => amount ** 3;
const easeOutQuad = (amount: number) => 1 - (1 - amount) ** 2;
const easeOutExpo = (amount: number) =>
  amount === 1 ? 1 : 1 - 2 ** (-10 * amount);

const getParticleCount = (width: number): number => {
  const hardwareConcurrency =
    typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number'
      ? navigator.hardwareConcurrency
      : 8;

  if (width <= 540) return 900;
  if (width <= 900) return hardwareConcurrency <= 4 ? 1050 : 1400;
  if (hardwareConcurrency <= 4) return 1600;
  return PARTICLE_COUNT;
};

const ArrowIcon: FC = () => (
  <svg aria-hidden="true" className="landing-arrow" viewBox="0 0 16 16" fill="none">
    <path
      d="M3 8h9M8.5 3.5 13 8l-4.5 4.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function Landing({ phase, reducedMotion }: LandingProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const phaseTimingRef = useRef<Partial<Record<LandingPhase, number>>>({});
  const phaseRef = useRef<LandingPhase>(phase);
  const sizeRef = useRef({ width: 0, height: 0, fontSize: 40 });
  const [logoRendered, setLogoRendered] = useState(reducedMotion);
  const [showWordmark, setShowWordmark] = useState(reducedMotion);
  const [introSkipped, setIntroSkipped] = useState(false);

  phaseRef.current = phase;

  const buildLogoTargets = () => {
    const { width, height } = sizeRef.current;
    if (width === 0 || height === 0 || typeof document === 'undefined') return;

    const offscreen = document.createElement('canvas');
    offscreen.width = Math.max(1, Math.round(width));
    offscreen.height = Math.max(1, Math.round(height));
    const context = offscreen.getContext('2d');
    if (!context) return;

    const targetWidth = Math.min(width * 0.48, 520);
    const targetHeight = targetWidth / (1 / 0.72);
    const lockupOffset = width > 760 ? targetWidth * 0.12 : 0;
    const left = Math.round((width - targetWidth) / 2 - lockupOffset);
    const top = Math.round((height - targetHeight) / 2);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', String(targetWidth));
    svg.setAttribute('height', String(targetHeight));
    svg.setAttribute('viewBox', `0 0 ${targetWidth} ${targetHeight}`);

    const createGradient = (id: string, colors: string[]) => {
      const gradient = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'linearGradient',
      );
      gradient.setAttribute('id', id);
      gradient.setAttribute('x1', '0');
      gradient.setAttribute('y1', '0');
      gradient.setAttribute('x2', '0');
      gradient.setAttribute('y2', '1');
      colors.forEach((color, index) => {
        const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop.setAttribute('offset', `${(index / (colors.length - 1)) * 100}%`);
        stop.setAttribute('stop-color', color);
        gradient.appendChild(stop);
      });
      return gradient;
    };

    svg.appendChild(createGradient('landing-logo-left', ['#8B5CF6', '#A855F7', '#EC4899']));
    svg.appendChild(createGradient('landing-logo-center', ['#6366F1', '#3B82F6', '#22D3EE']));
    svg.appendChild(createGradient('landing-logo-right', ['#8B5CF6', '#A855F7', '#EC4899']));

    const leftBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    leftBar.setAttribute('x', String(targetWidth * 0.06));
    leftBar.setAttribute('y', String(targetHeight * 0.14));
    leftBar.setAttribute('width', String(targetWidth * 0.095));
    leftBar.setAttribute('height', String(targetHeight * 0.72));
    leftBar.setAttribute('rx', String(targetWidth * 0.045));
    leftBar.setAttribute('fill', 'url(#landing-logo-left)');
    svg.appendChild(leftBar);

    const centerWidth = targetWidth * 0.56;
    const centerHeight = targetHeight * 0.72;
    const center = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    center.setAttribute('transform', `translate(${targetWidth * 0.21},${targetHeight * 0.14})`);

    const createCenterRect = (x: number, y: number, widthValue: number, heightValue: number, radius: number) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(x));
      rect.setAttribute('y', String(y));
      rect.setAttribute('width', String(widthValue));
      rect.setAttribute('height', String(heightValue));
      rect.setAttribute('rx', String(radius));
      rect.setAttribute('fill', 'url(#landing-logo-center)');
      return rect;
    };

    center.appendChild(createCenterRect(centerWidth * (2 / 56), 0, centerWidth * (10.5 / 56), centerHeight * (50 / 72), centerWidth * (5.25 / 56)));
    center.appendChild(createCenterRect(centerWidth * (22.5 / 56), 0, centerWidth * (11 / 56), centerHeight, centerWidth * (5.5 / 56)));
    center.appendChild(createCenterRect(centerWidth * (43.5 / 56), 0, centerWidth * (10.5 / 56), centerHeight * (50 / 72), centerWidth * (5.25 / 56)));

    const curve = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const curveY1 = centerHeight * (44 / 72);
    const curveY2 = centerHeight * (66 / 72);
    const curveStart = centerWidth * (7.25 / 56);
    const curveEnd = centerWidth * (48.75 / 56);
    curve.setAttribute(
      'd',
      `M ${curveStart} ${curveY1} Q ${curveStart} ${curveY2} ${centerWidth / 2} ${curveY2} Q ${curveEnd} ${curveY2} ${curveEnd} ${curveY1}`,
    );
    curve.setAttribute('fill', 'none');
    curve.setAttribute('stroke', 'url(#landing-logo-center)');
    curve.setAttribute('stroke-width', String(centerHeight * (10.5 / 72)));
    curve.setAttribute('stroke-linecap', 'round');
    center.appendChild(curve);
    svg.appendChild(center);

    const ket = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    const ketWidth = targetWidth * 0.14;
    const ketHeight = targetHeight * 0.72;
    const ketX = targetWidth * 0.8;
    const ketY = targetHeight * 0.14;
    ket.setAttribute(
      'points',
      `${ketX + 2},${ketY} ${ketX + ketWidth - 2},${ketY + ketHeight / 2} ${ketX + 2},${ketY + ketHeight} ${ketX + ketWidth * 0.28},${ketY + ketHeight} ${ketX + ketWidth},${ketY + ketHeight / 2} ${ketX + ketWidth * 0.28},${ketY}`,
    );
    ket.setAttribute('fill', 'url(#landing-logo-right)');
    svg.appendChild(ket);

    const image = new Image();
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(svg)], {
        type: 'image/svg+xml;charset=utf-8',
      }),
    );

    image.onload = () => {
      context.clearRect(0, 0, offscreen.width, offscreen.height);
      context.drawImage(image, left, top, targetWidth, targetHeight);
      const points = sampleImageData(context, offscreen.width, offscreen.height, 3, 40);
      URL.revokeObjectURL(url);
      if (points.length === 0) return;

      particlesRef.current.forEach((particle, index) => {
        const point = points[index % points.length];
        particle.tx = point.x + (Math.random() - 0.5) * 1.5;
        particle.ty = point.y + (Math.random() - 0.5) * 1.5;
        particle.color = logoColorForY((point.y - top) / Math.max(1, targetHeight));
      });
    };
    image.src = url;
  };

  useEffect(() => {
    phaseTimingRef.current[phase] = performance.now();

    if (reducedMotion) {
      setLogoRendered(true);
      setShowWordmark(true);
      return;
    }

    if (phase === 'particles_to_logo') buildLogoTargets();
    if (phase === 'logo_done') setLogoRendered(true);
    if (phase === 'qvanta_in') {
      setLogoRendered(true);
      setShowWordmark(true);
    }
    if (phase === 'interaction') {
      setLogoRendered(true);
      setShowWordmark(true);
    }

    if (phase === 'text_break') {
      const { width, height } = sizeRef.current;
      particlesRef.current.forEach((particle) => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 3.5 + Math.random() * 6;
        particle.vx = Math.cos(angle) * speed * (0.5 + Math.random() * 1.1);
        particle.vy =
          Math.sin(angle) * speed * (0.5 + Math.random() * 1.1) - Math.random() * 2.5;
        particle.tx = particle.x + (Math.random() - 0.5) * Math.max(width, height) * 1.8;
        particle.ty = particle.y + (Math.random() - 0.5) * Math.max(width, height) * 1.8;
      });
    }
  }, [phase, reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;

    const context = canvas.getContext('2d');
    if (!context) return undefined;

    const buildTextParticles = (width: number, height: number) => {
      const fontSize = Math.max(22, Math.min(width * 0.065, 72));
      sizeRef.current = { width, height, fontSize };
      const offscreen = document.createElement('canvas');
      offscreen.width = Math.max(1, Math.round(width));
      offscreen.height = Math.max(1, Math.round(height));
      const offscreenContext = offscreen.getContext('2d');
      if (!offscreenContext) return;

      offscreenContext.fillStyle = '#ffffff';
      offscreenContext.font = `600 ${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`;
      offscreenContext.textAlign = 'center';
      offscreenContext.textBaseline = 'middle';
      offscreenContext.shadowColor = 'rgba(120,170,255,0.7)';
      offscreenContext.shadowBlur = 18;
      offscreenContext.fillText(TEXT_STRING, width / 2, height / 2 - 10);
      offscreenContext.shadowBlur = 0;

      let points = sampleImageData(offscreenContext, offscreen.width, offscreen.height, 2, 24);
      if (points.length < 400) {
        offscreenContext.clearRect(0, 0, width, height);
        offscreenContext.fillStyle = '#ffffff';
        offscreenContext.font = `700 ${fontSize}px system-ui, sans-serif`;
        offscreenContext.fillText(TEXT_STRING, width / 2, height / 2 - 10);
        points = sampleImageData(offscreenContext, offscreen.width, offscreen.height, 2, 20);
      }

      const particleCount = getParticleCount(width);
      const particles: Particle[] = [];
      for (let index = 0; index < particleCount; index += 1) {
        const point = points.length > 0 ? points[index % points.length] : undefined;
        const targetX = point ? point.x + (Math.random() - 0.5) * 1.5 : width / 2;
        const targetY = point ? point.y + (Math.random() - 0.5) * 1.5 : height / 2;
        const startX = targetX + (Math.random() - 0.5) * width * 0.95;
        const startY = targetY + (Math.random() - 0.5) * height * 0.95;
        const red = 155 + Math.floor(Math.random() * 55);
        const green = 190 + Math.floor(Math.random() * 55);
        const blue = 225 + Math.floor(Math.random() * 30);

        particles.push({
          x: startX,
          y: startY,
          tx: targetX,
          ty: targetY,
          ox: startX,
          oy: startY,
          vx: 0,
          vy: 0,
          size: 1.1 + Math.random() * 1.6,
          color: point?.color ?? `rgba(${red},${green},${blue},1)`,
          alpha: 0,
          life: Math.random(),
        });
      }
      particlesRef.current = particles;
    };

    const resize = () => {
      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const width = container.clientWidth;
      const height = container.clientHeight;
      canvas.width = Math.max(1, Math.round(width * devicePixelRatio));
      canvas.height = Math.max(1, Math.round(height * devicePixelRatio));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      buildTextParticles(width, height);
      if (phaseRef.current === 'particles_to_logo' || phaseRef.current === 'logo_done' || phaseRef.current === 'qvanta_in' || phaseRef.current === 'tagline' || phaseRef.current === 'interaction') {
        window.setTimeout(buildLogoTargets, 0);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    let cancelled = false;
    const draw = () => {
      if (cancelled) return;
      const { width, height } = sizeRef.current;
      const now = performance.now();
      const currentPhase = phaseRef.current;
      const timings = phaseTimingRef.current;
      const textStart = timings.text_particles;
      const breakStart = timings.text_break;
      const logoStart = timings.particles_to_logo;
      const logoDone = timings.logo_done;
      const showText = textStart
        ? easeOutExpo(Math.min(1, Math.max(0, now - textStart) / 700))
        : 0;
      const breakProgress = breakStart
        ? easeInCubic(Math.min(1, Math.max(0, now - breakStart) / 900))
        : 0;
      const formProgress = logoStart
        ? easeOutCubic(Math.min(1, Math.max(0, now - logoStart) / 1800))
        : 0;
      const glowProgress = logoDone
        ? Math.min(1, Math.max(0, now - logoDone) / 500)
        : 0;

      context.clearRect(0, 0, width, height);
      if (currentPhase === 'text_break' || currentPhase === 'particles_to_logo') {
        context.fillStyle = 'rgba(0,0,0,0.2)';
        context.fillRect(0, 0, width, height);
      } else if (currentPhase !== 'init' && currentPhase !== 'text_particles') {
        context.fillStyle = 'rgba(0,0,0,0.16)';
        context.fillRect(0, 0, width, height);
      }

      context.globalCompositeOperation = 'lighter';
      particlesRef.current.forEach((particle) => {
        if (currentPhase === 'init') {
          particle.alpha = 0;
        } else if (currentPhase === 'text_particles') {
          const jitter = (1 - showText) * 14;
          particle.x = lerp(particle.ox, particle.tx, easeOutQuad(showText)) + (Math.random() - 0.5) * jitter;
          particle.y = lerp(particle.oy, particle.ty, easeOutQuad(showText)) + (Math.random() - 0.5) * jitter;
          const flicker = 0.82 + Math.sin(now / 130 + particle.life * 20) * 0.16;
          particle.alpha = lerp(particle.alpha, flicker * showText, 0.32);
          particle.size = 1.15 + showText * 0.85;
        } else if (currentPhase === 'text_break') {
          particle.vy += -0.03 + Math.sin(now / 170 + particle.life * 13) * 0.02;
          particle.vx += Math.sin(now / 150 + particle.life * 19) * 0.025 * (particle.life < 0.5 ? 1 : -1);
          particle.vx *= 1 - breakProgress * 0.013;
          particle.vy *= 1 - breakProgress * 0.007;
          particle.x += particle.vx * (1 + breakProgress * 1.8);
          particle.y += particle.vy * (1 + breakProgress * 1.8);
          particle.alpha = lerp(particle.alpha, Math.max(0.6, 0.95 - breakProgress * 0.3), 0.14);
          particle.size = 1.15 + (1 - breakProgress * 0.6) * 0.75;
        } else {
          const form = Math.max(formProgress, currentPhase === 'particles_to_logo' ? 0 : 1);
          const pull = 0.032 + form * 0.095;
          particle.vx = lerp(particle.vx, (particle.tx - particle.x) * pull, 0.11 + form * 0.06);
          particle.vy = lerp(particle.vy, (particle.ty - particle.y) * pull, 0.11 + form * 0.06);
          particle.vx *= 0.88;
          particle.vy *= 0.88;
          particle.x += particle.vx;
          particle.y += particle.vy;
          const pulse = 0.72 + Math.sin(now / 380 + particle.life * Math.PI * 2) * 0.23 + glowProgress * 0.22;
          particle.alpha = lerp(particle.alpha, pulse, 0.14);
          particle.size = 1.2 + form * 0.6;
        }

        context.fillStyle = particle.color;
        context.globalAlpha = Math.max(0, Math.min(1, particle.alpha));
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size * (0.85 + glowProgress * 0.25), 0, Math.PI * 2);
        context.fill();
      });
      context.globalAlpha = 1;
      context.globalCompositeOperation = 'source-over';
      animationFrameRef.current = window.requestAnimationFrame(draw);
    };

    if (!reducedMotion) animationFrameRef.current = window.requestAnimationFrame(draw);

    return () => {
      cancelled = true;
      if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [reducedMotion]);

  const taglineVisible = reducedMotion || introSkipped || phase === 'tagline' || phase === 'interaction';
  const actionsVisible = reducedMotion || introSkipped || phase === 'interaction';
  const phaseClass = `landing-experience landing-experience--${phase}${reducedMotion ? ' is-reduced-motion' : ''}`;

  return (
    <main ref={containerRef} className={phaseClass} aria-labelledby="landing-title">
      <a
        className="landing-skip-link"
        href="#landing-actions"
        onClick={() => setIntroSkipped(true)}
      >
        Skip intro
      </a>

      <div className="landing-space" aria-hidden="true">
        <span className="landing-space__orb landing-space__orb--violet" />
        <span className="landing-space__orb landing-space__orb--cyan" />
        <span className="landing-space__grid" />
      </div>

      <header className="landing-chrome" aria-label="QVANTA">
        <span className="landing-chrome__brand">QVANTA</span>
        <span className="landing-chrome__status"><i /> Quantum learning system / 01</span>
      </header>

      <h1 id="landing-title" className="landing-visually-hidden">QVANTA — think in states, build with qubits</h1>

      <canvas ref={canvasRef} className="landing-canvas" aria-hidden="true" />

      <div className={`landing-lockup${logoRendered ? ' is-visible' : ''}`} aria-hidden="true">
        <div className="landing-lockup__mark"><Logo size={240} /></div>
        <div className={`landing-lockup__wordmark${showWordmark ? ' is-visible' : ''}`}>
          <span>QVANTA</span>
          <small>Quantum Platform</small>
        </div>
      </div>

      <div className={`landing-tagline${taglineVisible ? ' is-visible' : ''}`}>
        <span className="landing-tagline__kicker">Think in states <b>·</b> Build with qubits</span>
        <p>An interactive quantum computing workspace. Design circuits, explore Bloch spheres, and learn quantum mechanics — one qubit at a time.</p>
      </div>

      <div id="landing-actions" className={`landing-actions${actionsVisible ? ' is-visible' : ''}`}>
        <Link className="landing-action landing-action--primary" to="/home" tabIndex={actionsVisible ? 0 : -1}>
          Enter the workspace <ArrowIcon />
        </Link>
        <Link className="landing-action landing-action--quiet" to="/register" tabIndex={actionsVisible ? 0 : -1}>
          Create a free account <span aria-hidden="true">↗</span>
        </Link>
      </div>

      <footer className="landing-footer">
        <span>QVANTA / VISUAL QUANTUM LEARNING</span>
        <span>Scroll not required <b>—</b> curiosity is.</span>
      </footer>
    </main>
  );
}
