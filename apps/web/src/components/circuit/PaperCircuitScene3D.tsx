import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid, OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { Circuit, GateOp } from '@qvanta/types';
import { GATE_SPECS } from '@/lib/circuit';

const QUBIT_SPACING = 1.6;
const STEP_SPACING = 1.45;

const formatParameter = (radians: number | undefined) => {
  if (typeof radians !== 'number' || !Number.isFinite(radians)) return '';
  const normalized = radians / Math.PI;
  if (Math.abs(normalized) < 0.0001) return '0';
  const fractions: Array<[number, string]> = [
    [1 / 12, 'π/12'],
    [1 / 8, 'π/8'],
    [1 / 6, 'π/6'],
    [1 / 4, 'π/4'],
    [1 / 3, 'π/3'],
    [1 / 2, 'π/2'],
    [3 / 4, '3π/4'],
    [1, 'π'],
  ];
  for (const [fraction, label] of fractions) {
    if (Math.abs(normalized - fraction) < 0.0001) return label;
    if (Math.abs(normalized + fraction) < 0.0001) return `-${label}`;
  }
  return `${radians.toFixed(2)} rad`;
};

interface PaperCircuitScene3DProps {
  circuit: Circuit;
}

const PaperCircuitScene3D: React.FC<PaperCircuitScene3DProps> = ({ circuit }) => {
  const qubits = Math.max(1, circuit.qubits);
  const timesteps = Math.max(1, circuit.timesteps);

  const xOf = (timestep: number) =>
    timesteps === 1 ? 0 : (timestep - (timesteps - 1) / 2) * STEP_SPACING;
  const zOf = (qubit: number) =>
    qubits === 1 ? 0 : (qubit - (qubits - 1) / 2) * QUBIT_SPACING;

  const gateFor = (operation: GateOp, index: number) => {
    const spec = GATE_SPECS[operation.gate];
    const x = xOf(operation.timestep);
    const z = zOf(operation.qubit);
    const targets = [operation.target, operation.target2].filter(
      (target): target is number => typeof target === 'number'
    );
    const parameterText = spec.parameter ? formatParameter(operation.parameter) : '';
    const detailText = parameterText ? `${spec.name} · ${parameterText}` : spec.name;

    return (
      <group key={`${operation.gate}-${operation.qubit}-${operation.timestep}-${index}`}>
        {targets.map((target) => (
          <mesh
            key={`control-${target}`}
            position={[x, 0.55, z]}
          >
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshStandardMaterial
              color={spec.color}
              emissive={spec.color}
              emissiveIntensity={0.7}
            />
          </mesh>
        ))}
        {targets.map((target) => {
          const targetZ = zOf(target);
          const distance = targetZ - z;
          return (
            <group key={target}>
              <mesh
                position={[x, 0.55, z + distance / 2]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <cylinderGeometry args={[0.035, 0.035, Math.abs(distance), 12]} />
                <meshStandardMaterial
                  color={spec.color}
                  emissive={spec.color}
                  emissiveIntensity={0.45}
                />
              </mesh>
              {operation.gate === 'CNOT' ? (
                <group position={[x, 0.55, targetZ]} rotation={[Math.PI / 2, 0, 0]}>
                  <mesh>
                    <ringGeometry args={[0.13, 0.19, 20]} />
                    <meshStandardMaterial color={spec.color} emissive={spec.color} emissiveIntensity={0.7} />
                  </mesh>
                  <mesh rotation={[0, 0, 0]}>
                    <boxGeometry args={[0.08, 0.36, 0.08]} />
                    <meshStandardMaterial color={spec.color} emissive={spec.color} emissiveIntensity={0.7} />
                  </mesh>
                </group>
              ) : (
                <mesh position={[x, 0.55, targetZ]}>
                  <sphereGeometry args={[0.13, 16, 16]} />
                  <meshStandardMaterial
                    color={spec.color}
                    emissive={spec.color}
                    emissiveIntensity={0.55}
                  />
                </mesh>
              )}
            </group>
          );
        })}

        <mesh position={[x, 0.55, z]} castShadow>
          {targets.length > 0 ? (
            <cylinderGeometry args={[0.32, 0.32, 0.58, 18]} />
          ) : (
            <boxGeometry args={[0.72, 0.72, 0.72]} />
          )}
          <meshStandardMaterial
            color={spec.color}
            emissive={spec.color}
            emissiveIntensity={0.38}
            roughness={0.38}
          />
        </mesh>
        <Text
          position={[x, 0.55, z + 0.45]}
          fontSize={spec.label.length > 3 ? 0.14 : 0.19}
          anchorX="center"
          anchorY="middle"
          color="#ffffff"
          outlineWidth={0.012}
          outlineColor="#0c0a0c"
        >
          {spec.label}
        </Text>
        <Text
          position={[x, 0.05, z + 0.58]}
          fontSize={0.1}
          anchorX="center"
          anchorY="middle"
          color="#d8cec6"
          outlineWidth={0.01}
          outlineColor="#0c0a0c"
        >
          {detailText}
        </Text>
      </group>
    );
  };

  const cameraDistance = Math.max(10, timesteps * 0.75, qubits * 1.25);

  return (
    <div className="relative h-[520px] w-full overflow-hidden bg-[#0c0a0c]">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{
          position: [cameraDistance * 0.7, cameraDistance * 0.9, cameraDistance],
          fov: 42,
          near: 0.1,
          far: 100,
        }}
      >
        <color attach="background" args={['#0c0a0c']} />
        <ambientLight intensity={0.72} />
        <directionalLight
          position={[5, 9, 7]}
          intensity={1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[-5, 5, -4]} intensity={0.8} color="#75d7ed" />

        <Grid
          position={[0, -0.02, 0]}
          args={[Math.max(14, timesteps * STEP_SPACING + 8), Math.max(12, qubits * QUBIT_SPACING + 5)]}
          cellSize={1}
          cellThickness={0.35}
          cellColor="#30282a"
          sectionSize={5}
          sectionThickness={0.7}
          sectionColor="#5a4b4c"
          fadeDistance={32}
          infiniteGrid={false}
        />

        {Array.from({ length: timesteps }, (_, timestep) => (
          <Text
            key={`step-${timestep}`}
            position={[
              xOf(timestep),
              0.18,
              zOf(qubits - 1) + 0.75,
            ]}
            fontSize={0.14}
            anchorX="center"
            anchorY="middle"
            color="#9faaa8"
          >
            STEP {timestep + 1}
          </Text>
        ))}

        {Array.from({ length: qubits }, (_, qubit) => {
          const z = zOf(qubit);
          const length = Math.max(2.5, (timesteps - 1) * STEP_SPACING + 2.2);
          return (
            <group key={`rail-${qubit}`}>
              <mesh position={[0, 0, z]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.035, 0.035, length, 12]} />
                <meshStandardMaterial
                  color="#756963"
                  emissive="#756963"
                  emissiveIntensity={0.12}
                />
              </mesh>
              <Text
                position={[-length / 2 - 0.55, 0.15, z]}
                fontSize={0.2}
                anchorX="center"
                anchorY="middle"
                color="#e4d5cc"
              >
                {`q${qubit}`}
              </Text>
            </group>
          );
        })}

        {circuit.operations.map(gateFor)}

        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          enableRotate
          minDistance={4}
          maxDistance={50}
          target={[0, 1.2, 0]}
        />
      </Canvas>
    </div>
  );
};

export default PaperCircuitScene3D;
