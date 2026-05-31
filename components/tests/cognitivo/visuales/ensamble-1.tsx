'use client'

import { FILL, Hint, OptionButton, PuzzleBox, STROKE, STROKE_HI } from './shared'

interface Props {
  value: string | number | null
  onChange: (v: string | number) => void
  disabled?: boolean
}

// 5 figuras pequeñas como opciones (60×35 viewBox)
const OPCIONES = [
  { points: '8,14 52,14 52,26 8,26' },                          // 1: rectángulo (CORRECTA)
  { points: '30,5 52,30 8,30' },                                 // 2: triángulo
  { points: '15,8 45,8 52,30 8,30' },                            // 3: trapecio
  { points: '30,5 52,15 45,30 15,30 8,15' },                     // 4: pentágono
  { points: '20,5 40,5 52,18 40,30 20,30 8,18' },                // 5: hexágono
]

export function Ensamble1({ value, onChange, disabled }: Props) {
  const selected = typeof value === 'number' ? value : null

  return (
    <div className="space-y-4">
      {/* Dos triángulos rectángulos en cajas */}
      <div className="flex gap-3 justify-center">
        <PuzzleBox>
          <svg viewBox="0 0 60 50" width="68" height="56">
            <polygon points="5,5 55,5 5,45" fill={FILL} stroke={STROKE} strokeWidth="1.5" />
          </svg>
        </PuzzleBox>
        <PuzzleBox>
          <svg viewBox="0 0 60 50" width="68" height="56">
            <polygon points="5,5 55,5 55,45" fill={FILL} stroke={STROKE} strokeWidth="1.5" />
          </svg>
        </PuzzleBox>
      </div>

      <Hint>Elige la figura que se forma al unirlas:</Hint>

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
