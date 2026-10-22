import React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Badge, Button } from '@qvanta/ui';

type QuantumState = 'zero' | 'plus' | 'one';

interface StateDefinition {
  label: string;
  name: string;
  description: string;
  vector: { x: number; y: number; z: number };
  color: string;
}

const STATE_DEFINITIONS: Record<QuantumState, StateDefinition> = {
  zero: {
    label: '|0⟩',
    name: 'Ground state',
    description: 'The qubit is certain to be measured as 0.',
    vector: { x: 0, y: 1.1, z: 0 },
     color: '#8f102d'
  },
  plus: {
    label: '|+⟩',
    name: 'Superposition',
    description: 'The qubit points between 0 and 1, so both outcomes are possible.',
    vector: { x: 0.85, y: 0.6, z: 0.2 },
     color: '#e4d5cc'
  },
  one: {
    label: '|1⟩',
    name: 'Measured state',
    description: 'The measurement resolved the qubit to 1.',
    vector: { x: 0, y: -1.1, z: 0 },
     color: '#d19b83'
  }
};

interface StateVectorProps {
  target: THREE.Vector3;
  color: string;
}

const StateVector: React.FC<StateVectorProps> = ({ target, color }) => {
  const groupRef = React.useRef<THREE.Group | null>(null);
  const currentRef = React.useRef(new THREE.Vector3(0, 1.1, 0));
  const targetRef = React.useMemo(
    () => new THREE.Vector3(target.x, target.y, target.z),
    [target.x, target.y, target.z]
  );

  useFrame((_, delta) => {
    const current = currentRef.current;
    current.lerp(targetRef, 1 - Math.pow(0.0001, delta));

    if (!groupRef.current || current.lengthSq() < 0.0001) return;

    const direction = current.clone().normalize();
    groupRef.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    groupRef.current.scale.set(1, current.length() / 1.1, 1);
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.52, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 1.04, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0, 1.08, 0]}>
        <coneGeometry args={[0.11, 0.24, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} />
      </mesh>
      <pointLight color={color} intensity={0.35} distance={2.2} />
    </group>
  );
};

interface StateOrbProps {
  current: StateDefinition;
}

const StateOrb: React.FC<StateOrbProps> = ({ current }) => {
  const target = React.useMemo(
    () => new THREE.Vector3(current.vector.x, current.vector.y, current.vector.z),
    [current.vector.x, current.vector.y, current.vector.z]
  );

  return (
    <div
       className="h-[260px] w-full overflow-hidden rounded-lg bg-[radial-gradient(circle_at_50%_44%,rgba(109,0,26,0.22),transparent_62%)]"
      role="img"
      aria-label={`3D Bloch sphere showing the qubit in the ${current.name.toLowerCase()} ${current.label} state`}
    >
      <Canvas camera={{ position: [2.9, 2.1, 4.2], fov: 43 }} dpr={[1, 1.5]}>
         <color attach="background" args={['#0c0a0c']} />
        <ambientLight intensity={0.65} />
         <pointLight position={[2, 3, 3]} color="#8f102d" intensity={2.2} distance={7} />
         <pointLight position={[-3, -1, 2]} color="#e4d5cc" intensity={1.2} distance={6} />

        <mesh>
          <sphereGeometry args={[1.14, 32, 20]} />
          <meshStandardMaterial color="#11142d" transparent opacity={0.45} roughness={0.82} metalness={0.08} />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.15, 32, 20]} />
           <meshBasicMaterial color="#8f102d" wireframe transparent opacity={0.26} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.16, 0.008, 8, 80]} />
           <meshBasicMaterial color="#e4d5cc" transparent opacity={0.45} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[1.16, 0.008, 8, 80]} />
           <meshBasicMaterial color="#8f102d" transparent opacity={0.35} />
        </mesh>
        <Line points={[[-1.38, 0, 0], [1.38, 0, 0]]} color="#64748b" transparent opacity={0.5} lineWidth={1} />
        <Line points={[[0, -1.38, 0], [0, 1.38, 0]]} color="#64748b" transparent opacity={0.5} lineWidth={1} />
        <StateVector target={target} color={current.color} />
        <Html position={[0, 1.48, 0]} center style={{ pointerEvents: 'none' }}>
          <span className="font-mono-quantum text-[11px] text-text-300">|0⟩</span>
        </Html>
        <Html position={[0, -1.48, 0]} center style={{ pointerEvents: 'none' }}>
          <span className="font-mono-quantum text-[11px] text-text-300">|1⟩</span>
        </Html>
        <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.6} />
      </Canvas>
    </div>
  );
};

const QuantumStateExplainer: React.FC = () => {
  const [state, setState] = React.useState<QuantumState>('zero');
  const [measurement, setMeasurement] = React.useState('No measurement yet');
  const current = STATE_DEFINITIONS[state];

  const applyHadamard = () => {
    setState('plus');
    setMeasurement('H created an even chance of 0 or 1');
  };

  const measure = () => {
    if (state === 'plus') {
      const result: QuantumState = Math.random() >= 0.5 ? 'zero' : 'one';
      setState(result);
      setMeasurement(`Measured ${result === 'zero' ? '0' : '1'} this time`);
      return;
    }

    setMeasurement(`Measured ${state === 'zero' ? '0' : '1'} with certainty`);
  };

  const reset = () => {
    setState('zero');
    setMeasurement('No measurement yet');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
         <p className="font-mono-quantum text-[10px] uppercase tracking-[0.2em] text-accent-300">
            State playground
          </p>
          <h3 className="mt-1 text-lg font-semibold text-text-100">See a qubit move</h3>
          <p className="mt-1 max-w-sm text-xs leading-5 text-text-400">
            Use H to make a superposition, then measure it. This visual is a local learning demo.
          </p>
        </div>
        <Badge variant="primary">interactive</Badge>
      </div>

      <div className="overflow-hidden rounded-xl border border-bg-700 bg-bg-950/80">
        <div className="flex items-center justify-between border-b border-bg-800 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-text-100">Bloch-style view</p>
            <p className="text-[11px] text-text-500">A direction is a state, not a tiny spinning ball.</p>
          </div>
          <span className="font-mono-quantum text-xs text-text-400">{current.label}</span>
        </div>

        <StateOrb current={current} />

        <div className="border-t border-bg-800 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono-quantum text-sm text-text-100">{current.label} · {current.name}</p>
              <p className="mt-1 text-xs leading-5 text-text-400">{current.description}</p>
            </div>
            <span className="hidden shrink-0 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-medium text-cyan-300 sm:inline-flex">
              {measurement}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-text-500 sm:hidden">{measurement}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={applyHadamard}>
          Apply H
        </Button>
        <Button size="sm" variant="secondary" onClick={measure}>
          Measure
        </Button>
        <Button size="sm" variant="ghost" onClick={reset}>
          Reset
        </Button>
      </div>
    </div>
  );
};

export default QuantumStateExplainer;
