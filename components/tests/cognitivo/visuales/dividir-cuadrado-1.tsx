'use client'

import { csvToSet, FILL, Hint, PuzzleBox, STROKE, STROKE_HI, toggleInCSV } from './shared'

interface Props {
  value: string | number | null
  onChange: (v: string | number) => void
  disabled?: boolean
}

// Rectángulo 4×1 con 6 puntos numerados:
//   1 --- 2 --- 3
//   |           |
//   6 --- 5 --- 4
// El corte 2→5 (vertical por el medio) parte el rectángulo en dos cuadrados
// que apilados forman un cuadrado de 2×2.
const PUNTOS = [
  { n: 1, x: 10, y: 30 },
  { n: 2, x: 110, y: 30 },
  { n: 3, x: 210, y: 30 },
  { n: 4, x: 210, y: 80 },
  { n: 5, x: 110, y: 80 },
  { n: 6, x: 10, y: 80 },
]

const MAX = 2

export function DividirCuadrado1({ value, onChange, disabled }: Props) {
  const selectedSet = csvToSet(value)
  const csv = typeof value === 'string' ? value : (typeof value === 'number' ? String(value) : null)

  function handleClick(n: number) {
    if (disabled) return
    onChange(toggleInCSV(csv, n, MAX))
  }

  // Línea entre los 2 puntos seleccionados (preview de la línea de corte)
  const selectedArr = Array.from(selectedSet)
  const linePreview = selectedArr.length === 2
    ? (() => {
        const p1 = PUNTOS.find((p) => p.n === selectedArr[0])!
        const p2 = PUNTOS.find((p) => p.n === selectedArr[1])!
        return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }
      })()
    : null

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <PuzzleBox>
          <svg viewBox="0 0 220 110" width="260" height="130">
            {/* Rectángulo */}
            <rect x="10" y="30" width="200" height="50" fill={FILL} stroke={STROKE} strokeWidth="1.5" />

            {/* Línea preview entre los 2 puntos seleccionados */}
            {linePreview && (
              <line
                x1={linePreview.x1} y1={linePreview.y1}
                x2={linePreview.x2} y2={linePreview.y2}
                stroke="var(--gold)" strokeWidth="2" strokeDasharray="4 3"
              />
            )}

            {/* Puntos numerados clickeables */}
            {PUNTOS.map((p) => {
              const sel = selectedSet.has(p.n)
              return (
                <g key={p.n} onClick={() => handleClick(p.n)} style={{ cursor: disabled ? 'default' : 'pointer' }}>
                  <circle
                    cx={p.x} cy={p.y} r="10"
                    fill={sel ? 'var(--navy)' : 'white'}
                    stroke={sel ? STROKE_HI : STROKE}
                    strokeWidth="1.5"
                  />
                  <text
                    x={p.x} y={p.y + 4}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="600"
                    fill={sel ? 'var(--cream)' : 'var(--navy)'}
                    fontFamily="var(--font-geist-mono, monospace)"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {p.n}
                  </text>
                </g>
              )
            })}
          </svg>
        </PuzzleBox>
      </div>

      <Hint>Selecciona los dos puntos por donde trazarías la línea recta para formar un cuadrado.</Hint>

      <p className="text-[10px] text-center" style={{ color: 'oklch(0.62 0.03 265)' }}>
        Seleccionados: {selectedSet.size} / {MAX}
      </p>
    </div>
  )
}
