import React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

export interface LessonVisualizationProps {
  moduleId: string;
  stepId: string;
  stepIndex: number;
  moduleTitle: string;
  lessonTitle: string;
  sceneKey?: string;
}

type RailKind = 'gate' | 'measure' | 'prepare' | 'control' | 'target';

interface RailDefinition {
  label: string;
  color: string;
}

interface GateDefinition {
  id: string;
  label: string;
  x: number;
  track?: number;
  kind?: RailKind;
  color: string;
  connectTo?: number;
}

interface BlochVector {
  x: number;
  y: number;
  z: number;
}

interface LessonSceneDefinition {
  happening: string;
  stateLabel: string;
  stateDescription: string;
  vector: BlochVector;
  vectorColor: string;
  vectorTrail?: boolean;
  rails: RailDefinition[];
  gates: GateDefinition[];
  activeX: number;
  outcomeBars?: { label: string; value: number; color: string }[];
}

const RAIL_START = -2.05;
const RAIL_END = 2.05;
const TRACK_SPACING = 0.78;
const CIRCUIT_CENTER_X = -1.9;
const SPHERE_CENTER_X = 2.3;

const COLORS = {
  violet: '#8f102d',
  cyan: '#e4d5cc',
  fuchsia: '#b76e79',
  amber: '#d19b83',
  emerald: '#9fb3a4',
  slate: '#756963'
};

const oneRail = (color: string = COLORS.violet): RailDefinition[] => [{ label: 'q0', color }];

const twoRails = (): RailDefinition[] => [
  { label: 'q0 · control', color: COLORS.violet },
  { label: 'q1 · target', color: COLORS.cyan }
];

const gate = (id: string, label: string, x: number, color: string, extra: Partial<GateDefinition> = {}): GateDefinition => ({
  id,
  label,
  x,
  color,
  ...extra
});

const SCENES: Record<string, LessonSceneDefinition> = {
  'qubit-basics/qubit-as-bit': {
    happening: 'The qubit starts at |0⟩, the north pole. The signal reaches measurement with a certain 0 outcome.',
    stateLabel: '|0⟩ · certain 0',
    stateDescription: 'The vector points to the north pole, so measuring this state gives 0.',
    vector: { x: 0, y: 0, z: 1 },
    vectorColor: COLORS.violet,
    rails: oneRail(),
    gates: [gate('measure', 'M', 1.45, COLORS.cyan, { kind: 'measure' })],
    activeX: 1.45
  },
  'qubit-basics/qubit-picture': {
    happening: 'The H gate turns |0⟩ into |+⟩: the vector moves from the north pole to the equator.',
    stateLabel: '|+⟩ · balanced superposition',
    stateDescription: 'The equator represents equal measurement chances for 0 and 1 in this beginner example.',
    vector: { x: 1, y: 0, z: 0 },
    vectorColor: COLORS.cyan,
    vectorTrail: true,
    rails: oneRail(),
    gates: [gate('hadamard', 'H', 0.05, COLORS.cyan)],
    activeX: 0.05
  },
  'qubit-basics/first-experiment': {
    happening: 'H creates the balanced state, then measurement samples one result. Repeating the circuit reveals the 50/50 pattern.',
    stateLabel: 'H → measure · 50% 0 / 50% 1',
    stateDescription: 'The vector is on the equator before measurement; each shot resolves to 0 or 1.',
    vector: { x: 1, y: 0, z: 0 },
    vectorColor: COLORS.cyan,
    vectorTrail: true,
    rails: oneRail(),
    gates: [
      gate('hadamard', 'H', -0.55, COLORS.cyan),
      gate('measure', 'M', 1.45, COLORS.amber, { kind: 'measure' })
    ],
    activeX: 1.45,
    outcomeBars: [
      { label: '0', value: 50, color: COLORS.violet },
      { label: '1', value: 50, color: COLORS.cyan }
    ]
  },
  'quantum-gates/gates-as-actions': {
    happening: 'The X gate rotates the vector 180° around the X axis, taking |0⟩ to |1⟩.',
    stateLabel: '|0⟩ — X — |1⟩',
    stateDescription: 'The south pole is the |1⟩ basis state. X is a reversible bit flip for a qubit.',
    vector: { x: 0, y: 0, z: -1 },
    vectorColor: COLORS.fuchsia,
    vectorTrail: true,
    rails: oneRail(COLORS.fuchsia),
    gates: [
      gate('x', 'X', 0.05, COLORS.fuchsia),
      gate('measure', 'M', 1.45, COLORS.amber, { kind: 'measure' })
    ],
    activeX: 0.05
  },
  'quantum-gates/two-qubit-handshake': {
    happening: 'CNOT checks q0. Because q0 is 1 here, the connected target q1 flips from 0 to 1.',
    stateLabel: 'CNOT · control 1 → target flips',
    stateDescription: 'The sphere follows the target: its vector ends at |1⟩ after the controlled flip.',
    vector: { x: 0, y: 0, z: -1 },
    vectorColor: COLORS.amber,
    rails: twoRails(),
    gates: [
      gate('control', '●', 0.25, COLORS.amber, { kind: 'control', track: 0, connectTo: 1 }),
      gate('target', '⊕', 0.25, COLORS.cyan, { kind: 'target', track: 1 })
    ],
    activeX: 0.25
  },
  'quantum-gates/read-the-circuit': {
    happening: 'Read left to right: H prepares q0, CNOT links the two rails, and measurement checks the correlated result.',
    stateLabel: 'H + CNOT · correlated 00 / 11',
    stateDescription: 'The sphere shows q0 before measurement; the linked rails explain why the two outcomes move together.',
    vector: { x: 1, y: 0, z: 0 },
    vectorColor: COLORS.cyan,
    vectorTrail: true,
    rails: twoRails(),
    gates: [
      gate('hadamard', 'H', -0.9, COLORS.cyan, { track: 0 }),
      gate('control', '●', 0.2, COLORS.amber, { kind: 'control', track: 0, connectTo: 1 }),
      gate('target', '⊕', 0.2, COLORS.cyan, { kind: 'target', track: 1 }),
      gate('measure-control', 'M', 1.45, COLORS.amber, { kind: 'measure', track: 0 }),
      gate('measure-target', 'M', 1.45, COLORS.amber, { kind: 'measure', track: 1 })
    ],
    activeX: 0.2,
    outcomeBars: [
      { label: '00', value: 50, color: COLORS.violet },
      { label: '11', value: 50, color: COLORS.cyan }
    ]
  },
  'bloch-sphere/sphere-axes': {
    happening: 'Use the axes as a map: Z separates |0⟩ and |1⟩, while X and Y describe directions around the equator.',
    stateLabel: 'Z axis · |0⟩ north / |1⟩ south',
    stateDescription: 'The vector starts at |0⟩ so the vertical Z axis is easy to locate before adding phase.',
    vector: { x: 0, y: 0, z: 1 },
    vectorColor: COLORS.violet,
    rails: oneRail(),
    gates: [gate('map', 'Z', 0.05, COLORS.violet)],
    activeX: 0.05
  },
  'bloch-sphere/rotation': {
    happening: 'A gate changes the direction of the state vector. H rotates the north-pole vector onto the equator.',
    stateLabel: 'H · north pole → equator',
    stateDescription: 'The trail connects the starting direction to the new direction so the rotation is visible.',
    vector: { x: 1, y: 0, z: 0 },
    vectorColor: COLORS.fuchsia,
    vectorTrail: true,
    rails: oneRail(COLORS.fuchsia),
    gates: [gate('hadamard', 'H', 0.05, COLORS.fuchsia)],
    activeX: 0.05
  },
  'bloch-sphere/measurement': {
    happening: 'The sphere shows a distribution before measurement. One shot then resolves the vector to either |0⟩ or |1⟩.',
    stateLabel: 'measure · sample 0 or 1',
    stateDescription: 'The equator means neither answer is favored in this example; many shots show the distribution.',
    vector: { x: 1, y: 0, z: 0 },
    vectorColor: COLORS.amber,
    rails: oneRail(COLORS.amber),
    gates: [gate('measure', 'M', 1.05, COLORS.amber, { kind: 'measure' })],
    activeX: 1.05,
    outcomeBars: [
      { label: '0', value: 50, color: COLORS.violet },
      { label: '1', value: 50, color: COLORS.cyan }
    ]
  },
  'quantum-algorithms/algorithm-recipe': {
    happening: 'An algorithm gives each stage a job: prepare a state, transform it with gates, then measure the result.',
    stateLabel: 'prepare → transform → measure',
    stateDescription: 'The vector shows the prepared superposition before the final measurement samples it.',
    vector: { x: 1, y: 0, z: 0 },
    vectorColor: COLORS.amber,
    vectorTrail: true,
    rails: oneRail(COLORS.amber),
    gates: [
      gate('prepare', 'prep', -1.2, COLORS.violet, { kind: 'prepare' }),
      gate('transform', 'H', -0.05, COLORS.cyan),
      gate('measure', 'M', 1.45, COLORS.amber, { kind: 'measure' })
    ],
    activeX: -0.05
  },
  'quantum-algorithms/grover-intuition': {
    happening: 'The oracle marks a candidate, and amplification makes that candidate more likely to be measured.',
    stateLabel: 'amplify · marked answer gets louder',
    stateDescription: 'This conceptual vector leans toward the marked answer; the bars show its increased chance.',
    vector: { x: 0.65, y: 0, z: 0.76 },
    vectorColor: COLORS.amber,
    vectorTrail: true,
    rails: oneRail(COLORS.amber),
    gates: [
      gate('prepare', 'prep', -1.45, COLORS.violet, { kind: 'prepare' }),
      gate('oracle', 'Ω', -0.45, COLORS.fuchsia),
      gate('amplify', '↑', 0.5, COLORS.amber),
      gate('measure', 'M', 1.45, COLORS.amber, { kind: 'measure' })
    ],
    activeX: 0.5,
    outcomeBars: [
      { label: 'other', value: 25, color: COLORS.violet },
      { label: 'marked', value: 75, color: COLORS.amber }
    ]
  },
  'quantum-algorithms/ship-a-circuit': {
    happening: 'A useful circuit carries its prediction: the gates make a state, and the histogram makes the result explainable.',
    stateLabel: 'prediction + circuit + histogram',
    stateDescription: 'The sphere and linked rails are the visual evidence; the outcome bars are the measured story.',
    vector: { x: 1, y: 0, z: 0 },
    vectorColor: COLORS.cyan,
    vectorTrail: true,
    rails: twoRails(),
    gates: [
      gate('hadamard', 'H', -0.9, COLORS.cyan, { track: 0 }),
      gate('control', '●', 0.2, COLORS.amber, { kind: 'control', track: 0, connectTo: 1 }),
      gate('target', '⊕', 0.2, COLORS.cyan, { kind: 'target', track: 1 }),
      gate('measure-control', 'M', 1.45, COLORS.amber, { kind: 'measure', track: 0 }),
      gate('measure-target', 'M', 1.45, COLORS.amber, { kind: 'measure', track: 1 })
    ],
    activeX: 1.45,
    outcomeBars: [
      { label: '00', value: 50, color: COLORS.violet },
      { label: '11', value: 50, color: COLORS.cyan }
    ]
  }
};

const FALLBACK_SCENE: LessonSceneDefinition = {
  happening: 'Follow the signal from the input, through each gate, to the state shown by the Bloch vector.',
  stateLabel: 'state changes as the signal moves',
  stateDescription: 'The vector is a compact picture of a single-qubit state.',
  vector: { x: 0, y: 0, z: 1 },
  vectorColor: COLORS.violet,
  rails: oneRail(),
  gates: [gate('measure', 'M', 1.45, COLORS.cyan, { kind: 'measure' })],
  activeX: 1.45
};

const usePrefersReducedMotion = (): boolean => {
  const [reducedMotion, setReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mediaQuery.matches);
    update();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', update);
      return () => mediaQuery.removeEventListener('change', update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  return reducedMotion;
};

interface SignalPulseProps {
  z: number;
  color: string;
  delay: number;
  reducedMotion: boolean;
  activeX: number;
}

const SignalPulse: React.FC<SignalPulseProps> = ({ z, color, delay, reducedMotion, activeX }) => {
  const meshRef = React.useRef<THREE.Mesh | null>(null);
  const elapsed = React.useRef(delay);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    if (reducedMotion) {
      meshRef.current.position.x = activeX;
      return;
    }

    elapsed.current = (elapsed.current + delta) % 2.8;
    const progress = elapsed.current / 2.8;
    meshRef.current.position.x = RAIL_START + (RAIL_END - RAIL_START) * progress;
  });

  return (
    <mesh ref={meshRef} position={[reducedMotion ? activeX : RAIL_START, 0.16, z]}>
      <sphereGeometry args={[0.11, 16, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.7} />
      <pointLight color={color} intensity={0.55} distance={1.1} />
    </mesh>
  );
};

interface GateMeshProps {
  definition: GateDefinition;
  trackZ: number;
}

const GateMesh: React.FC<GateMeshProps> = ({ definition, trackZ }) => {
  const isMeasure = definition.kind === 'measure';
  const isControl = definition.kind === 'control';
  const isTarget = definition.kind === 'target';

  return (
    <group position={[definition.x, 0, trackZ]}>
      {isControl ? (
        <mesh position={[0, 0.43, 0]}>
          <sphereGeometry args={[0.17, 20, 20]} />
          <meshStandardMaterial color={definition.color} emissive={definition.color} emissiveIntensity={0.8} />
        </mesh>
      ) : isTarget ? (
        <group position={[0, 0.43, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.19, 0.045, 10, 28]} />
            <meshStandardMaterial color={definition.color} emissive={definition.color} emissiveIntensity={0.7} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.36, 0.045, 0.045]} />
            <meshStandardMaterial color={definition.color} emissive={definition.color} emissiveIntensity={0.7} />
          </mesh>
        </group>
      ) : (
        <mesh position={[0, 0.43, 0]}>
          {isMeasure ? <cylinderGeometry args={[0.25, 0.25, 0.42, 20]} /> : <boxGeometry args={[0.5, 0.5, 0.5]} />}
          <meshStandardMaterial color={definition.color} emissive={definition.color} emissiveIntensity={0.55} roughness={0.5} />
        </mesh>
      )}
      <Html
        center
        distanceFactor={7}
        position={[0, 0.43, 0.36]}
        style={{
          pointerEvents: 'none',
          color: '#f8fafc',
          fontSize: definition.label.length > 2 ? 9 : 13,
          fontWeight: 700,
          textShadow: '0 1px 3px rgba(0,0,0,0.9)',
          whiteSpace: 'nowrap'
        }}
      >
        {definition.label}
      </Html>
    </group>
  );
};

interface CircuitRailProps {
  rails: RailDefinition[];
  gates: GateDefinition[];
  reducedMotion: boolean;
  activeX: number;
}

const CircuitRail: React.FC<CircuitRailProps> = ({ rails, gates, reducedMotion, activeX }) => {
  const trackZ = (track: number) => (track - (rails.length - 1) / 2) * TRACK_SPACING;
  const pulseDelay = rails.length > 1 ? 1.25 : 0;

  return (
    <group position={[CIRCUIT_CENTER_X, 0.25, 0]}>
      <mesh position={[(RAIL_START + RAIL_END) / 2, -0.14, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[RAIL_END - RAIL_START + 0.7, rails.length * 1.25]} />
        <meshStandardMaterial color="#0f172a" transparent opacity={0.75} roughness={0.95} />
      </mesh>

      {rails.map((rail, index) => {
        const z = trackZ(index);
        return (
          <group key={rail.label}>
            <Line points={[[RAIL_START, 0, z], [RAIL_END, 0, z]]} color={rail.color} lineWidth={2.2} />
            {[-1.5, -0.55, 0.4, 1.35].map((x) => (
              <mesh key={`${rail.label}-${x}`} position={[x, 0, z]}>
                <sphereGeometry args={[0.045, 10, 10]} />
                <meshBasicMaterial color={rail.color} transparent opacity={0.8} />
              </mesh>
            ))}
            <Html
              position={[RAIL_START - 0.25, 0.02, z]}
              center
              distanceFactor={7}
              style={{ color: rail.color, fontSize: 10, fontWeight: 700, pointerEvents: 'none', whiteSpace: 'nowrap' }}
            >
              {rail.label}
            </Html>
            <SignalPulse z={z} color={rail.color} delay={index * pulseDelay} reducedMotion={reducedMotion} activeX={activeX} />
          </group>
        );
      })}

      {gates.map((definition) => (
        <GateMesh key={definition.id} definition={definition} trackZ={trackZ(definition.track ?? 0)} />
      ))}

      {gates.filter((definition) => definition.connectTo !== undefined).map((definition) => (
        <Line
          key={`${definition.id}-link`}
          points={[
            [definition.x, 0.43, trackZ(definition.track ?? 0)],
            [definition.x, 0.43, trackZ(definition.connectTo ?? 0)]
          ]}
          color={definition.color}
          lineWidth={2.5}
        />
      ))}

      <Html position={[RAIL_END + 0.25, -0.03, 0]} center distanceFactor={7} style={{ color: '#94a3b8', fontSize: 9, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        state out
      </Html>
    </group>
  );
};

interface StateVectorProps {
  vector: BlochVector;
  color: string;
  reducedMotion: boolean;
}

const toSceneVector = (vector: BlochVector): THREE.Vector3 => new THREE.Vector3(vector.x, vector.z, vector.y);

const StateVector: React.FC<StateVectorProps> = ({ vector, color, reducedMotion }) => {
  const groupRef = React.useRef<THREE.Group | null>(null);
  const currentRef = React.useRef(new THREE.Vector3(0, 1, 0));
  const target = React.useMemo(() => toSceneVector(vector), [vector.x, vector.y, vector.z]);

  useFrame((_, delta) => {
    const current = currentRef.current;
    if (reducedMotion) {
      current.copy(target);
    } else {
      current.lerp(target, 1 - Math.pow(0.0001, delta));
    }

    if (!groupRef.current || current.lengthSq() < 0.0001) return;
    const direction = current.clone().normalize();
    groupRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    groupRef.current.scale.set(1, current.length(), 1);
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 0.9, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} />
      </mesh>
      <mesh position={[0, 0.98, 0]}>
        <coneGeometry args={[0.12, 0.24, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
      </mesh>
      <pointLight color={color} intensity={0.45} distance={2.6} />
    </group>
  );
};

interface BlochSphereProps {
  vector: BlochVector;
  vectorColor: string;
  vectorTrail?: boolean;
  reducedMotion: boolean;
  stateLabel: string;
}

const BlochSphere: React.FC<BlochSphereProps> = ({ vector, vectorColor, vectorTrail, reducedMotion, stateLabel }) => {
  const target = React.useMemo(() => toSceneVector(vector), [vector.x, vector.y, vector.z]);
  const trailPoints = React.useMemo(() => {
    const start = new THREE.Vector3(0, 1, 0);
    const points: [number, number, number][] = [];
    for (let index = 0; index <= 18; index += 1) {
      const progress = index / 18;
      const point = start.clone().lerp(target, progress).normalize().multiplyScalar(1.04);
      points.push([point.x, point.y, point.z]);
    }
    return points;
  }, [target]);

  return (
    <group position={[SPHERE_CENTER_X, 0.78, 0]}>
      <mesh>
        <sphereGeometry args={[1.08, 32, 20]} />
        <meshStandardMaterial color="#111827" transparent opacity={0.55} roughness={0.78} metalness={0.08} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.09, 32, 20]} />
        <meshBasicMaterial color={vectorColor} wireframe transparent opacity={0.28} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.09, 0.009, 8, 80]} />
        <meshBasicMaterial color={COLORS.cyan} transparent opacity={0.5} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[1.09, 0.009, 8, 80]} />
        <meshBasicMaterial color={COLORS.violet} transparent opacity={0.4} />
      </mesh>

      <Line points={[[-1.35, 0, 0], [1.35, 0, 0]]} color={COLORS.slate} transparent opacity={0.65} lineWidth={1} />
      <Line points={[[0, -1.35, 0], [0, 1.35, 0]]} color={COLORS.slate} transparent opacity={0.65} lineWidth={1} />
      <Line points={[[0, 0, -1.35], [0, 0, 1.35]]} color={COLORS.slate} transparent opacity={0.5} lineWidth={1} />
      {vectorTrail && <Line points={trailPoints} color={vectorColor} transparent opacity={0.6} lineWidth={1.5} dashed dashScale={3} />}
      <StateVector vector={vector} color={vectorColor} reducedMotion={reducedMotion} />

      <Html position={[0, 1.5, 0]} center style={{ color: '#e2e8f0', fontSize: 10, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        Z+ · |0⟩
      </Html>
      <Html position={[0, -1.5, 0]} center style={{ color: '#cbd5e1', fontSize: 10, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        Z− · |1⟩
      </Html>
      <Html position={[1.48, 0, 0]} center style={{ color: '#cbd5e1', fontSize: 10, pointerEvents: 'none' }}>
        X
      </Html>
      <Html position={[0, 0, 1.48]} center style={{ color: '#cbd5e1', fontSize: 10, pointerEvents: 'none' }}>
        Y
      </Html>
      <Html position={[0, 0, 0.12]} center distanceFactor={7} style={{ color: '#f8fafc', fontSize: 9, pointerEvents: 'none', whiteSpace: 'nowrap', transform: 'translateY(1.6rem)' }}>
        {stateLabel}
      </Html>
    </group>
  );
};

interface OutcomeBarsProps {
  bars: { label: string; value: number; color: string }[];
}

const OutcomeBars: React.FC<OutcomeBarsProps> = ({ bars }) => (
  <div className="grid min-w-[118px] gap-1.5" aria-label="Illustrative measurement outcomes">
    {bars.map((bar) => (
      <div key={bar.label} className="flex items-center gap-2 text-[10px] text-text-400">
        <span className="w-10 shrink-0 font-mono-quantum text-text-300">{bar.label}</span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-800">
          <span className="block h-full rounded-full" style={{ width: `${bar.value}%`, backgroundColor: bar.color }} />
        </span>
        <span className="w-8 text-right font-mono-quantum text-text-500">{bar.value}%</span>
      </div>
    ))}
  </div>
);

const LessonVisualization: React.FC<LessonVisualizationProps> = ({ moduleId, stepId, stepIndex, moduleTitle, lessonTitle, sceneKey }) => {
  const reducedMotion = usePrefersReducedMotion();
  const scene = SCENES[sceneKey ?? `${moduleId}/${stepId}`] ?? FALLBACK_SCENE;
  const sceneLabelId = `lesson-scene-${moduleId}-${stepId}`;
  const accessibleSummary = `${moduleTitle}, step ${stepIndex + 1}, ${lessonTitle}. ${scene.happening} ${scene.stateDescription}`;

  return (
     <div className="overflow-hidden rounded-xl border border-accent-500/20 bg-bg-950/80" role="group" aria-labelledby={sceneLabelId}>
      <div className="flex flex-col gap-3 border-b border-bg-800 bg-bg-900/80 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-7">
        <div>
           <p className="font-mono-quantum text-[10px] uppercase tracking-[0.18em] text-accent-300">Lesson visualization</p>
          <h3 id={sceneLabelId} className="mt-1 text-base font-semibold text-text-50">{lessonTitle}</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-text-400">Trace the signal on the rail, then read the vector on the Bloch sphere.</p>
        </div>
         <span className="inline-flex w-fit items-center rounded-full border border-accent-500/20 bg-accent-500/10 px-2.5 py-1 font-mono-quantum text-[10px] text-accent-200">
          {reducedMotion ? 'motion paused' : 'live state'}
        </span>
      </div>

      <div
         className="relative h-[380px] w-full bg-[radial-gradient(circle_at_70%_42%,rgba(216,173,150,0.12),transparent_34%),radial-gradient(circle_at_24%_50%,rgba(109,0,26,0.16),transparent_38%),#0c0a0c] sm:h-[430px]"
        role="img"
        aria-label={accessibleSummary}
      >
        <Canvas
          camera={{ position: [0, 3.2, 9.6], fov: 48 }}
          dpr={[1, 1.5]}
          frameloop={reducedMotion ? 'demand' : 'always'}
        >
           <color attach="background" args={['#0c0a0c']} />
          <ambientLight intensity={0.7} />
          <pointLight position={[-2, 3, 3]} color={COLORS.violet} intensity={2.2} distance={7} />
          <pointLight position={[3, 2, 2]} color={COLORS.cyan} intensity={1.8} distance={6} />
          <directionalLight position={[0, 5, 4]} intensity={0.45} />

          <CircuitRail rails={scene.rails} gates={scene.gates} reducedMotion={reducedMotion} activeX={scene.activeX} />
          <BlochSphere
            vector={scene.vector}
            vectorColor={scene.vectorColor}
            vectorTrail={scene.vectorTrail}
            reducedMotion={reducedMotion}
            stateLabel={scene.stateLabel}
          />

          <OrbitControls
            enablePan={false}
            enableZoom
            minDistance={7.2}
            maxDistance={12.5}
            autoRotate={!reducedMotion}
            autoRotateSpeed={0.3}
            target={[0, 0.4, 0]}
          />
        </Canvas>
        <div className="pointer-events-none absolute bottom-3 left-4 rounded-md border border-bg-700/80 bg-bg-950/75 px-2.5 py-1.5 text-[10px] text-text-500 backdrop-blur-sm sm:left-6">
          Drag to orbit · scroll to zoom
        </div>
      </div>

      <div className="grid gap-4 border-t border-bg-800 bg-bg-900/70 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(210px,0.8fr)] sm:px-7">
        <div>
          <div className="flex items-center gap-2">
             <span className="h-2 w-2 rounded-full bg-accent-300 shadow-[0_0_10px_rgba(216,173,150,0.72)]" />
             <p className="font-mono-quantum text-[10px] uppercase tracking-[0.16em] text-accent-200">What is happening</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-text-200">{scene.happening}</p>
          <p className="sr-only">{accessibleSummary}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-text-500" aria-label="Visualization legend">
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-violet-400" />rail = qubit state path</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />glow = signal in motion</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-300" />arrow = state vector</span>
          </div>
        </div>
        <div className="flex items-start justify-between gap-4 rounded-lg border border-bg-700/80 bg-bg-950/55 p-3">
          <div className="min-w-0">
            <p className="font-mono-quantum text-[10px] uppercase tracking-[0.14em] text-text-500">State now</p>
            <p className="mt-1 text-sm font-medium text-text-100">{scene.stateLabel}</p>
            <p className="mt-1 text-xs leading-5 text-text-400">{scene.stateDescription}</p>
          </div>
          {scene.outcomeBars && <OutcomeBars bars={scene.outcomeBars} />}
        </div>
      </div>
    </div>
  );
};

export default LessonVisualization;
