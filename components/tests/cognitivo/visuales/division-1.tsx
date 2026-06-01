'use client'

import { FILL, Hint, OptionButton, PuzzleBox, STROKE, STROKE_HI } from './shared'

interface Props {
  value: string | number | null
  onChange: (v: string | number) => void
  disabled?: boolean
}

const OPCIONES = [
  { points: '30,5 52,30 8,30' },                                // 1: triángulo
  { points: '15,8 45,8 52,30 8,30' },                           // 2: trapecio (CORRECTA)
  { points: '30,5 52,15 45,30 15,30 8,15' },                    // 3: pentágono
  { points: '8,14 52,14 52,26 8,26' },                          // 4: rectángulo
  { points: '20,5 40,5 52,18 40,30 20,30 8,18' },               // 5: hexágono
]

// Hexágono regular "techo plano" centrado en (60,60), con corte horizontal.
// Vértices: arriba (40,25) y (80,25), lados (20,60) y (100,60),
// abajo (40,95) y (80,95). Cada mitad es un trapecio isósceles horizontal.
const HEX_PTS = [
  [40, 25], [80, 25], [100, 60], [80, 95], [40, 95], [20, 60],
].map(([x, y]) => `${x},${y}`).join(' ')

export function Division1({ value, onChange, disabled }: Props) {
  const selected = typeof value === 'number' ? value : null

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <PuzzleBox>
          <svg viewBox="0 0 120 120" width="150" height="150">
            <polygon points={HEX_PTS} fill={FILL} stroke={STROKE} strokeWidth="1.5" />
            <line
              x1="14" y1="60" x2="106" y2="60"
              stroke="var(--gold)" strokeWidth="1.5" strokeDasharray="4 4"
            />
          </svg>
        </PuzzleBox>
      </div>

      <Hint>¿Qué forma tiene cada una de las dos mitades?</Hint>

      <div className="grid grid-cols-5 gap-2">
        {OPCIONES.map((opt, idx) => {
          const n = idx + 1
          const isSel = selected === n
          return (
            <OptionButton key={n} number={n} selected={isSel} disabled={disabled} onClick={() => onChange(n)}>
              <svg viewBox="0 0 60 35" width="50" height="28">
                <polygon
                  points={opt.points}
                  fill={FILL}
                  stroke={isSel ? STROKE_HI : STROKE}
                  strokeWidth="1.5"
                />
              </svg>
            </OptionButton>
          )
        })}
      </div>
    </div>
  )
}
