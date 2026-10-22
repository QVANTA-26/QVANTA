import React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Grid, Html, Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Badge, Button } from '@qvanta/ui';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import type { AlgorithmDefinition, AlgorithmStage, AlgorithmStageKind } from '@/data/algorithms';

interface AlgorithmVisualizationProps {
  algorithm: AlgorithmDefinition;
  activeStage: number;
  playing: boolean;
  onStageChange: (stage: number) => void;
  onTogglePlaying: () => void;
}

const STAGE_COLORS: Record<AlgorithmStageKind, string> = {
  prepare: '#8f102d',
  oracle: '#b76e79',
  interference: '#e4d5cc',
  measure: '#d19b83',
  communicate: '#9fb3a4',
  estimate: '#c890aa',
  factor: '#8aa58e',
};

const STAGE_ICONS: Record<AlgorithmStageKind, string> = {
  prepare: 'P',
  oracle: 'Ω',
  interference: '∿',
  measure: 'M',
  communicate: '↔',
  estimate: 'E',
  factor: 'ƒ',
};

const stageX = (index: number, count: number): number => {
  if (count <= 1) return 0;
  return -3.15 + (index / (count - 1)) * 6.3;
};

const StageNode: React.FC<{ stage: AlgorithmStage; index: number; count: number; active: boolean; onClick: () => void }> = ({
  stage,
  index,
  count,
  active,
  onClick,
}) => {
  const color = STAGE_COLORS[stage.kind];
  const isMeasure = stage.kind === 'measure';
  const isInterference = stage.kind === 'interference';
  const isCommunication = stage.kind === 'communicate';

  return (
    <group position={[stageX(index, count), 0.18, 0]} onClick={(event) => { event.stopPropagation(); onClick(); }}>
      <mesh position={[0, 0.46, 0]} castShadow>
        {isMeasure ? (
          <cylinderGeometry args={[0.28, 0.28, 0.48, 24]} />
        ) : isInterference ? (
          <torusGeometry args={[0.25, 0.095, 14, 32]} />
        ) : isCommunication ? (
          <sphereGeometry args={[0.29, 22, 18]} />
        ) : (
          <boxGeometry args={[0.52, 0.52, 0.52]} />
        )}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={active ? 1.2 : 0.35}
          roughness={0.42}
          metalness={0.16}
        />
      </mesh>
      <mesh position={[0, 0.46, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[active ? 0.48 : 0.39, 0.018, 8, 36]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.75 : 0.28} />
      </mesh>
      <Html center distanceFactor={7} position={[0, 0.46, 0.34]} style={{ pointerEvents: 'none' }}>
        <span className="font-mono-quantum text-[12px] font-semibold text-white" style={{ textShadow: '0 1px 5px rgba(0,0,0,0.9)' }}>
          {STAGE_ICONS[stage.kind]}
        </span>
      </Html>
      <Html center distanceFactor={7} position={[0, -0.12, 0]} style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        <span className={`font-mono-quantum text-[10px] ${active ? 'text-text-50' : 'text-text-400'}`}>
          {stage.label}
        </span>
      </Html>
    </group>
  );
};

const SignalPulse: React.FC<{ activeStage: number; count: number; color: string; reducedMotion: boolean }> = ({
  activeStage,
  count,
  color,
  reducedMotion,
}) => {
  const ref = React.useRef<THREE.Mesh | null>(null);
  const phase = React.useRef(0);

  useFrame((_, delta) => {
    if (!ref.current) return;
    if (reducedMotion) {
      ref.current.position.x = stageX(activeStage, count);
      return;
    }

    phase.current = (phase.current + delta * 0.62) % 1;
    const local = (activeStage + phase.current) / Math.max(1, count - 1);
    ref.current.position.x = -3.15 + Math.min(1, local) * 6.3;
    ref.current.position.y = 0.52 + Math.sin(phase.current * Math.PI * 2) * 0.06;
  });

  return (
    <mesh ref={ref} position={[stageX(activeStage, count), 0.52, 0.08]}>
      <sphereGeometry args={[0.105, 16, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} />
      <pointLight color={color} intensity={0.75} distance={1.5} />
    </mesh>
  );
};

const GroverField: React.FC<{ activeStage: number; reducedMotion: boolean; color: string }> = ({ activeStage, reducedMotion, color }) => {
  const bars = React.useRef<THREE.Group[]>([]);
  const target = activeStage >= 2 ? 2.5 : 0.65;

  useFrame((_, delta) => {
    bars.current.forEach((bar, index) => {
      const isMarked = index === 5;
      const desired = isMarked ? target : activeStage >= 2 ? 0.55 : 1.05;
      const next = reducedMotion ? desired : THREE.MathUtils.damp(bar.scale.y, desired, 4.5, delta);
      bar.scale.y = next;
      bar.position.y = next * 0.22;
    });
  });

  return (
    <group position={[0, 0, -1.3]}>
      {Array.from({ length: 8 }).map((_, index) => {
        const x = -2.45 + index * 0.7;
        return (
          <group key={index} ref={(node) => { if (node) bars.current[index] = node; }} position={[x, 0.24, 0]}>
            <mesh>
              <boxGeometry args={[0.32, 0.48, 0.32]} />
              <meshStandardMaterial
                color={index === 5 ? color : '#514449'}
                emissive={index === 5 ? color : '#22191c'}
                emissiveIntensity={index === 5 ? 1.1 : 0.18}
                transparent
                opacity={0.92}
              />
            </mesh>
            {index === 5 && <Html center distanceFactor={7} position={[0, 0.72, 0]} style={{ pointerEvents: 'none' }}><span className="font-mono-quantum text-[9px] text-amber-200">marked</span></Html>}
          </group>
        );
      })}
      <Html position={[0, -0.18, 0]} center distanceFactor={7} style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        <span className="font-mono-quantum text-[9px] text-text-500">amplitude field · oracle → diffusion → winner</span>
      </Html>
    </group>
  );
};

const TeleportField: React.FC<{ activeStage: number; reducedMotion: boolean; color: string }> = ({ activeStage, reducedMotion, color }) => {
  const pulse = React.useRef<THREE.Mesh | null>(null);
  const clock = React.useRef(0);

  useFrame((_, delta) => {
    if (!pulse.current) return;
    if (reducedMotion) {
      pulse.current.position.x = activeStage >= 2 ? 1.75 : -1.75;
      return;
    }
    clock.current = (clock.current + delta * 0.7) % 1;
    pulse.current.position.x = -1.75 + clock.current * 3.5;
  });

  return (
    <group position={[0, 0, -1.28]}>
      <Line points={[[-1.8, 0.36, 0], [0, 0.36, 0], [1.8, 0.36, 0]]} color={color} transparent opacity={0.55} lineWidth={2} />
      {[
        { x: -1.8, label: 'source' },
        { x: 0, label: 'Alice' },
        { x: 1.8, label: 'Bob' },
      ].map((station) => (
        <group key={station.label} position={[station.x, 0.36, 0]}>
          <mesh>
            <cylinderGeometry args={[0.25, 0.31, 0.22, 20]} />
            <meshStandardMaterial color={station.label === 'Bob' ? '#9fb3a4' : color} emissive={station.label === 'Bob' ? '#9fb3a4' : color} emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color="#fffaf7" emissive="#e4d5cc" emissiveIntensity={1.5} />
          </mesh>
          <Html center distanceFactor={7} position={[0, -0.28, 0]} style={{ pointerEvents: 'none' }}>
            <span className="font-mono-quantum text-[9px] text-text-300">{station.label}</span>
          </Html>
        </group>
      ))}
      <mesh ref={pulse} position={[-1.75, 0.58, 0.08]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color="#fffaf7" emissive={color} emissiveIntensity={2} />
        <pointLight color={color} intensity={0.7} distance={1.3} />
      </mesh>
      <Html position={[0, -0.18, 0]} center distanceFactor={7} style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        <span className="font-mono-quantum text-[9px] text-text-500">entangled resource · 2 classical bits · correction</span>
      </Html>
    </group>
  );
};

const PhaseField: React.FC<{ activeStage: number; reducedMotion: boolean; color: string; shor?: boolean }> = ({ activeStage, reducedMotion, color, shor = false }) => {
  const group = React.useRef<THREE.Group | null>(null);
  useFrame((_, delta) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y += delta * (activeStage >= 2 ? 0.45 : 0.18);
    group.current.rotation.z = Math.sin(group.current.rotation.y * 0.6) * 0.08;
  });

  return (
    <group ref={group} position={[0, 0.35, -1.25]}>
      {Array.from({ length: shor ? 5 : 4 }).map((_, index) => (
        <mesh key={index} rotation={[Math.PI / 2, index * 0.26, 0]}>
          <torusGeometry args={[0.45 + index * 0.25, 0.012, 8, 64]} />
          <meshBasicMaterial color={index === 3 ? color : '#756963'} transparent opacity={activeStage >= 1 ? 0.55 - index * 0.05 : 0.24} />
        </mesh>
      ))}
      <mesh position={[0, 0.04, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} />
      </mesh>
      <Html position={[0, -0.25, 0]} center distanceFactor={7} style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        <span className="font-mono-quantum text-[9px] text-text-500">phase rings · controlled rotations · frequency peak</span>
      </Html>
    </group>
  );
};

const VqeField: React.FC<{ activeStage: number; reducedMotion: boolean; color: string }> = ({ activeStage, reducedMotion, color }) => {
  const marker = React.useRef<THREE.Mesh | null>(null);
  const phase = React.useRef(0);
  const curve = React.useMemo(() => {
    const points: [number, number, number][] = [];
    for (let index = 0; index <= 24; index += 1) {
      const x = -2.8 + index * 0.23;
      const y = 0.25 + 0.45 * Math.sin(index * 0.5) + 0.22 * Math.cos(index * 0.9);
      points.push([x, y, -1.25]);
    }
    return points;
  }, []);

  useFrame((_, delta) => {
    if (!marker.current) return;
    if (reducedMotion) {
      marker.current.position.x = activeStage >= 2 ? 1.2 : -1.6;
      marker.current.position.y = activeStage >= 2 ? 0.3 : 0.8;
      return;
    }
    phase.current = (phase.current + delta * 0.3) % 1;
    const x = activeStage >= 2 ? 1.2 - phase.current * 0.9 : -1.6 + phase.current * 0.35;
    marker.current.position.x = x;
    marker.current.position.y = activeStage >= 2 ? 0.34 : 0.72;
  });

  return (
    <group>
      <Line points={curve} color={color} transparent opacity={0.7} lineWidth={2} />
      <mesh ref={marker} position={[-1.6, 0.72, -1.17]}>
        <sphereGeometry args={[0.12, 18, 18]} />
        <meshStandardMaterial color="#fffaf7" emissive={color} emissiveIntensity={2} />
      </mesh>
      <Html position={[0, -0.2, -1.2]} center distanceFactor={7} style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        <span className="font-mono-quantum text-[9px] text-text-500">energy landscape · measure · update θ · converge</span>
      </Html>
    </group>
  );
};

const BranchField: React.FC<{ activeStage: number; color: string }> = ({ activeStage, color }) => (
  <group position={[0, 0.3, -1.25]}>
    <Line points={[[-2.8, 0.1, 0], [-0.9, 0.1, 0], [0.2, 0.9, 0], [2.5, 0.9, 0]]} color={color} transparent opacity={activeStage >= 1 ? 0.72 : 0.3} lineWidth={1.6} />
    <Line points={[[-2.8, 0.1, 0], [-0.9, 0.1, 0], [0.2, -0.7, 0], [2.5, -0.7, 0]]} color="#756963" transparent opacity={activeStage >= 1 ? 0.52 : 0.22} lineWidth={1.2} />
    {[-0.9, 0.2, 1.25, 2.3].map((x, index) => (
      <mesh key={x} position={[x, index % 2 === 0 ? 0.9 : -0.7, 0.05]}>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial color={index === 3 && activeStage >= 3 ? color : '#756963'} emissive={color} emissiveIntensity={index === 3 && activeStage >= 3 ? 1.3 : 0.12} />
      </mesh>
    ))}
    <Html position={[0, -0.2, 0]} center distanceFactor={7} style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
      <span className="font-mono-quantum text-[9px] text-text-500">coherent branches · phase mark · interference</span>
    </Html>
  </group>
);

const Mechanism: React.FC<{ algorithm: AlgorithmDefinition; activeStage: number; reducedMotion: boolean }> = ({ algorithm, activeStage, reducedMotion }) => {
  const color = algorithm.accent;
  if (algorithm.id === 'grover-search') return <GroverField activeStage={activeStage} reducedMotion={reducedMotion} color={color} />;
  if (algorithm.id === 'quantum-teleportation') return <TeleportField activeStage={activeStage} reducedMotion={reducedMotion} color={color} />;
  if (algorithm.id === 'quantum-fourier-transform') return <PhaseField activeStage={activeStage} reducedMotion={reducedMotion} color={color} />;
  if (algorithm.id === 'shors-factoring') return <PhaseField activeStage={activeStage} reducedMotion={reducedMotion} color={color} shor />;
  if (algorithm.id === 'variational-eigensolver') return <VqeField activeStage={activeStage} reducedMotion={reducedMotion} color={color} />;
  return <BranchField activeStage={activeStage} color={color} />;
};

const AlgorithmScene: React.FC<{ algorithm: AlgorithmDefinition; activeStage: number; reducedMotion: boolean }> = ({ algorithm, activeStage, reducedMotion }) => {
  const count = algorithm.stages.length;
  const activeColor = STAGE_COLORS[algorithm.stages[activeStage]?.kind ?? 'prepare'];

  return (
    <>
      <ambientLight intensity={0.72} />
      <pointLight position={[-3, 4, 4]} color={algorithm.accent} intensity={2.2} distance={8} />
      <pointLight position={[3, 2, 2]} color="#e4d5cc" intensity={1.4} distance={7} />
      <directionalLight position={[0, 5, 4]} intensity={0.4} />
      <Grid
        position={[0, -0.03, 0]}
        args={[9, 5]}
        cellSize={0.5}
        cellThickness={0.35}
        cellColor="#292122"
        sectionSize={2}
        sectionThickness={0.8}
        sectionColor="#554944"
        fadeDistance={16}
        fadeStrength={1}
        infiniteGrid={false}
      />
      <Line points={[[-3.25, 0.18, 0], [3.25, 0.18, 0]]} color="#756963" transparent opacity={0.55} lineWidth={1.5} />
      {algorithm.stages.map((stage, index) => (
        <StageNode
          key={stage.id}
          stage={stage}
          index={index}
          count={count}
          active={index === activeStage}
          onClick={() => undefined}
        />
      ))}
      <SignalPulse activeStage={activeStage} count={count} color={activeColor} reducedMotion={reducedMotion} />
      <Mechanism algorithm={algorithm} activeStage={activeStage} reducedMotion={reducedMotion} />
      <Html position={[-3.25, 1.45, 0]} center distanceFactor={7} style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        <span className="font-mono-quantum text-[9px] uppercase tracking-[0.18em] text-text-500">algorithm trace</span>
      </Html>
      <Html position={[3.25, 1.45, 0]} center distanceFactor={7} style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        <span className="font-mono-quantum text-[9px] text-accent-200">step {activeStage + 1}/{count}</span>
      </Html>
    </>
  );
};

const AlgorithmVisualization: React.FC<AlgorithmVisualizationProps> = ({
  algorithm,
  activeStage,
  playing,
  onStageChange,
  onTogglePlaying,
}) => {
  const reducedMotion = usePrefersReducedMotion();
  const stage = algorithm.stages[activeStage] ?? algorithm.stages[0];

  return (
    <section className="overflow-hidden rounded-2xl border border-primary-500/20 bg-bg-950/85" aria-labelledby="algorithm-visualization-title">
      <div className="flex flex-col gap-3 border-b border-bg-800 bg-bg-900/75 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-7">
        <div>
          <p className="font-mono-quantum text-[10px] uppercase tracking-[0.18em] text-cyan-300">Algorithm observatory · live 3D</p>
          <h2 id="algorithm-visualization-title" className="mt-1 text-lg font-semibold text-text-50">Watch the idea move, not just the formula</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-text-400">Orbit the scene, step through the mechanism, and connect each visual change to the algorithm’s mathematical job.</p>
        </div>
        <Badge variant={reducedMotion ? 'secondary' : 'primary'}>{reducedMotion ? 'motion reduced' : 'interactive 3D'}</Badge>
      </div>

      <div className="relative h-[390px] w-full bg-[radial-gradient(circle_at_68%_35%,rgba(216,173,150,0.13),transparent_30%),radial-gradient(circle_at_22%_52%,rgba(109,0,26,0.16),transparent_38%),#0c0a0c] sm:h-[450px]">
        <Canvas
          camera={{ position: [0, 4.3, 9.2], fov: 44 }}
          dpr={[1, 1.5]}
          frameloop={reducedMotion ? 'demand' : 'always'}
        >
          <color attach="background" args={['#0c0a0c']} />
          <AlgorithmScene algorithm={algorithm} activeStage={activeStage} reducedMotion={reducedMotion} />
          <OrbitControls
            enablePan={false}
            enableZoom
            minDistance={7}
            maxDistance={13}
            autoRotate={!reducedMotion && !playing}
            autoRotateSpeed={0.22}
            target={[0, 0.35, -0.35]}
          />
        </Canvas>
        <div className="pointer-events-none absolute bottom-3 left-4 rounded-md border border-bg-700/80 bg-bg-950/75 px-2.5 py-1.5 text-[10px] text-text-500 backdrop-blur-sm sm:left-6">
          Drag to orbit · scroll to zoom · click a stage below
        </div>
      </div>

      <div className="border-t border-bg-800 bg-bg-900/75 px-5 py-4 sm:px-7">
        <div className="flex flex-wrap items-center gap-2">
          {algorithm.stages.map((candidate, index) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => onStageChange(index)}
              aria-pressed={activeStage === index}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${activeStage === index ? 'border-primary-400/60 bg-primary-500/15 text-text-50' : 'border-bg-700 bg-bg-950/60 text-text-400 hover:border-bg-600 hover:text-text-100'}`}
            >
              <span className="mr-1.5 font-mono-quantum" style={{ color: STAGE_COLORS[candidate.kind] }}>{String(index + 1).padStart(2, '0')}</span>
              {candidate.label}
            </button>
          ))}
          <Button size="sm" variant="secondary" className="ml-auto" onClick={onTogglePlaying}>
            {playing ? 'Pause trace' : 'Play trace'}
          </Button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.65fr)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STAGE_COLORS[stage.kind], boxShadow: `0 0 12px ${STAGE_COLORS[stage.kind]}` }} />
              <p className="font-mono-quantum text-[10px] uppercase tracking-[0.16em] text-accent-200">{stage.label} · {stage.kind}</p>
            </div>
            <h3 className="mt-2 text-base font-semibold text-text-50">{stage.headline}</h3>
            <p className="mt-2 text-sm leading-6 text-text-300">{stage.description}</p>
            <p className="mt-3 rounded-lg border border-bg-700 bg-bg-950/60 px-3 py-2 font-mono-quantum text-xs text-cyan-200">{stage.equation}</p>
          </div>
          <div className="rounded-xl border border-bg-700 bg-bg-950/55 p-4">
            <p className="font-mono-quantum text-[10px] uppercase tracking-[0.15em] text-text-500">Signal to notice</p>
            <p className="mt-2 text-sm leading-6 text-text-200">{stage.signal}</p>
            <p className="mt-3 text-[11px] leading-5 text-text-500">The tutor can ask you to predict this stage before you run the circuit.</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AlgorithmVisualization;
