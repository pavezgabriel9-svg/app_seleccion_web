'use client'

import { csvToSet, FILL, FILL_SEL, Hint, STROKE, STROKE_HI, toggleInCSV } from './shared'

interface Props {
  value: string | number | null
  onChange: (v: string | number) => void
  disabled?: boolean
}

// 5 piezas: 4 triángulos equiláteros idénticos (1, 2, 4, 5) y 1 cuadrado (3).
// Los 4 triángulos combinados forman un triángulo equilátero más grande.
const TRI = '30,5 55,40 5,40'
const SQ  = '12,10 48,10 48,40 12,40'
const PIEZAS = [
  { points: TRI, kind: 'triangulo' },   // 1
  { points: TRI, kind: 'triangulo' },   // 2
  { points: SQ,  kind: 'cuadrado'  },   // 3 (distractor)
  { points: TRI, kind: 'triangulo' },   // 4
  { points: TRI, kind: 'triangulo' },   // 5
]

const MAX = 4

export function FormarTriangulo1({ value, onChange, disabled }: Props) {
  const selectedSet = csvToSet(value)
  const csv = typeof value === 'string' ? value : (typeof value === 'number' ? String(value) : null)

  function handleClick(n: number) {
    if (disabled) return
    onChange(toggleInCSV(csv, n, MAX))
  }

  return (
    <div className="space-y-4">
      <Hint>Selecciona las cuatro piezas que pueden unirse para formar un triángulo perfecto.</Hint>

      <div className="grid grid-cols-5 gap-2">
        {PIEZAS.map((p, idx) => {
          const n = idx + 1
          const isSel = selectedSet.has(n)
          return (
            <button
              key={n}
              onClick={() => handleClick(n)}
              disabled={disabled}
              className="rounded-lg py-3 px-1 flex flex-col items-center gap-1 transition-all"
              style={{
                background: isSel ? FILL_SEL : 'oklch(0.97 0.005 80)',
                border: '1px solid',
                borderColor: isSel ? STROKE_HI : 'oklch(0.92 0.005 80)',
                cursor: disabled ? 'default' : 'pointer',
              }}
            >
              <svg viewBox="0 0 60 45" width="52" height="40">
                <polygon
                  points={p.points}
                  fill={isSel ? FILL_SEL : FILL}
                  stroke={isSel ? STROKE_HI : STROKE}
                  strokeWidth="1.5"
                />
              </svg>
              <span className="text-[10px] font-mono" style={{ color: 'var(--navy)' }}>{n}</span>
            </button>
          )
        })}
      </div>

      <p className="text-[10px] text-center" style={{ color: 'oklch(0.62 0.03 265)' }}>
        Seleccionadas: {selectedSet.size} / {MAX}
      </p>
    </div>
  )
}
