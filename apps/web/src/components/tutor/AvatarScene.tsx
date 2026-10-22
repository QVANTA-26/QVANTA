import React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { AvatarPresetId } from '@qvanta/ui';
import { useSpeechSynthesisViseme } from '@/hooks/useSpeechSynthesisViseme';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import TutorIntroLoader from '@/components/tutor/TutorIntroLoader';
import TutorVisualBackdrop from '@/components/tutor/TutorVisualBackdrop';

export interface AvatarSceneProps {
  presetId: AvatarPresetId;
  /** Leave true/undefined for the first-load entrance, or set false to skip it. */
  introActive?: boolean;
  /** Called when the loader and entrance sequence have settled into the idle pose. */
  onIntroComplete?: () => void;
  /** Optional lesson/module identity for the visual environment. */
  sceneKey?: string;
  sceneTitle?: string;
}

interface Preset {
  skin: string;
  hair: string;
  accent: string;
  iris: string;
  scale: number;
}

const PRESETS: Preset[] = [
  { skin: '#f3c6a5', hair: '#292122', accent: '#8f102d', iris: '#d19b83', scale: 1.0 },
  { skin: '#d9a17a', hair: '#713f34', accent: '#b76e79', iris: '#8aa58e', scale: 1.02 },
  { skin: '#8d5524', hair: '#0c0a0c', accent: '#d19b83', iris: '#e4d5cc', scale: 0.98 },
];

type IntroPhase = 'loading' | 'entering' | 'idle';

const LOADER_DURATION_MS = 1050;
const ENTRY_DURATION_MS = 2100;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const easeOutCubic = (value: number): number => 1 - Math.pow(1 - clamp01(value), 3);

const easeOutBack = (value: number): number => {
  const t = clamp01(value) - 1;
  const c1 = 1.12;
  const c3 = c1 + 1;
  return 1 + c3 * t * t * t + c1 * t * t;
};

const makeMouthGeometry = (): THREE.BufferGeometry => {
  const width = 0.45;
  const height = 0.04;
  const depth = 0.06;
  const base = new THREE.BoxGeometry(width, height, depth, 10, 3, 1);
  const pos = base.attributes.position;
  const orig = new Float32Array(pos.array as Float32Array);

  base.morphAttributes.position = [];

  // closed = original
  const closed = new THREE.BufferAttribute(new Float32Array(orig), 3);
  base.morphAttributes.position.push(closed);

  // viseme A: mouth open vertically
  const aArr = new Float32Array(orig);
  for (let i = 0; i < pos.count; i++) {
    const y = orig[i * 3 + 1];
    aArr[i * 3 + 1] = y + (y > 0 ? 1 : -1) * 0.11;
    const x = orig[i * 3];
    aArr[i * 3] = x * 0.92;
  }
  const a = new THREE.BufferAttribute(aArr, 3);
  base.morphAttributes.position.push(a);

  // viseme O: rounded
  const oArr = new Float32Array(orig);
  for (let i = 0; i < pos.count; i++) {
    const y = orig[i * 3 + 1];
    oArr[i * 3 + 1] = y + (y > 0 ? 1 : -1) * 0.07;
    const x = orig[i * 3];
    oArr[i * 3] = x * 0.6;
    const z = orig[i * 3 + 2];
    oArr[i * 3 + 2] = z + (z > 0 ? 0.05 : z < 0 ? -0.05 : 0);
  }
  const o = new THREE.BufferAttribute(oArr, 3);
  base.morphAttributes.position.push(o);

  return base;
};

interface AvatarBodyProps {
  preset: Preset;
  introPhase: IntroPhase;
  reducedMotion: boolean;
}

/** A simple full-body rig gives the entrance a readable walk cycle without external assets. */
const AvatarBody: React.FC<AvatarBodyProps> = ({ preset, introPhase, reducedMotion }) => {
  const bodyRef = React.useRef<THREE.Group>(null);
  const leftArmRef = React.useRef<THREE.Group>(null);
  const rightArmRef = React.useRef<THREE.Group>(null);
  const leftLegRef = React.useRef<THREE.Group>(null);
  const rightLegRef = React.useRef<THREE.Group>(null);
  const motionTimeRef = React.useRef(0);

  React.useEffect(() => {
    motionTimeRef.current = 0;
  }, [introPhase]);

  useFrame((_, delta) => {
    motionTimeRef.current += delta;
    const time = motionTimeRef.current;
    const walking = introPhase === 'entering' && !reducedMotion;
    const gait = walking ? Math.sin(time * 10.5) : 0;
    const idleSway = !walking && !reducedMotion ? Math.sin(time * 1.2) : 0;

    if (bodyRef.current) {
      bodyRef.current.position.y = Math.abs(gait) * 0.045 + idleSway * 0.012;
      bodyRef.current.rotation.z = gait * 0.018 + idleSway * 0.008;
    }
    if (leftArmRef.current) {
      leftArmRef.current.rotation.z = 0.08 + gait * 0.38;
      leftArmRef.current.rotation.x = gait * 0.1;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.z = -0.08 - gait * 0.38;
      rightArmRef.current.rotation.x = -gait * 0.1;
    }
    if (leftLegRef.current) leftLegRef.current.rotation.x = gait * 0.42;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -gait * 0.42;
  });

  return (
    <group ref={bodyRef}>
      {/* Quantum tutor jacket / torso */}
      <mesh position={[0, -1.52, 0]} castShadow>
        <cylinderGeometry args={[0.52, 0.66, 1.08, 28]} />
        <meshStandardMaterial color="#111827" roughness={0.5} metalness={0.15} />
      </mesh>
      <mesh position={[0, -1.5, 0.53]}>
        <boxGeometry args={[0.08, 0.86, 0.025]} />
        <meshStandardMaterial color={preset.accent} emissive={preset.accent} emissiveIntensity={0.55} />
      </mesh>
      <mesh position={[0, -1.97, 0]}>
        <sphereGeometry args={[0.58, 24, 14]} />
        <meshStandardMaterial color="#0f172a" roughness={0.62} metalness={0.18} />
      </mesh>

      {/* Arms swing opposite each other during the entrance. */}
      <group ref={leftArmRef} position={[-0.58, -1.13, 0]}>
        <mesh position={[0, -0.46, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.19, 0.92, 18]} />
          <meshStandardMaterial color="#1e293b" roughness={0.55} metalness={0.12} />
        </mesh>
        <mesh position={[0, -0.98, 0.02]}>
          <sphereGeometry args={[0.17, 16, 14]} />
          <meshStandardMaterial color={preset.skin} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.14, 0]}>
          <sphereGeometry args={[0.19, 16, 14]} />
          <meshStandardMaterial color="#273449" roughness={0.5} />
        </mesh>
      </group>
      <group ref={rightArmRef} position={[0.58, -1.13, 0]}>
        <mesh position={[0, -0.46, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.19, 0.92, 18]} />
          <meshStandardMaterial color="#1e293b" roughness={0.55} metalness={0.12} />
        </mesh>
        <mesh position={[0, -0.98, 0.02]}>
          <sphereGeometry args={[0.17, 16, 14]} />
          <meshStandardMaterial color={preset.skin} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.14, 0]}>
          <sphereGeometry args={[0.19, 16, 14]} />
          <meshStandardMaterial color="#273449" roughness={0.5} />
        </mesh>
      </group>

      {/* Legs and shoes make the side-to-side entrance read as a walk, not a slide. */}
      <group ref={leftLegRef} position={[-0.23, -2.1, 0]}>
        <mesh position={[0, -0.48, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.22, 1.0, 18]} />
          <meshStandardMaterial color="#172033" roughness={0.65} metalness={0.12} />
        </mesh>
        <mesh position={[0, -1.0, 0.12]}>
          <boxGeometry args={[0.34, 0.2, 0.56]} />
          <meshStandardMaterial color="#020617" roughness={0.45} metalness={0.25} />
        </mesh>
      </group>
      <group ref={rightLegRef} position={[0.23, -2.1, 0]}>
        <mesh position={[0, -0.48, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.22, 1.0, 18]} />
          <meshStandardMaterial color="#172033" roughness={0.65} metalness={0.12} />
        </mesh>
        <mesh position={[0, -1.0, 0.12]}>
          <boxGeometry args={[0.34, 0.2, 0.56]} />
          <meshStandardMaterial color="#020617" roughness={0.45} metalness={0.25} />
        </mesh>
      </group>
    </group>
  );
};

interface AvatarRigProps {
  preset: Preset;
  viseme: number;
  blinking: boolean;
  introPhase: IntroPhase;
  reducedMotion: boolean;
}

const AvatarRig: React.FC<AvatarRigProps> = ({ preset, viseme, blinking, introPhase, reducedMotion }) => {
  const mouthRef = React.useRef<THREE.Mesh>(null);
  const mouthGeo = React.useMemo(() => makeMouthGeometry(), []);

  React.useEffect(() => {
    const m = mouthRef.current;
    if (!m) return;
    if (!Array.isArray(m.morphTargetInfluences) || m.morphTargetInfluences.length < 3) {
      m.morphTargetInfluences = [0, 0, 0];
    }
    const closed = 1 - viseme * 0.2;
    const a = viseme * 0.8;
    const o = viseme * 0.35 * (1 - viseme);
    // morph target order: [closed, A, O]
    m.morphTargetInfluences[0] = Math.max(0, closed);
    m.morphTargetInfluences[1] = Math.max(0, a);
    m.morphTargetInfluences[2] = Math.max(0, o);
  }, [viseme]);

  const eyeScaleY = blinking ? 0.08 : 1;

  return (
    <group scale={preset.scale}>
      <AvatarBody preset={preset} introPhase={introPhase} reducedMotion={reducedMotion} />

      {/* Neck */}
      <mesh position={[0, -0.85, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.28, 0.5, 24]} />
        <meshStandardMaterial color={preset.skin} roughness={0.7} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0, 0]} castShadow>
        <sphereGeometry args={[0.88, 48, 40]} />
        <meshStandardMaterial color={preset.skin} roughness={0.65} />
      </mesh>

      {/* Hair cap */}
      <mesh position={[0, 0.42, -0.05]} castShadow>
        <sphereGeometry args={[0.9, 36, 28, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
        <meshStandardMaterial color={preset.hair} roughness={0.9} />
      </mesh>

      {/* Ears */}
      <mesh position={[-0.82, -0.05, 0]}>
        <sphereGeometry args={[0.14, 16, 14]} />
        <meshStandardMaterial color={preset.skin} roughness={0.7} />
      </mesh>
      <mesh position={[0.82, -0.05, 0]}>
        <sphereGeometry args={[0.14, 16, 14]} />
        <meshStandardMaterial color={preset.skin} roughness={0.7} />
      </mesh>

      {/* Eyes */}
      <group>
        <mesh position={[-0.28, 0.08, 0.78]} scale={[1, eyeScaleY, 1]}>
          <sphereGeometry args={[0.13, 24, 18]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        <mesh position={[-0.28, 0.08, 0.9]} scale={[1, eyeScaleY, 1]}>
          <sphereGeometry args={[0.065, 20, 14]} />
          <meshStandardMaterial color={preset.iris} roughness={0.2} />
        </mesh>
        <mesh position={[-0.26, 0.09, 0.95]} scale={[1, eyeScaleY, 1]}>
          <sphereGeometry args={[0.025, 12, 10]} />
          <meshBasicMaterial color="#020617" />
        </mesh>

        <mesh position={[0.28, 0.08, 0.78]} scale={[1, eyeScaleY, 1]}>
          <sphereGeometry args={[0.13, 24, 18]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        <mesh position={[0.28, 0.08, 0.9]} scale={[1, eyeScaleY, 1]}>
          <sphereGeometry args={[0.065, 20, 14]} />
          <meshStandardMaterial color={preset.iris} roughness={0.2} />
        </mesh>
        <mesh position={[0.3, 0.09, 0.95]} scale={[1, eyeScaleY, 1]}>
          <sphereGeometry args={[0.025, 12, 10]} />
          <meshBasicMaterial color="#020617" />
        </mesh>
      </group>

      {/* Brows */}
      <mesh position={[-0.28, 0.3, 0.79]} rotation={[0.2, 0, 0.08]}>
        <boxGeometry args={[0.26, 0.035, 0.02]} />
        <meshStandardMaterial color={preset.hair} roughness={0.9} />
      </mesh>
      <mesh position={[0.28, 0.3, 0.79]} rotation={[0.2, 0, -0.08]}>
        <boxGeometry args={[0.26, 0.035, 0.02]} />
        <meshStandardMaterial color={preset.hair} roughness={0.9} />
      </mesh>

      {/* Nose */}
      <mesh position={[0, -0.14, 0.88]} rotation={[0.4, 0, 0]}>
        <coneGeometry args={[0.09, 0.22, 16]} />
        <meshStandardMaterial color={preset.skin} roughness={0.75} />
      </mesh>

      {/* Mouth with viseme morph targets */}
      <mesh ref={mouthRef} geometry={mouthGeo} position={[0, -0.46, 0.8]}>
        <meshStandardMaterial color="#7f1d1d" roughness={0.8} />
      </mesh>

      {/* Accent earring / chip (preset personality) */}
      <mesh position={[-0.85, -0.3, 0]}>
        <torusGeometry args={[0.045, 0.015, 12, 24]} />
        <meshStandardMaterial color={preset.accent} metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Collar accent */}
      <mesh position={[0, -1.12, 0.12]}>
        <torusGeometry args={[0.36, 0.05, 16, 48, Math.PI]} />
        <meshStandardMaterial color={preset.accent} metalness={0.4} roughness={0.5} />
      </mesh>
    </group>
  );
};

interface AvatarMotionProps {
  phase: IntroPhase;
  reducedMotion: boolean;
  children: React.ReactNode;
}

const AvatarMotion: React.FC<AvatarMotionProps> = ({ phase, reducedMotion, children }) => {
  const groupRef = React.useRef<THREE.Group>(null);
  const elapsedRef = React.useRef(0);

  React.useEffect(() => {
    elapsedRef.current = 0;
    const group = groupRef.current;
    if (!group) return;
    if (phase === 'entering' && !reducedMotion) {
      group.position.set(-3.05, -0.2, 0);
      group.rotation.set(0, -0.25, 0.02);
    } else {
      group.position.set(0, -0.2, 0);
      group.rotation.set(0, 0, 0);
    }
  }, [phase, reducedMotion]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    elapsedRef.current += delta;
    const time = elapsedRef.current;

    if (phase === 'entering' && !reducedMotion) {
      const progress = clamp01((time * 1000) / ENTRY_DURATION_MS);
      const travel = easeOutBack(progress);
      const walkFade = 1 - easeOutCubic(progress);
      group.position.x = -3.05 + travel * 3.05;
      group.position.y = -0.2 + Math.abs(Math.sin(time * 10.5)) * 0.065 * walkFade;
      group.position.z = Math.sin(time * 4.8) * 0.025 * walkFade;
      group.rotation.y = -0.25 + easeOutCubic(progress) * 0.25;
      group.rotation.z = Math.sin(time * 10.5) * 0.035 * walkFade;
      group.scale.setScalar(0.98 + Math.sin(progress * Math.PI) * 0.02);
      return;
    }

    const breathing = reducedMotion ? 0 : Math.sin(time * 1.25);
    group.position.x = THREE.MathUtils.damp(group.position.x, 0, 5, delta);
    group.position.y = -0.2 + breathing * 0.018;
    group.position.z = THREE.MathUtils.damp(group.position.z, 0, 5, delta);
    group.rotation.y = THREE.MathUtils.damp(group.rotation.y, 0, 5, delta);
    group.rotation.z = breathing * 0.008;
    group.scale.setScalar(1 + breathing * 0.006);
  });

  return (
    <group ref={groupRef} position={phase === 'entering' && !reducedMotion ? [-3.05, -0.2, 0] : [0, -0.2, 0]}>
      {children}
    </group>
  );
};

const AvatarScene: React.FC<AvatarSceneProps> = ({
  presetId,
  introActive = true,
  onIntroComplete,
  sceneKey = 'tutor/default',
  sceneTitle = 'Quantum tutor environment',
}) => {
  const numericPresetId: number = typeof presetId === 'number' ? presetId : 0;
  const preset = PRESETS[numericPresetId] ?? PRESETS[0];
  const { currentViseme, isSpeaking, speak } = useSpeechSynthesisViseme();
  const reducedMotion = usePrefersReducedMotion();
  const [blinking, setBlinking] = React.useState(false);
  const [introPhase, setIntroPhase] = React.useState<IntroPhase>(() =>
    introActive === false || reducedMotion ? 'idle' : 'loading',
  );
  const introCompletedRef = React.useRef(false);
  const onIntroCompleteRef = React.useRef(onIntroComplete);

  React.useEffect(() => {
    onIntroCompleteRef.current = onIntroComplete;
  }, [onIntroComplete]);

  React.useEffect(() => {
    const complete = () => {
      if (introCompletedRef.current) return;
      introCompletedRef.current = true;
      onIntroCompleteRef.current?.();
    };

    if (introActive === false || reducedMotion) {
      setIntroPhase('idle');
      complete();
      return undefined;
    }

    introCompletedRef.current = false;
    setIntroPhase('loading');
    const loaderTimer = window.setTimeout(() => setIntroPhase('entering'), LOADER_DURATION_MS);
    const completionTimer = window.setTimeout(() => {
      setIntroPhase('idle');
      complete();
    }, LOADER_DURATION_MS + ENTRY_DURATION_MS);

    return () => {
      window.clearTimeout(loaderTimer);
      window.clearTimeout(completionTimer);
    };
  }, [introActive, reducedMotion]);

  React.useEffect(() => {
    let cancelled = false;
    let blinkTimer: number | undefined;
    let finishTimer: number | undefined;

    const loop = () => {
      if (cancelled) return;
      const wait = 2500 + Math.random() * 3500;
      blinkTimer = window.setTimeout(() => {
        if (cancelled) return;
        setBlinking(true);
        finishTimer = window.setTimeout(() => {
          if (!cancelled) setBlinking(false);
          loop();
        }, 140 + Math.random() * 80);
      }, wait);
    };
    loop();
    return () => {
      cancelled = true;
      if (blinkTimer !== undefined) window.clearTimeout(blinkTimer);
      if (finishTimer !== undefined) window.clearTimeout(finishTimer);
    };
  }, []);

  // Expose the existing speak API globally for ChatPanel without changing that flow.
  React.useEffect(() => {
    const w = window as any;
    w.__qvantaTutorSpeak = (text: string, voiceIdx?: number) => speak(text, voiceIdx ?? numericPresetId);
    return () => {
      if (w.__qvantaTutorSpeak) delete w.__qvantaTutorSpeak;
    };
  }, [speak, numericPresetId]);

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        frameloop={reducedMotion ? 'demand' : 'always'}
        camera={{ position: [0, -0.9, 5], fov: 50 }}
      >
         <color attach="background" args={['#0c0a0c']} />
        <ambientLight intensity={0.68} />
        <directionalLight position={[3, 5, 4]} intensity={0.72} castShadow />
        <directionalLight position={[-3, 2, 2]} intensity={0.28} color={preset.accent} />
         <pointLight position={[0, 0.8, 2.5]} intensity={0.3} color="#e4d5cc" distance={5} />

        <TutorVisualBackdrop title={sceneTitle} sceneKey={sceneKey} reducedMotion={reducedMotion} />

        {introPhase !== 'loading' && (
          <AvatarMotion phase={introPhase} reducedMotion={reducedMotion}>
            <AvatarRig
              preset={preset}
              viseme={currentViseme}
              blinking={blinking}
              introPhase={introPhase}
              reducedMotion={reducedMotion}
            />
          </AvatarMotion>
        )}

        <OrbitControls
          enabled={introPhase !== 'loading'}
          enablePan={false}
          minDistance={3.4}
          maxDistance={7}
          minPolarAngle={Math.PI * 0.3}
          maxPolarAngle={Math.PI * 0.72}
          target={[0, -0.9, 0]}
        />
      </Canvas>

      {introPhase === 'loading' && <TutorIntroLoader reducedMotion={reducedMotion} />}

      <div className="pointer-events-none absolute bottom-3 left-4 rounded-md border border-bg-800/70 bg-bg-950/65 px-2.5 py-1.5 text-[10px] uppercase tracking-wide text-text-500 backdrop-blur-sm">
        {introPhase === 'loading' ? 'Calibrating tutor' : isSpeaking ? 'Speaking…' : 'Idle · drag to rotate'}
      </div>
    </div>
  );
};

export default AvatarScene;
