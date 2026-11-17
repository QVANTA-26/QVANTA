import React from 'react';
import type { Circuit } from '@qvanta/types';
import { GATE_SPECS } from '@/lib/circuit';

const ROW_HEIGHT = 48;
const LEFT_GUTTER = 58;
const COLUMN_WIDTH = 82;

interface CircuitDiagramProps {
  circuit: Circuit;
  ariaLabel: string;
  className?: string;
}

/**
 * Renders a circuit AST as an inline SVG diagram. Shared by the curriculum
 * preview and Paper Lab so extracted paper circuits look identical to the ones
 * learners already know.
 */
const CircuitDiagram: React.FC<CircuitDiagramProps> = ({ circuit, ariaLabel, className }) => {
  const gradientId = React.useId();
  const timesteps = Math.max(1, circuit.timesteps);
  const qubits = Math.max(1, circuit.qubits);
  const width = LEFT_GUTTER + timesteps * COLUMN_WIDTH + 36;
  const height = Math.max(176, 64 + qubits * ROW_HEIGHT);

  const columnX = (timestep: number) => LEFT_GUTTER + timestep * COLUMN_WIDTH + COLUMN_WIDTH / 2;
  const rowY = (qubit: number) => 52 + qubit * ROW_HEIGHT;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      className={className ?? 'h-auto min-w-[560px]'}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1b1215" />
          <stop offset="1" stopColor="#0c0a0c" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={width} height={height} rx="14" fill={`url(#${gradientId})`} />

      {Array.from({ length: timesteps }, (_, timestep) => (
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

      {Array.from({ length: qubits }, (_, qubit) => (
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
        const spec = GATE_SPECS[operation.gate];
        const color = spec.color;
        const targets = [operation.target, operation.target2].filter(
          (t): t is number => typeof t === 'number'
        );

        if (targets.length > 0) {
          const topY = Math.min(y, ...targets.map(rowY));
          const bottomY = Math.max(y, ...targets.map(rowY));
          return (
            <g key={`operation-${index}`}>
              <line x1={x} y1={topY} x2={x} y2={bottomY} stroke={color} strokeWidth="2" />
              <circle cx={x} cy={y} r="6" fill={color} />
              {targets.map((t) => {
                const targetY = rowY(t);
                return (
                  <g key={`target-${t}`}>
                    <circle cx={x} cy={targetY} r="10" fill="#100c0e" stroke={color} strokeWidth="2" />
                    {(spec.targets === 1 && operation.gate !== 'SWAP' && operation.gate !== 'iSWAP') ? (
                      <>
                        <line x1={x - 6} y1={targetY} x2={x + 6} y2={targetY} stroke={color} strokeWidth="2" />
                        <line x1={x} y1={targetY - 6} x2={x} y2={targetY + 6} stroke={color} strokeWidth="2" />
                      </>
                    ) : (
                      <text
                        x={x}
                        y={targetY + 4}
                        textAnchor="middle"
                        fill={color}
                        fontSize="10"
                        fontWeight="700"
                        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                      >
                        {operation.gate === 'SWAP' || operation.gate === 'iSWAP'
                          ? spec.label
                          : spec.label.replace(/^C/, '')}
                      </text>
                    )}
                  </g>
                );
              })}
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
              {spec.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default CircuitDiagram;
