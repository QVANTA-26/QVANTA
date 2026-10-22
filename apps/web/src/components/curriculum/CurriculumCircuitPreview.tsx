import React from 'react';
import { Button, Card, CardContent } from '@qvanta/ui';
import type { GateOp } from '@qvanta/types';
import type { CurriculumModule } from './curriculum';
import { buildCurriculumCircuit, type CurriculumCircuitBlueprint } from '@/lib/curriculum-circuit';

interface CurriculumCircuitPreviewProps {
  module: CurriculumModule;
  onOpenBuilder: (blueprint: CurriculumCircuitBlueprint) => void;
}

const ROW_HEIGHT = 48;
const LEFT_GUTTER = 58;
const COLUMN_WIDTH = 82;

const gateColor: Record<GateOp['gate'], string> = {
  H: '#d8ad96',
  X: '#c58c88',
  Y: '#b76e79',
  Z: '#9fb3a4',
  CNOT: '#e4d5cc',
  Measure: '#9ed4df',
};

const CurriculumCircuitPreview: React.FC<CurriculumCircuitPreviewProps> = ({ module, onOpenBuilder }) => {
  const blueprint = React.useMemo(() => buildCurriculumCircuit(module), [module]);
  const { circuit } = blueprint;
  const width = LEFT_GUTTER + Math.max(1, circuit.timesteps) * COLUMN_WIDTH + 36;
  const height = Math.max(176, 64 + circuit.qubits * ROW_HEIGHT);

  const columnX = (timestep: number) => LEFT_GUTTER + timestep * COLUMN_WIDTH + COLUMN_WIDTH / 2;
  const rowY = (qubit: number) => 52 + qubit * ROW_HEIGHT;

  return (
    <Card className="overflow-hidden border-cyan-500/20 bg-[radial-gradient(circle_at_82%_20%,rgba(158,212,223,0.1),transparent_35%),#100c0e]">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 border-b border-bg-800 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-7">
          <div>
            <p className="font-mono-quantum text-[10px] uppercase tracking-[0.18em] text-cyan-300">Module circuit</p>
            <h3 className="mt-1 text-base font-semibold text-text-50">See the idea as a circuit</h3>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-text-400">
              This preview is generated from the module title, lesson content, and checkpoint. Edit it in the builder when you are ready.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => onOpenBuilder(blueprint)}>
            Open in Circuit Builder
          </Button>
        </div>

        <div className="overflow-x-auto px-4 py-5 sm:px-7">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`Related circuit for ${module.title}`}
            className="h-auto min-w-[560px]"
          >
            <defs>
              <linearGradient id={`module-circuit-bg-${module.id}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#1b1215" />
                <stop offset="1" stopColor="#0c0a0c" />
              </linearGradient>
            </defs>
            <rect x="0" y="0" width={width} height={height} rx="14" fill={`url(#module-circuit-bg-${module.id})`} />

            {Array.from({ length: circuit.timesteps }, (_, timestep) => (
              <g key={`column-${timestep}`}>
                <text
                  x={columnX(timestep)}
                  y="24"
                  textAnchor="middle"
                  fill="#756963"
                  fontSize="10"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  t{timestep}
                </text>
                <line
                  x1={columnX(timestep)}
                  y1="32"
                  x2={columnX(timestep)}
                  y2={height - 18}
                  stroke="#2e2528"
                  strokeDasharray="2 5"
                />
              </g>
            ))}

            {Array.from({ length: circuit.qubits }, (_, qubit) => (
              <g key={`wire-${qubit}`}>
                <text
                  x="24"
                  y={rowY(qubit) + 4}
                  textAnchor="middle"
                  fill="#e4d5cc"
                  fontSize="12"
                  fontWeight="600"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                >
                  q{qubit}
                </text>
                <line
                  x1={LEFT_GUTTER - 14}
                  y1={rowY(qubit)}
                  x2={width - 24}
                  y2={rowY(qubit)}
                  stroke="#756963"
                  strokeWidth="1.5"
                />
              </g>
            ))}

            {circuit.operations.map((operation, index) => {
              const x = columnX(operation.timestep);
              const y = rowY(operation.qubit);
              const color = gateColor[operation.gate];

              if (operation.gate === 'CNOT' && typeof operation.target === 'number') {
                const targetY = rowY(operation.target);
                return (
                  <g key={`operation-${index}`}>
                    <line x1={x} y1={Math.min(y, targetY)} x2={x} y2={Math.max(y, targetY)} stroke={color} strokeWidth="2" />
                    <circle cx={x} cy={y} r="7" fill={color} />
                    <circle cx={x} cy={targetY} r="10" fill="#100c0e" stroke={color} strokeWidth="2" />
                    <line x1={x - 6} y1={targetY} x2={x + 6} y2={targetY} stroke={color} strokeWidth="2" />
                    <line x1={x} y1={targetY - 6} x2={x} y2={targetY + 6} stroke={color} strokeWidth="2" />
                  </g>
                );
              }

              return (
                <g key={`operation-${index}`}>
                  <rect x={x - 16} y={y - 16} width="32" height="32" rx="8" fill="#1e1619" stroke={color} strokeWidth="1.6" />
                  <text
                    x={x}
                    y={y + 4}
                    textAnchor="middle"
                    fill={color}
                    fontSize="12"
                    fontWeight="700"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  >
                    {operation.gate === 'Measure' ? 'M' : operation.gate}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="grid gap-3 border-t border-bg-800 px-5 py-4 text-xs sm:grid-cols-3 sm:px-7">
          <div>
            <p className="uppercase tracking-[0.14em] text-text-500">Focus</p>
            <p className="mt-1 leading-5 text-text-200">{blueprint.focus}</p>
          </div>
          <div>
            <p className="uppercase tracking-[0.14em] text-text-500">What happens</p>
            <p className="mt-1 leading-5 text-text-300">{blueprint.explanation}</p>
          </div>
          <div>
            <p className="uppercase tracking-[0.14em] text-text-500">Predict first</p>
            <p className="mt-1 leading-5 text-cyan-200">{blueprint.prediction}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CurriculumCircuitPreview;
