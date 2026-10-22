import React from 'react';
import { Html, Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface TutorVisualBackdropProps {
  /** Human-readable module or scene title shown in the tutor environment. */
  title?: string;
  /** Stable scene key used to keep the visual treatment in sync with a lesson/module. */
  sceneKey?: string;
  reducedMotion?: boolean;
}

interface BackdropVariant {
  accent: string;
  secondary: string;
  glow: string;
  phase: number;
}

const VARIANTS: BackdropVariant[] = [
  { accent: '#8f102d', secondary: '#e4d5cc', glow: '#d8ad96', phase: 0 },
  { accent: '#b76e79', secondary: '#f0ddd3', glow: '#8f102d', phase: 1.7 },
  { accent: '#d19b83', secondary: '#8f102d', glow: '#e4d5cc', phase: 3.1 },
];

const pickVariant = (sceneKey: string): BackdropVariant => {
  let hash = 0;
  for (let index = 0; index < sceneKey.length; index += 1) {
    hash = (hash * 31 + sceneKey.charCodeAt(index)) | 0;
  }
  return VARIANTS[Math.abs(hash) % VARIANTS.length];
};

const TutorVisualBackdrop: React.FC<TutorVisualBackdropProps> = ({
  title = 'Quantum tutor environment',
  sceneKey = 'tutor/default',
  reducedMotion = false,
}) => {
  const variant = React.useMemo(() => pickVariant(sceneKey), [sceneKey]);
  const orbitRef = React.useRef<THREE.Group>(null);
  const pulseRef = React.useRef<THREE.Mesh>(null);
  const pulseLightRef = React.useRef<THREE.PointLight>(null);
  const circuitNodes = React.useMemo(
    () => [-2.55, -1.65, -0.75, 0.15, 1.05, 1.95, 2.55],
    [],
  );

  React.useEffect(() => {
    if (reducedMotion) {
      if (orbitRef.current) orbitRef.current.rotation.y = 0.28;
      if (pulseRef.current) pulseRef.current.position.x = -2.55;
    }
  }, [reducedMotion]);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const time = clock.elapsedTime + variant.phase;

    if (orbitRef.current) {
      orbitRef.current.rotation.y = 0.28 + time * 0.08;
      orbitRef.current.rotation.z = Math.sin(time * 0.35) * 0.08;
    }

    if (pulseRef.current) {
      const progress = (time * 0.46) % 1;
      pulseRef.current.position.x = -2.55 + progress * 5.1;
      pulseRef.current.position.y = 0.02 + Math.sin(time * 2.2) * 0.025;
    }

    if (pulseLightRef.current) {
      pulseLightRef.current.intensity = 0.35 + Math.sin(time * 3.1) * 0.12;
    }
  });

  return (
    <group position={[0, 0, -1.55]}>
      <group ref={orbitRef} position={[1.55, 0.25, 0]} rotation={[0.34, 0.28, 0]}>
        <mesh>
          <sphereGeometry args={[1.28, 28, 18]} />
          <meshBasicMaterial color={variant.accent} wireframe transparent opacity={0.12} depthWrite={false} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.29, 0.012, 8, 64]} />
          <meshBasicMaterial color={variant.secondary} transparent opacity={0.42} depthWrite={false} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[1.29, 0.009, 8, 64]} />
          <meshBasicMaterial color={variant.accent} transparent opacity={0.34} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.96, 0.99, 48]} />
          <meshBasicMaterial color={variant.glow} transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>

      <group position={[0, -1.62, 0]}>
        <Line points={[[-2.7, 0, 0], [2.7, 0, 0]]} color={variant.accent} transparent opacity={0.25} lineWidth={1} />
        <Line points={[[-2.7, 0.28, 0], [-1.65, 0.28, 0], [-1.35, 0.52, 0], [0.25, 0.52, 0], [0.65, 0.28, 0], [2.7, 0.28, 0]]} color={variant.secondary} transparent opacity={0.19} lineWidth={1} />
        {circuitNodes.map((x, index) => (
          <group key={`${sceneKey}-node-${index}`} position={[x, 0, 0]}>
            <mesh>
              <sphereGeometry args={[0.07, 12, 12]} />
              <meshBasicMaterial color={index % 2 === 0 ? variant.secondary : variant.accent} transparent opacity={0.78} />
            </mesh>
            {index === 2 || index === 5 ? (
              <mesh position={[0, 0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.16, 0.018, 8, 24]} />
                <meshBasicMaterial color={index === 2 ? variant.accent : variant.secondary} transparent opacity={0.6} />
              </mesh>
            ) : null}
          </group>
        ))}
        <mesh ref={pulseRef} position={[-2.55, 0.02, 0.04]}>
          <sphereGeometry args={[0.095, 16, 16]} />
          <meshStandardMaterial
            color={variant.secondary}
            emissive={variant.secondary}
            emissiveIntensity={1.8}
            transparent
            opacity={0.9}
          />
        </mesh>
        <pointLight ref={pulseLightRef} position={[-2.55, 0.02, 0.12]} color={variant.secondary} intensity={0.35} distance={1.3} />
      </group>

      <Line points={[[-2.65, 1.32, 0], [-1.55, 1.32, 0], [-1.18, 1.05, 0], [0.55, 1.05, 0], [0.95, 1.32, 0], [2.6, 1.32, 0]]} color={variant.glow} transparent opacity={0.13} lineWidth={1} />

      <Html position={[-2.62, 1.57, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div className="rounded-full border border-primary-500/20 bg-bg-950/65 px-2.5 py-1 font-mono-quantum text-[9px] uppercase tracking-[0.16em] text-text-500 backdrop-blur-sm">
          {title}
          <span className="ml-2 text-primary-300/70">{sceneKey}</span>
        </div>
      </Html>
    </group>
  );
};

export default TutorVisualBackdrop;
