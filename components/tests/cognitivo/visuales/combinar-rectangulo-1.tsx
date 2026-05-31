'use client'

import { csvToSet, FILL, FILL_SEL, Hint, STROKE, STROKE_HI, toggleInCSV } from './shared'

interface Props {
  value: string | number | null
  onChange: (v: string | number) => void
  disabled?: boolean
}

// 5 piezas. Las piezas 1 y 3 son triángulos rectángulos espejados que se
// combinan para formar un rectángulo (60×40). Resto son distractores.
const PIEZAS = [
  { points: '5,5 55,5 5,35' },                                  // 1: triángulo rect. (legs 50,30)
  { points: '15,5 45,5 50,30 10,30' },                          // 2: trapecio (distractor)
  { points: '55,5 55,35 5,35' },                                // 3: triángulo rect. espejado
  { points: '30,5 52,18 45,32 15,32 8,18' },                    // 4: pentágono (distractor)
  { points: '15,10 45,10 45,30 15,30' },                        // 5: rectángulo pequeño (distractor)
]

const MAX = 2

export function CombinarRectangulo1({ value, onChange, disabled }: Props) {
  const selectedSet = csvToSet(value)
  const csv = typeof value === 'string' ? value : (typeof value === 'number' ? String(value) : null)

  function handleClick(n: number) {
    if (disabled) return
    onChange(toggleInCSV(csv, n, MAX))
  }

  return (
    <div className="space-y-4">
      <Hint>Selecciona las dos figuras que combinadas forman un rectángulo perfecto.</Hint>

      <div className="grid grid-cols-5 gap-2">
        {PIEZAS.map((opt, idx) => {
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
              <svg viewBox="0 0 60 40" width="56" height="36">
                <polygon
                  points={opt.points}
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
