import React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

interface CurriculumModuleVisualProps {
  moduleNumber: number;
  title: string;
  partTitle: string;
  level: string;
}

const STAGES = [
  { label: 'Orient', color: '#8f102d' },
  { label: 'Visualize', color: '#e4d5cc' },
  { label: 'Practice', color: '#d19b83' },
  { label: 'Checkpoint', color: '#9fb3a4' },
] as const;

const StageScene: React.FC<{ reducedMotion: boolean }> = ({ reducedMotion }) => {
  const pulseRef = React.useRef<THREE.Mesh | null>(null);
  const orbitRef = React.useRef<THREE.Group | null>(null);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const time = clock.elapsedTime;
    if (pulseRef.current) {
      const progress = (time * 0.22) % 1;
      pulseRef.current.position.x = -2.6 + progress * 5.2;
      pulseRef.current.position.y = 0.08 + Math.sin(time * 2.2) * 0.04;
    }
    if (orbitRef.current) {
      orbitRef.current.rotation.y = time * 0.12;
      orbitRef.current.rotation.z = Math.sin(time * 0.35) * 0.08;
    }
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <pointLight position={[-3, 3, 3]} color="#8f102d" intensity={2.2} distance={7} />
      <pointLight position={[3, 2, 2]} color="#e4d5cc" intensity={1.5} distance={6} />

      <group ref={orbitRef} position={[1.9, 0.8, -0.4]}>
        <mesh>
          <sphereGeometry args={[0.82, 24, 16]} />
          <meshBasicMaterial color="#8f102d" wireframe transparent opacity={0.24} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.86, 0.012, 8, 64]} />
          <meshBasicMaterial color="#e4d5cc" transparent opacity={0.55} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.86, 0.01, 8, 64]} />
          <meshBasicMaterial color="#b76e79" transparent opacity={0.38} />
        </mesh>
      </group>

      <group position={[0, -0.65, 0]}>
        <Line points={[[-2.8, 0, 0], [2.8, 0, 0]]} color="#756963" transparent opacity={0.45} lineWidth={1.5} />
        {STAGES.map((stage, index) => {
          const x = -2.6 + index * 1.73;
          return (
            <group key={stage.label} position={[x, 0, 0]}>
              <mesh position={[0, 0.08, 0]}>
                <sphereGeometry args={[0.12, 16, 16]} />
                <meshStandardMaterial color={stage.color} emissive={stage.color} emissiveIntensity={1.2} />
              </mesh>
              <mesh position={[0, 0.08, -0.03]}>
                <torusGeometry args={[0.22, 0.012, 8, 32]} />
                <meshBasicMaterial color={stage.color} transparent opacity={0.55} />
              </mesh>
              <Html position={[0, -0.22, 0]} center distanceFactor={7} style={{ pointerEvents: 'none' }}>
                <span className="whitespace-nowrap font-mono-quantum text-[10px] text-text-300">{stage.label}</span>
              </Html>
            </group>
          );
        })}
        <mesh ref={pulseRef} position={[-2.6, 0.08, 0.08]}>
          <sphereGeometry args={[0.075, 16, 16]} />
          <meshStandardMaterial color="#fffaf7" emissive="#e4d5cc" emissiveIntensity={2} />
          <pointLight color="#e4d5cc" intensity={0.7} distance={1.2} />
        </mesh>
      </group>
    </>
  );
};

const CurriculumModuleVisual: React.FC<CurriculumModuleVisualProps> = ({ moduleNumber, title, partTitle, level }) => {
  const reducedMotion = usePrefersReducedMotion();

  return (
  <section className="overflow-hidden border-y border-bg-800 bg-[radial-gradient(circle_at_78%_35%,rgba(109,0,26,0.18),transparent_32%),#0c0a0c]" aria-label={`3D learning path preview for module ${moduleNumber}`}>
    <div className="flex flex-col gap-2 border-b border-bg-800/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <div>
        <p className="font-mono-quantum text-[10px] uppercase tracking-[0.18em] text-cyan-300">3D learning path</p>
        <p className="mt-1 text-xs text-text-400">A visual loop for this source-backed module — the exact lesson content remains below.</p>
      </div>
      <span className="w-fit rounded-full border border-primary-500/20 bg-primary-500/10 px-2.5 py-1 font-mono-quantum text-[10px] text-primary-200">module {moduleNumber}</span>
    </div>
    <div className="relative h-[250px] w-full sm:h-[280px]">
      <Canvas camera={{ position: [0, 2.4, 7.4], fov: 46 }} dpr={[1, 1.5]}>
        <color attach="background" args={['#0c0a0c']} />
        <StageScene reducedMotion={reducedMotion} />
        <OrbitControls enablePan={false} enableZoom={false} autoRotate={!reducedMotion} autoRotateSpeed={0.35} target={[0, -0.1, 0]} />
      </Canvas>
      <div className="pointer-events-none absolute bottom-3 left-4 rounded-md border border-bg-700/80 bg-bg-950/75 px-2.5 py-1.5 text-[10px] text-text-500 backdrop-blur-sm">
        {reducedMotion ? 'Motion reduced · learning path preview' : 'Drag to orbit · learning path preview'}
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-bg-800/80 px-5 py-3 text-xs text-text-500 sm:px-7">
      <span className="text-text-300">{title}</span>
      <span>·</span>
      <span>{partTitle}</span>
      <span>·</span>
      <span>{level}</span>
    </div>
  </section>
  );
};

export default CurriculumModuleVisual;
