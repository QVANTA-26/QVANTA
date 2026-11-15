import React from 'react';
import { useCircuitStore, GATE_PALETTE } from '@/store/circuit';
import { GATE_SPECS } from '@/lib/circuit';
import type { GateOp } from '@qvanta/types';

const CELL_W = 56;
const CELL_H = 56;
const PALETTE_W = 200;
const PALETTE_COLS = 4;
const PALETTE_ICON = 38;

const CircuitScene2D: React.FC = () => {
  const qubits = useCircuitStore((s) => s.qubits);
  const timesteps = useCircuitStore((s) => s.timesteps);
  const operations = useCircuitStore((s) => s.operations);
  const cursor = useCircuitStore((s) => s.cursor);
  const selectedGate = useCircuitStore((s) => s.selectedGate);
  const setSelected = useCircuitStore((s) => s.setSelectedGate);
  const placeGate = useCircuitStore((s) => s.placeGate);
  const placeGateAtCursor = useCircuitStore((s) => s.placeGateAtCursor);
  const removeAt = useCircuitStore((s) => s.removeAt);
  const setCursor = useCircuitStore((s) => s.setCursor);

  const paletteRows = Math.ceil(GATE_PALETTE.length / PALETTE_COLS);
  const paletteHeight = paletteRows * (PALETTE_ICON + 10) + 24;
  const canvasW = PALETTE_W + (timesteps + 1) * CELL_W;
  const canvasH = Math.max(Math.max(qubits + 1, 4) * CELL_H + 40, paletteHeight);

  const railY = (i: number) => 40 + (i + 0.5) * CELL_H;
  const stepX = (t: number) => PALETTE_W + (t + 0.5) * CELL_W;

  const handleCellClick = (qubit: number, timestep: number) => {
    setCursor({ qubit, timestep });
    if (selectedGate) placeGateAtCursor(selectedGate);
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useCircuitStore.getState();
      let c = { ...st.cursor };
      let handled = true;
      switch (e.key) {
        case 'ArrowLeft': c.timestep = Math.max(0, c.timestep - 1); break;
        case 'ArrowRight': c.timestep = Math.min(timesteps - 1, c.timestep + 1); break;
        case 'ArrowUp': c.qubit = Math.max(0, c.qubit - 1); break;
        case 'ArrowDown': c.qubit = Math.min(qubits - 1, c.qubit + 1); break;
        case 'Enter': case ' ':
          placeGateAtCursor(selectedGate ?? 'H'); break;
        case 'Delete': case 'Backspace':
          removeAt(st.cursor.qubit, st.cursor.timestep); break;
        default: handled = false;
      }
      if (handled) { e.preventDefault(); setCursor(c); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [qubits, timesteps, selectedGate, setCursor, placeGateAtCursor, removeAt]);

  return (
    <div className="h-full w-full overflow-auto p-4">
      <svg width={canvasW} height={canvasH} className="rounded-lg bg-bg-950">
        <g>
          {GATE_PALETTE.map((g, i) => {
            const spec = GATE_SPECS[g];
            const col = i % PALETTE_COLS;
            const row = Math.floor(i / PALETTE_COLS);
            const cellW = (PALETTE_W - 16) / PALETTE_COLS;
            const x = 8 + col * cellW + cellW / 2;
            const y = 20 + row * (PALETTE_ICON + 10) + PALETTE_ICON / 2;
            const active = selectedGate === g;
            return (
              <g key={g} style={{ cursor: 'pointer' }} onClick={() => setSelected(g)}>
                <rect
                  x={x - cellW / 2 + 3}
                  y={y - PALETTE_ICON / 2}
                  width={cellW - 6}
                  height={PALETTE_ICON}
                  rx={7}
                  fill={active ? spec.color : '#1a1517'}
                  stroke={active ? '#e4d5cc' : '#3b3030'}
                  strokeWidth={active ? 2 : 1}
                  opacity={active ? 0.95 : 0.9}
                />
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize={spec.label.length > 3 ? 9 : 12}
                  fontWeight={700}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {spec.label}
                </text>
              </g>
            );
          })}
        </g>

        <g>
          {Array.from({ length: timesteps }).map((_, t) => (
            <text
              key={t}
              x={stepX(t)}
              y={20}
               fill="#aa9b92"
              fontSize={10}
              textAnchor="middle"
              style={{ userSelect: 'none' }}
            >
              t{t}
            </text>
          ))}
          {Array.from({ length: qubits }).map((_, i) => {
            const y = railY(i);
            return (
              <g key={i}>
                <line
                  x1={PALETTE_W + CELL_W * 0.2}
                  y1={y}
                  x2={PALETTE_W + (timesteps + 0.2) * CELL_W}
                  y2={y}
                   stroke="#554944"
                  strokeWidth={2}
                />
                 <text x={PALETTE_W + 8} y={y - 8} fill="#aa9b92" fontSize={10} style={{ userSelect: 'none' }}>
                  q<tspan baselineShift="sub">{i}</tspan>
                </text>
              </g>
            );
          })}
        </g>

        <g>
          {Array.from({ length: qubits }).map((_, i) =>
            Array.from({ length: timesteps }).map((_, t) => (
              <rect
                key={`c-${i}-${t}`}
                x={PALETTE_W + t * CELL_W + CELL_W * 0.12}
                y={railY(i) - CELL_H * 0.42}
                width={CELL_W * 0.76}
                height={CELL_H * 0.84}
                rx={6}
                 fill={cursor.qubit === i && cursor.timestep === t ? 'rgba(143,16,45,0.22)' : 'transparent'}
                 stroke={cursor.qubit === i && cursor.timestep === t ? '#8f102d' : 'transparent'}
                strokeDasharray="3 3"
                style={{ cursor: 'crosshair' }}
                onClick={() => handleCellClick(i, t)}
              />
            ))
          )}
        </g>

        <g>
          {operations.map((op, idx) => {
            const spec = GATE_SPECS[op.gate];
            const cx = stepX(op.timestep);
            const cy = railY(op.qubit);
            const w = CELL_H * 0.68;
            const h = CELL_H * 0.68;
            const targets = [op.target, op.target2].filter(
              (t): t is number => typeof t === 'number'
            );
            const topY = targets.length ? Math.min(cy, ...targets.map(railY)) : cy;
            const bottomY = targets.length ? Math.max(cy, ...targets.map(railY)) : cy;
            return (
              <g
                key={`${op.gate}-${op.qubit}-${op.timestep}-${op.target ?? 'x'}-${idx}`}
                style={{ cursor: 'pointer' }}
                onDoubleClick={(e) => { e.stopPropagation(); removeAt(op.qubit, op.timestep, op.target); }}
              >
                {targets.length > 0 && (
                  <line
                    x1={cx}
                    y1={topY}
                    x2={cx}
                    y2={bottomY}
                    stroke={spec.color}
                    strokeWidth={2.2}
                  />
                )}
                {targets.map((t) => (
                  <circle
                    key={`dot-${t}`}
                    cx={cx}
                    cy={railY(t)}
                    r={4}
                    fill={spec.color}
                    stroke="#292122"
                    strokeWidth={1}
                  />
                ))}
                <rect
                  x={cx - w / 2}
                  y={cy - h / 2}
                  width={w}
                  height={h}
                  rx={8}
                  fill={spec.color}
                  stroke="#292122"
                  strokeWidth={1.4}
                />
                <text
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize={spec.label.length > 3 ? 9 : spec.label.length > 1 ? 11 : 14}
                  fontWeight={700}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {spec.label}
                </text>
                {spec.targets > 0 && (
                  <circle cx={cx} cy={cy} r={spec.targets === 2 ? 4 : 3.5} fill="#292122" />
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default CircuitScene2D;
