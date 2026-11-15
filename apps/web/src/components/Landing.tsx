// import { useEffect, useRef, useState, type FC } from 'react';
// import { Link } from 'react-router-dom';
// import Logo from '@/components/ui/Logo';
// import './landing/Landing.css';

// export type LandingPhase =
//   | 'init'
//   | 'text_particles'
//   | 'text_break'
//   | 'particles_to_logo'
//   | 'logo_done'
//   | 'qvanta_in'
//   | 'tagline'
//   | 'interaction';

// interface LandingProps {
//   phase: LandingPhase;
//   reducedMotion: boolean;
// }

// interface Particle {
//   x: number;
//   y: number;
//   tx: number;
//   ty: number;
//   vx: number;
//   vy: number;
//   size: number;
//   color: string;
//   alpha: number;
//   life: number;
//   ox: number;
//   oy: number;
// }

// const PARTICLE_COUNT = 2400;
// const TEXT_STRING = 'MAKE QUANTUM VISIBLE';

// const sampleImageData = (
//   ctx: CanvasRenderingContext2D,
//   width: number,
//   height: number,
//   stride: number,
//   alphaThreshold = 24,
// ): Array<{ x: number; y: number; color: string }> => {
//   const data = ctx.getImageData(0, 0, width, height).data;
//   const points: Array<{ x: number; y: number; color: string }> = [];

//   for (let y = 0; y < height; y += stride) {
//     for (let x = 0; x < width; x += stride) {
//       const index = (y * width + x) * 4;
//       const alpha = data[index + 3];
//       if (alpha <= alphaThreshold) continue;

//       const red = Math.min(255, data[index] + 40);
//       const green = Math.min(255, data[index + 1] + 40);
//       const blue = Math.min(255, data[index + 2] + 40);
//       points.push({ x, y, color: `rgba(${red},${green},${blue},1)` });
//     }
//   }

//   return points;
// };

// const logoColorForY = (percentage: number): string => {
//   const stops = [
//     [0, [139, 92, 246]],
//     [0.25, [99, 102, 241]],
//     [0.55, [59, 130, 246]],
//     [0.85, [34, 211, 238]],
//     [1, [236, 72, 153]],
//   ] as const;
//   const value = Math.max(0, Math.min(1, percentage));

//   for (let index = 1; index < stops.length; index += 1) {
//     const [end, endColor] = stops[index];
//     if (value > end) continue;

//     const [start, startColor] = stops[index - 1];
//     const progress = (value - start) / (end - start);
//     const red = Math.round(startColor[0] + (endColor[0] - startColor[0]) * progress);
//     const green = Math.round(startColor[1] + (endColor[1] - startColor[1]) * progress);
//     const blue = Math.round(startColor[2] + (endColor[2] - startColor[2]) * progress);
//     return `rgba(${red},${green},${blue},1)`;
//   }

//   const [, finalColor] = stops[stops.length - 1];
//   return `rgba(${finalColor[0]},${finalColor[1]},${finalColor[2]},1)`;
// };

// const lerp = (start: number, end: number, amount: number) =>
//   start + (end - start) * amount;
// const easeOutCubic = (amount: number) => 1 - (1 - amount) ** 3;
// const easeInCubic = (amount: number) => amount ** 3;
// const easeOutQuad = (amount: number) => 1 - (1 - amount) ** 2;
// const easeOutExpo = (amount: number) =>
//   amount === 1 ? 1 : 1 - 2 ** (-10 * amount);

// const getParticleCount = (width: number): number => {
//   const hardwareConcurrency =
//     typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number'
//       ? navigator.hardwareConcurrency
//       : 8;

//   if (width <= 540) return 900;
//   if (width <= 900) return hardwareConcurrency <= 4 ? 1050 : 1400;
//   if (hardwareConcurrency <= 4) return 1600;
//   return PARTICLE_COUNT;
// };

// const ArrowIcon: FC = () => (
//   <svg aria-hidden="true" className="landing-arrow" viewBox="0 0 16 16" fill="none">
//     <path
//       d="M3 8h9M8.5 3.5 13 8l-4.5 4.5"
//       stroke="currentColor"
//       strokeWidth="1.5"
//       strokeLinecap="round"
//       strokeLinejoin="round"
//     />
//   </svg>
// );

// export default function Landing({ phase, reducedMotion }: LandingProps) {
//   const canvasRef = useRef<HTMLCanvasElement | null>(null);
//   const containerRef = useRef<HTMLElement | null>(null);
//   const particlesRef = useRef<Particle[]>([]);
//   const animationFrameRef = useRef<number | null>(null);
//   const phaseTimingRef = useRef<Partial<Record<LandingPhase, number>>>({});
//   const phaseRef = useRef<LandingPhase>(phase);
//   const sizeRef = useRef({ width: 0, height: 0, fontSize: 40 });
//   const [logoRendered, setLogoRendered] = useState(reducedMotion);
//   const [showWordmark, setShowWordmark] = useState(reducedMotion);
//   const [introSkipped, setIntroSkipped] = useState(false);

//   phaseRef.current = phase;

//   const buildLogoTargets = () => {
//     const { width, height } = sizeRef.current;
//     if (width === 0 || height === 0 || typeof document === 'undefined') return;

//     const offscreen = document.createElement('canvas');
//     offscreen.width = Math.max(1, Math.round(width));
//     offscreen.height = Math.max(1, Math.round(height));
//     const context = offscreen.getContext('2d');
//     if (!context) return;

//     const targetWidth = Math.min(width * 0.48, 520);
//     const targetHeight = targetWidth / (1 / 0.72);
//     const lockupOffset = width > 760 ? targetWidth * 0.12 : 0;
//     const left = Math.round((width - targetWidth) / 2 - lockupOffset);
//     const top = Math.round((height - targetHeight) / 2);
//     const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
//     svg.setAttribute('width', String(targetWidth));
//     svg.setAttribute('height', String(targetHeight));
//     svg.setAttribute('viewBox', `0 0 ${targetWidth} ${targetHeight}`);

//     const createGradient = (id: string, colors: string[]) => {
//       const gradient = document.createElementNS(
//         'http://www.w3.org/2000/svg',
//         'linearGradient',
//       );
//       gradient.setAttribute('id', id);
//       gradient.setAttribute('x1', '0');
//       gradient.setAttribute('y1', '0');
//       gradient.setAttribute('x2', '0');
//       gradient.setAttribute('y2', '1');
//       colors.forEach((color, index) => {
//         const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
//         stop.setAttribute('offset', `${(index / (colors.length - 1)) * 100}%`);
//         stop.setAttribute('stop-color', color);
//         gradient.appendChild(stop);
//       });
//       return gradient;
//     };

//     svg.appendChild(createGradient('landing-logo-left', ['#F7F1EB', '#D8AD96', '#8F102D']));
//     svg.appendChild(createGradient('landing-logo-center', ['#FFFAF7', '#E4D5CC', '#6D001A']));
//     svg.appendChild(createGradient('landing-logo-right', ['#F7F1EB', '#D8AD96', '#8F102D']));

//     const leftBar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
//     leftBar.setAttribute('x', String(targetWidth * 0.06));
//     leftBar.setAttribute('y', String(targetHeight * 0.14));
//     leftBar.setAttribute('width', String(targetWidth * 0.095));
//     leftBar.setAttribute('height', String(targetHeight * 0.72));
//     leftBar.setAttribute('rx', String(targetWidth * 0.045));
//     leftBar.setAttribute('fill', 'url(#landing-logo-left)');
//     svg.appendChild(leftBar);

//     const centerWidth = targetWidth * 0.56;
//     const centerHeight = targetHeight * 0.72;
//     const center = document.createElementNS('http://www.w3.org/2000/svg', 'g');
//     center.setAttribute('transform', `translate(${targetWidth * 0.21},${targetHeight * 0.14})`);

//     const createCenterRect = (x: number, y: number, widthValue: number, heightValue: number, radius: number) => {
//       const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
//       rect.setAttribute('x', String(x));
//       rect.setAttribute('y', String(y));
//       rect.setAttribute('width', String(widthValue));
//       rect.setAttribute('height', String(heightValue));
//       rect.setAttribute('rx', String(radius));
//       rect.setAttribute('fill', 'url(#landing-logo-center)');
//       return rect;
//     };

//     center.appendChild(createCenterRect(centerWidth * (2 / 56), 0, centerWidth * (10.5 / 56), centerHeight * (50 / 72), centerWidth * (5.25 / 56)));
//     center.appendChild(createCenterRect(centerWidth * (22.5 / 56), 0, centerWidth * (11 / 56), centerHeight, centerWidth * (5.5 / 56)));
//     center.appendChild(createCenterRect(centerWidth * (43.5 / 56), 0, centerWidth * (10.5 / 56), centerHeight * (50 / 72), centerWidth * (5.25 / 56)));

//     const curve = document.createElementNS('http://www.w3.org/2000/svg', 'path');
//     const curveY1 = centerHeight * (44 / 72);
//     const curveY2 = centerHeight * (66 / 72);
//     const curveStart = centerWidth * (7.25 / 56);
//     const curveEnd = centerWidth * (48.75 / 56);
//     curve.setAttribute(
//       'd',
//       `M ${curveStart} ${curveY1} Q ${curveStart} ${curveY2} ${centerWidth / 2} ${curveY2} Q ${curveEnd} ${curveY2} ${curveEnd} ${curveY1}`,
//     );
//     curve.setAttribute('fill', 'none');
//     curve.setAttribute('stroke', 'url(#landing-logo-center)');
//     curve.setAttribute('stroke-width', String(centerHeight * (10.5 / 72)));
//     curve.setAttribute('stroke-linecap', 'round');
//     center.appendChild(curve);
//     svg.appendChild(center);

//     const ket = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
//     const ketWidth = targetWidth * 0.14;
//     const ketHeight = targetHeight * 0.72;
//     const ketX = targetWidth * 0.8;
//     const ketY = targetHeight * 0.14;
//     ket.setAttribute(
//       'points',
//       `${ketX + 2},${ketY} ${ketX + ketWidth - 2},${ketY + ketHeight / 2} ${ketX + 2},${ketY + ketHeight} ${ketX + ketWidth * 0.28},${ketY + ketHeight} ${ketX + ketWidth},${ketY + ketHeight / 2} ${ketX + ketWidth * 0.28},${ketY}`,
//     );
//     ket.setAttribute('fill', 'url(#landing-logo-right)');
//     svg.appendChild(ket);

//     const image = new Image();
//     const url = URL.createObjectURL(
//       new Blob([new XMLSerializer().serializeToString(svg)], {
//         type: 'image/svg+xml;charset=utf-8',
//       }),
//     );

//     image.onload = () => {
//       context.clearRect(0, 0, offscreen.width, offscreen.height);
//       context.drawImage(image, left, top, targetWidth, targetHeight);
//       const points = sampleImageData(context, offscreen.width, offscreen.height, 3, 40);
//       URL.revokeObjectURL(url);
//       if (points.length === 0) return;

//       particlesRef.current.forEach((particle, index) => {
//         const point = points[index % points.length];
//         particle.tx = point.x + (Math.random() - 0.5) * 1.5;
//         particle.ty = point.y + (Math.random() - 0.5) * 1.5;
//         particle.color = logoColorForY((point.y - top) / Math.max(1, targetHeight));
//       });
//     };
//     image.src = url;
//   };

//   useEffect(() => {
//     phaseTimingRef.current[phase] = performance.now();

//     if (reducedMotion) {
//       setLogoRendered(true);
//       setShowWordmark(true);
//       return;
//     }

//     if (phase === 'particles_to_logo') buildLogoTargets();
//     if (phase === 'logo_done') setLogoRendered(true);
//     if (phase === 'qvanta_in') {
//       setLogoRendered(true);
//       setShowWordmark(true);
//     }
//     if (phase === 'interaction') {
//       setLogoRendered(true);
//       setShowWordmark(true);
//     }

//     if (phase === 'text_break') {
//       const { width, height } = sizeRef.current;
//       particlesRef.current.forEach((particle) => {
//         const angle = Math.random() * Math.PI * 2;
//         const speed = 3.5 + Math.random() * 6;
//         particle.vx = Math.cos(angle) * speed * (0.5 + Math.random() * 1.1);
//         particle.vy =
//           Math.sin(angle) * speed * (0.5 + Math.random() * 1.1) - Math.random() * 2.5;
//         particle.tx = particle.x + (Math.random() - 0.5) * Math.max(width, height) * 1.8;
//         particle.ty = particle.y + (Math.random() - 0.5) * Math.max(width, height) * 1.8;
//       });
//     }
//   }, [phase, reducedMotion]);

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     const container = containerRef.current;
//     if (!canvas || !container) return undefined;

//     const context = canvas.getContext('2d');
//     if (!context) return undefined;

//     const buildTextParticles = (width: number, height: number) => {
//       const fontSize = Math.max(22, Math.min(width * 0.065, 72));
//       sizeRef.current = { width, height, fontSize };
//       const offscreen = document.createElement('canvas');
//       offscreen.width = Math.max(1, Math.round(width));
//       offscreen.height = Math.max(1, Math.round(height));
//       const offscreenContext = offscreen.getContext('2d');
//       if (!offscreenContext) return;

//       offscreenContext.fillStyle = '#ffffff';
//       offscreenContext.font = `600 ${fontSize}px Inter, ui-sans-serif, system-ui, sans-serif`;
//       offscreenContext.textAlign = 'center';
//       offscreenContext.textBaseline = 'middle';
//       offscreenContext.shadowColor = 'rgba(120,170,255,0.7)';
//       offscreenContext.shadowBlur = 18;
//       offscreenContext.fillText(TEXT_STRING, width / 2, height / 2 - 10);
//       offscreenContext.shadowBlur = 0;

//       let points = sampleImageData(offscreenContext, offscreen.width, offscreen.height, 2, 24);
//       if (points.length < 400) {
//         offscreenContext.clearRect(0, 0, width, height);
//         offscreenContext.fillStyle = '#ffffff';
//         offscreenContext.font = `700 ${fontSize}px system-ui, sans-serif`;
//         offscreenContext.fillText(TEXT_STRING, width / 2, height / 2 - 10);
//         points = sampleImageData(offscreenContext, offscreen.width, offscreen.height, 2, 20);
//       }

//       const particleCount = getParticleCount(width);
//       const particles: Particle[] = [];
//       for (let index = 0; index < particleCount; index += 1) {
//         const point = points.length > 0 ? points[index % points.length] : undefined;
//         const targetX = point ? point.x + (Math.random() - 0.5) * 1.5 : width / 2;
//         const targetY = point ? point.y + (Math.random() - 0.5) * 1.5 : height / 2;
//         const startX = targetX + (Math.random() - 0.5) * width * 0.95;
//         const startY = targetY + (Math.random() - 0.5) * height * 0.95;
//         const red = 155 + Math.floor(Math.random() * 55);
//         const green = 190 + Math.floor(Math.random() * 55);
//         const blue = 225 + Math.floor(Math.random() * 30);

//         particles.push({
//           x: startX,
//           y: startY,
//           tx: targetX,
//           ty: targetY,
//           ox: startX,
//           oy: startY,
//           vx: 0,
//           vy: 0,
//           size: 1.1 + Math.random() * 1.6,
//           color: point?.color ?? `rgba(${red},${green},${blue},1)`,
//           alpha: 0,
//           life: Math.random(),
//         });
//       }
//       particlesRef.current = particles;
//     };

//     const resize = () => {
//       const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
//       const width = container.clientWidth;
//       const height = container.clientHeight;
//       canvas.width = Math.max(1, Math.round(width * devicePixelRatio));
//       canvas.height = Math.max(1, Math.round(height * devicePixelRatio));
//       canvas.style.width = `${width}px`;
//       canvas.style.height = `${height}px`;
//       context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
//       buildTextParticles(width, height);
//       if (phaseRef.current === 'particles_to_logo' || phaseRef.current === 'logo_done' || phaseRef.current === 'qvanta_in' || phaseRef.current === 'tagline' || phaseRef.current === 'interaction') {
//         window.setTimeout(buildLogoTargets, 0);
//       }
//     };

//     resize();
//     window.addEventListener('resize', resize);

//     let cancelled = false;
//     const draw = () => {
//       if (cancelled) return;
//       const { width, height } = sizeRef.current;
//       const now = performance.now();
//       const currentPhase = phaseRef.current;
//       const timings = phaseTimingRef.current;
//       const textStart = timings.text_particles;
//       const breakStart = timings.text_break;
//       const logoStart = timings.particles_to_logo;
//       const logoDone = timings.logo_done;
//       const showText = textStart
//         ? easeOutExpo(Math.min(1, Math.max(0, now - textStart) / 700))
//         : 0;
//       const breakProgress = breakStart
//         ? easeInCubic(Math.min(1, Math.max(0, now - breakStart) / 900))
//         : 0;
//       const formProgress = logoStart
//         ? easeOutCubic(Math.min(1, Math.max(0, now - logoStart) / 1800))
//         : 0;
//       const glowProgress = logoDone
//         ? Math.min(1, Math.max(0, now - logoDone) / 500)
//         : 0;

//       context.clearRect(0, 0, width, height);
//       if (currentPhase === 'text_break' || currentPhase === 'particles_to_logo') {
//         context.fillStyle = 'rgba(0,0,0,0.2)';
//         context.fillRect(0, 0, width, height);
//       } else if (currentPhase !== 'init' && currentPhase !== 'text_particles') {
//         context.fillStyle = 'rgba(0,0,0,0.16)';
//         context.fillRect(0, 0, width, height);
//       }

//       context.globalCompositeOperation = 'lighter';
//       particlesRef.current.forEach((particle) => {
//         if (currentPhase === 'init') {
//           particle.alpha = 0;
//         } else if (currentPhase === 'text_particles') {
//           const jitter = (1 - showText) * 14;
//           particle.x = lerp(particle.ox, particle.tx, easeOutQuad(showText)) + (Math.random() - 0.5) * jitter;
//           particle.y = lerp(particle.oy, particle.ty, easeOutQuad(showText)) + (Math.random() - 0.5) * jitter;
//           const flicker = 0.82 + Math.sin(now / 130 + particle.life * 20) * 0.16;
//           particle.alpha = lerp(particle.alpha, flicker * showText, 0.32);
//           particle.size = 1.15 + showText * 0.85;
//         } else if (currentPhase === 'text_break') {
//           particle.vy += -0.03 + Math.sin(now / 170 + particle.life * 13) * 0.02;
//           particle.vx += Math.sin(now / 150 + particle.life * 19) * 0.025 * (particle.life < 0.5 ? 1 : -1);
//           particle.vx *= 1 - breakProgress * 0.013;
//           particle.vy *= 1 - breakProgress * 0.007;
//           particle.x += particle.vx * (1 + breakProgress * 1.8);
//           particle.y += particle.vy * (1 + breakProgress * 1.8);
//           particle.alpha = lerp(particle.alpha, Math.max(0.6, 0.95 - breakProgress * 0.3), 0.14);
//           particle.size = 1.15 + (1 - breakProgress * 0.6) * 0.75;
//         } else {
//           const form = Math.max(formProgress, currentPhase === 'particles_to_logo' ? 0 : 1);
//           const pull = 0.032 + form * 0.095;
//           particle.vx = lerp(particle.vx, (particle.tx - particle.x) * pull, 0.11 + form * 0.06);
//           particle.vy = lerp(particle.vy, (particle.ty - particle.y) * pull, 0.11 + form * 0.06);
//           particle.vx *= 0.88;
//           particle.vy *= 0.88;
//           particle.x += particle.vx;
//           particle.y += particle.vy;
//           const pulse = 0.72 + Math.sin(now / 380 + particle.life * Math.PI * 2) * 0.23 + glowProgress * 0.22;
//           particle.alpha = lerp(particle.alpha, pulse, 0.14);
//           particle.size = 1.2 + form * 0.6;
//         }

//         context.fillStyle = particle.color;
//         context.globalAlpha = Math.max(0, Math.min(1, particle.alpha));
//         context.beginPath();
//         context.arc(particle.x, particle.y, particle.size * (0.85 + glowProgress * 0.25), 0, Math.PI * 2);
//         context.fill();
//       });
//       context.globalAlpha = 1;
//       context.globalCompositeOperation = 'source-over';
//       animationFrameRef.current = window.requestAnimationFrame(draw);
//     };

//     if (!reducedMotion) animationFrameRef.current = window.requestAnimationFrame(draw);

//     return () => {
//       cancelled = true;
//       if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
//       window.removeEventListener('resize', resize);
//     };
//   }, [reducedMotion]);

//   const taglineVisible = reducedMotion || introSkipped || phase === 'tagline' || phase === 'interaction';
//   const actionsVisible = reducedMotion || introSkipped || phase === 'interaction';
//   const phaseClass = `landing-experience landing-experience--${phase}${reducedMotion ? ' is-reduced-motion' : ''}`;

//   return (
//     <main ref={containerRef} className={phaseClass} aria-labelledby="landing-title">
//       <a
//         className="landing-skip-link"
//         href="#landing-actions"
//         onClick={() => setIntroSkipped(true)}
//       >
//         Skip intro
//       </a>

//       <div className="landing-space" aria-hidden="true">
//         <span className="landing-space__orb landing-space__orb--violet" />
//         <span className="landing-space__orb landing-space__orb--cyan" />
//         <span className="landing-space__grid" />
//       </div>

//       <header className="landing-chrome" aria-label="QVANTA">
//         <span className="landing-chrome__brand">QVANTA</span>
//         <span className="landing-chrome__status"><i /> Quantum learning system / 01</span>
//       </header>

//       <h1 id="landing-title" className="landing-visually-hidden">QVANTA — think in states, build with qubits</h1>

//       <canvas ref={canvasRef} className="landing-canvas" aria-hidden="true" />

//       <div className={`landing-lockup${logoRendered ? ' is-visible' : ''}`} aria-hidden="true">
//         <div className="landing-lockup__mark"><Logo size={240} /></div>
//         <div className={`landing-lockup__wordmark${showWordmark ? ' is-visible' : ''}`}>
//           <span>QVANTA</span>
//           <small>Quantum Platform</small>
//         </div>
//       </div>

//       <div className={`landing-tagline${taglineVisible ? ' is-visible' : ''}`}>
//         <span className="landing-tagline__kicker">Think in states <b>·</b> Build with qubits</span>
//         <p>Follow a guided path from your first qubit to a working circuit: design circuits, explore Bloch spheres, and learn quantum mechanics — one qubit at a time.</p>
//       </div>

//       <div id="landing-actions" className={`landing-actions${actionsVisible ? ' is-visible' : ''}`}>
//         <Link className="landing-action landing-action--primary" to="/home" tabIndex={actionsVisible ? 0 : -1}>
//           Enter the workspace <ArrowIcon />
//         </Link>
//         <Link className="landing-action landing-action--visual" to="/learn" tabIndex={actionsVisible ? 0 : -1}>
//           Explore the Learning Lab <span aria-hidden="true">↗</span>
//         </Link>
//         <Link className="landing-action landing-action--quiet" to="/register" tabIndex={actionsVisible ? 0 : -1}>
//           Create a free account <span aria-hidden="true">↗</span>
//         </Link>
//         <Link className="landing-action landing-action--quiet" to="/login" tabIndex={actionsVisible ? 0 : -1}>
//           Sign in <span aria-hidden="true">↗</span>
//         </Link>
//       </div>

//       <footer className="landing-footer">
//         <span>QVANTA / VISUAL QUANTUM LEARNING</span>
//         <span>Scroll not required <b>—</b> curiosity is.</span>
//       </footer>
//     </main>
//   );
// }
import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";

const PATHS: [string, string][] = [
  ["M 361 453 L 345 464 L 338 483 L 338 703 L 343 741 L 356 780 L 373 811 L 388 831 L 431 870 L 465 890 L 484 898 L 542 914 L 542 1026 L 551 1044 L 566 1052 L 620 1053 L 633 1050 L 645 1040 L 651 1024 L 651 914 L 683 907 L 719 895 L 767 868 L 789 850 L 812 825 L 832 795 L 843 771 L 852 742 L 857 707 L 857 480 L 855 472 L 846 459 L 832 452 L 770 452 L 759 457 L 752 465 L 747 482 L 747 709 L 744 725 L 731 756 L 704 787 L 684 801 L 652 813 L 650 474 L 640 458 L 623 451 L 571 451 L 561 453 L 549 461 L 542 476 L 542 812 L 540 813 L 510 800 L 489 785 L 467 760 L 452 727 L 448 706 L 448 477 L 446 469 L 439 459 L 426 452 Z", "pg"],
  ["M 881 341 L 868 346 L 862 352 L 859 360 L 860 368 L 1033 691 L 833 1033 L 837 1046 L 851 1053 L 949 1053 L 970 1046 L 982 1033 L 1177 701 L 1183 687 L 1183 676 L 1008 354 L 998 346 L 982 341 Z", "cg"],
  ["M 155 256 L 139 262 L 129 273 L 125 284 L 125 1026 L 130 1039 L 138 1047 L 148 1052 L 230 1053 L 247 1045 L 255 1035 L 258 1026 L 258 284 L 252 270 L 244 262 L 234 257 Z", "pg"],
];

const DURATIONS = [10000, 9000, 4600];
const d = (s: number) => ({ "--d": s }) as CSSProperties;

function Defs() {
  return (
    <defs>
      <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#6038F7" /><stop offset=".48" stopColor="#3E59F8" /><stop offset="1" stopColor="#F02FEA" />
      </linearGradient>
      <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#237FF5" /><stop offset=".52" stopColor="#08BDF4" /><stop offset="1" stopColor="#00F0D8" />
      </linearGradient>
    </defs>
  );
}

/* dark scenes: logo draws itself, then fills */
function Logo() {
  return (
    <svg className="qv-logo" viewBox="100 230 1110 850" aria-hidden>
      <Defs />
      {PATHS.map(([p, g], i) => (
        <path key={i} pathLength={1} d={p} stroke={`url(#${g})`} style={{ "--f": `url(#${g})` } as CSSProperties} />
      ))}
    </svg>
  );
}

/* light intro: blueprint outline -> gradient fill + glow */
function Mark() {
  return (
    <svg className="mk" viewBox="100 230 1110 850" aria-hidden>
      <Defs />
      {PATHS.map(([p, g], i) => (
        <g key={i}>
          <path className="o" pathLength={1} d={p} />
          <path className="fl" d={p} fill={`url(#${g})`} />
        </g>
      ))}
    </svg>
  );
}

/* extruded 3D copy of the mark (the tumbling "flip" from the video) */
const LAYERS = 16;
function Flip() {
  return (
    <div className="gl3">
      <div className="fl3">
        <div className="fl3i">
          {Array.from({ length: LAYERS }, (_, k) => (
            <svg
              key={k}
              className="ex"
              viewBox="100 230 1110 850"
              aria-hidden
              style={{
                fill: k === 0 ? "#f7f4ff" : `hsl(255 ${18 - k}% ${86 - k * 1.6}%)`,
                transform: `translateZ(calc(var(--w) * -0.0055 * ${k}))`,
              }}
            >
              {PATHS.map(([p], i) => <path key={i} d={p} />)}
            </svg>
          ))}
        </div>
      </div>
    </div>
  );
}

/* white intro, rebuilt from the video: wordmark -> 3D flip -> blueprint -> lockup */
function Intro() {
  return (
    <div className="ro">
      <div className="w0">QVANTA</div>
      <div className="glow" />
      <Flip />
      <div className="lock">
        <div className="bp">
          <i className="ln v l" /><i className="ln v r" /><i className="ln h t" /><i className="ln h b" />
          <i className="hd a" /><i className="hd b" /><i className="hd c" /><i className="hd e" />
          <Mark />
        </div>
        <div className="lw">QVANTA</div>
      </div>
    </div>
  );
}

const SCENES: { light?: boolean; el: JSX.Element }[] = [
  {
    el: (
      <>
        <div className="pre in" style={d(0.2)}>Presenting</div>
        <Logo />
        <div className="wm big in gt" style={d(2.4)}>QVANTA</div>
        <div className="ind in" style={d(3.2)}>INDUSTRIES</div>
      </>
    ),
  },
  { light: true, el: <Intro /> },
  {
    el: (
      <>
        <div className="eb gt in" style={d(0.2)}>Introducing</div>
        <div className="h in" style={d(0.5)}>Quantum.</div>
        <div className="h gt in" style={d(1.4)}>Finally visible.</div>
        <nav className="cta in" style={d(2.6)}>
          <Link className="p" to="/home">Enter the Workspace <span>→</span></Link>
          <Link className="s" to="/learn">Explore the Learning Lab <span>↗</span></Link>
          <Link className="l" to="/register">Create a free account <span>↗</span></Link>
          <Link className="l" to="/login">Sign in <span>↗</span></Link>
        </nav>
      </>
    ),
  },
];

export default function QvantaLanding() {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (i === SCENES.length - 1) return; // last scene stays on screen, no repeat
    const t = setTimeout(() => setI(i + 1), DURATIONS[i]);
    return () => clearTimeout(t);
  }, [i]);

  return (
    <div className="qv">
      <style>{CSS}</style>
      {SCENES.map((s, k) => (
        <section key={k} className={`scene${s.light ? " light" : ""}${k === i ? " on" : ""}`}>
          <div className="aura" />
          {k === i && s.el}
        </section>
      ))}
    </div>
  );
}

const CSS = `
.qv{position:fixed;inset:0;background:#000;color:#f5f5f7;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;--g:linear-gradient(90deg,#6038f7,#08bdf4 50%,#f02fea)}
.qv *{box-sizing:border-box;margin:0}
.qv .scene{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;opacity:0;visibility:hidden;transition:opacity .9s,visibility .9s;padding:0 5vw}
.qv .scene.on{opacity:1;visibility:visible}
.qv .scene.light{background:#fff;color:#0c0a1a}
.qv .scene.light .aura{display:none}
.qv .aura{position:absolute;left:50%;top:58%;width:90vmax;height:50vmax;translate:-50% -50%;background:radial-gradient(closest-side,rgba(96,56,247,.32),rgba(240,47,234,.12) 60%,transparent);filter:blur(40px);opacity:0;transition:opacity 2s}
.qv .on .aura{opacity:1}
.qv .gt{background:var(--g);-webkit-background-clip:text;background-clip:text;color:transparent}
.qv .in{opacity:0}
.qv .on .in{animation:qvbi 1.5s cubic-bezier(.2,.7,.2,1) forwards;animation-delay:calc(var(--d,0)*1s)}
@keyframes qvbi{from{opacity:0;filter:blur(16px);transform:translateY(22px)}to{opacity:1;filter:none;transform:none}}
.qv .eb{font-size:clamp(13px,1.6vw,19px);font-weight:600;letter-spacing:.02em;margin-bottom:1.6vh}
.qv .h{font-size:clamp(34px,7.4vw,96px);font-weight:700;letter-spacing:-.035em;line-height:1.03}
.qv .pre{font-size:clamp(13px,1.8vw,20px);color:#86868b;font-weight:500;margin-bottom:3vh}
.qv .qv-logo{position:relative;width:min(30vmin,240px);overflow:visible;filter:drop-shadow(0 0 34px rgba(96,56,247,.6)) drop-shadow(0 0 50px rgba(0,240,216,.22))}
.qv .qv-logo path{fill:transparent;stroke-width:5;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1}
.qv .on .qv-logo path{animation:qvdr 2.2s cubic-bezier(.6,0,.2,1) forwards,qvfl 1s 1.9s forwards}
.qv .on .qv-logo path:nth-child(3){animation-delay:.25s,2.1s}
.qv .on .qv-logo path:nth-child(4){animation-delay:.5s,2.3s}
@keyframes qvdr{to{stroke-dashoffset:0}}
@keyframes qvfl{to{fill:var(--f);stroke-opacity:0}}
.qv .wm{position:relative;font-size:clamp(30px,6.5vw,76px);font-weight:600;letter-spacing:.42em;margin-right:-.42em;margin-top:4vh}
.qv .wm.big{font-size:clamp(40px,9vw,120px);margin-top:3vh}
.qv .ind{font-size:clamp(14px,2.4vw,28px);font-weight:500;letter-spacing:.9em;margin-right:-.9em;margin-top:1.4vh}

/* ---- bottom call-to-action bar ---- */
.qv .cta{position:absolute;left:4vw;right:4vw;bottom:6vh;display:flex;align-items:center;justify-content:center;gap:clamp(10px,1.6vw,22px);flex-wrap:wrap}
.qv .cta a{display:inline-flex;align-items:center;gap:14px;height:clamp(46px,5.2vw,58px);padding:0 clamp(16px,2.2vw,28px);border-radius:6px;font-size:clamp(11px,1vw,13px);font-weight:600;letter-spacing:.2em;text-transform:uppercase;text-decoration:none;white-space:nowrap;color:#d9d6e0;transition:background .25s,border-color .25s,color .25s,box-shadow .25s}
.qv .cta .p{border:1px solid rgba(190,50,70,.55);background:linear-gradient(135deg,rgba(130,14,34,.6),rgba(40,18,28,.75));box-shadow:0 0 40px rgba(160,20,45,.25)}
.qv .cta .p:hover{border-color:rgba(230,80,100,.85);box-shadow:0 0 56px rgba(190,30,60,.4)}
.qv .cta .s{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.03)}
.qv .cta .s:hover{border-color:rgba(255,255,255,.32);background:rgba(255,255,255,.07)}
.qv .cta .l{color:#8a86a0;padding:0 clamp(8px,1.4vw,18px)}
.qv .cta .l:hover{color:#f5f5f7}
.qv .cta span{font-size:1.15em;letter-spacing:0}

/* ---- intro (white) ---- */
.qv .gl3,.qv .glow{position:absolute;left:50%;top:50%;translate:-50% -50%;pointer-events:none}
.qv .gl3{--w:min(34vmin,300px);width:var(--w);aspect-ratio:1110/850}
.qv .fl3{position:absolute;inset:0;opacity:0;perspective:900px}
.qv .fl3i{position:absolute;inset:0;transform-style:preserve-3d}
.qv .on .fl3i{animation:qvtum 1.5s cubic-bezier(.3,.7,.2,1) .75s forwards}
.qv .on .fl3{animation:qvfl3 2.3s ease .75s forwards}
.qv .ex{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
@keyframes qvfl3{0%{opacity:0;filter:blur(8px)}10%{opacity:1;filter:blur(3px)}45%{filter:none}70%{opacity:1;filter:none}100%{opacity:0;filter:blur(10px)}}
@keyframes qvtum{
0%{transform:translate(-5vw,0) scale(.16) rotateX(62deg) rotateY(-42deg) rotateZ(48deg)}
55%{transform:translate(-2.5vw,0) scale(.5) rotateX(38deg) rotateY(-30deg) rotateZ(14deg)}
100%{transform:none}}
.qv .glow{width:min(60vmin,540px);height:min(26vmin,240px);border-radius:50%;background:radial-gradient(closest-side,rgba(110,60,247,.8),rgba(110,60,247,.3) 60%,transparent);filter:blur(28px);opacity:0}
.qv .on .glow{animation:qvglow 1.9s ease 1.3s forwards}
@keyframes qvglow{0%{opacity:0;scale:.6}35%{opacity:1;scale:1}70%{opacity:.8}100%{opacity:0;scale:1.05}}
.qv .ro{position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center}
.qv .w0{position:absolute;font-size:clamp(40px,9vw,120px);font-weight:700;letter-spacing:-.02em;color:#6038f7;opacity:0}
.qv .on .w0{animation:qvw 1.9s ease .1s forwards}
@keyframes qvw{0%{opacity:0;filter:blur(18px);transform:scale(.96)}30%,62%{opacity:1;filter:none;transform:none}100%{opacity:0;filter:blur(22px);transform:scale(1.05)}}
.qv .lock{display:flex;align-items:center;justify-content:center}
.qv .on .lock{animation:qvout .7s ease 8.1s forwards}
@keyframes qvout{to{opacity:0;filter:blur(14px)}}
.qv .bp{position:relative;width:min(34vmin,300px);aspect-ratio:1110/850;flex:none}
.qv .on .bp{animation:qvsh 1.1s cubic-bezier(.6,0,.2,1) 5.7s forwards}
@keyframes qvsh{to{width:min(11vmin,96px)}}
.qv .lw{overflow:hidden;white-space:nowrap;padding:.1em 0;max-width:0;opacity:0;font-size:clamp(28px,5vw,64px);font-weight:700;letter-spacing:.04em;color:#0c0a1a}
.qv .on .lw{animation:qvlw 1.1s cubic-bezier(.6,0,.2,1) 5.7s forwards}
@keyframes qvlw{from{max-width:0;opacity:0;margin-left:0;filter:blur(10px)}to{max-width:8em;opacity:1;margin-left:.45em;filter:none}}
.qv .ln{position:absolute;background:#d6d6e0;opacity:0}
.qv .ln.v{top:-100vh;bottom:-100vh;width:1px;transform:scaleY(0)}
.qv .ln.h{left:-100vw;right:-100vw;height:1px;transform:scaleX(0)}
.qv .ln.l{left:2.25%}.qv .ln.r{left:97.5%}.qv .ln.t{top:3.06%}.qv .ln.b{top:96.8%}
.qv .hd{position:absolute;width:10px;height:10px;background:#bdbdc9;translate:-50% -50%;opacity:0}
.qv .hd.a{left:2.25%;top:3.06%}.qv .hd.b{left:97.5%;top:3.06%}.qv .hd.c{left:2.25%;top:96.8%}.qv .hd.e{left:97.5%;top:96.8%}
.qv .on .ln{animation:qvln 1.2s cubic-bezier(.6,0,.2,1) 2.5s forwards,qvfo .6s ease 5.4s forwards}
.qv .on .hd{animation:qvhd .5s ease 3.4s forwards,qvfo .6s ease 5.4s forwards}
@keyframes qvln{to{opacity:1;transform:none}}
@keyframes qvhd{from{opacity:0;scale:0}to{opacity:1;scale:1}}
@keyframes qvfo{to{opacity:0}}
.qv .mk{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.qv .mk .o{fill:none;stroke:#b4b4c2;stroke-width:3;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1}
.qv .on .mk .o{animation:qvdr 1.6s cubic-bezier(.6,0,.2,1) 2.7s forwards,qvfo .6s ease 4.4s forwards}
.qv .mk .fl{opacity:0}
.qv .on .mk .fl{animation:qvfi .8s ease 4.2s forwards}
@keyframes qvfi{to{opacity:1}}
.qv .on .mk{animation:qvgl 1.8s ease 4.2s forwards}
@keyframes qvgl{0%{filter:drop-shadow(0 0 0 rgba(96,56,247,0))}35%{filter:drop-shadow(0 0 28px rgba(96,56,247,.75)) drop-shadow(0 0 60px rgba(96,56,247,.45))}100%{filter:drop-shadow(0 0 6px rgba(96,56,247,.18))}}
@media (prefers-reduced-motion:reduce){.qv *{animation-duration:.01s!important}}
`;