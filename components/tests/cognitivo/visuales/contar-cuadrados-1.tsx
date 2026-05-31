'use client'

import { FILL, Hint, PuzzleBox, STROKE } from './shared'

interface Props {
  value: string | number | null
  onChange: (v: string | number) => void
  disabled?: boolean
}

export function ContarCuadrados1({ value, onChange, disabled }: Props) {
  const display = value === null || value === undefined ? '' : String(value)

  // Grilla 3×3 dibujada con líneas
  const SIZE = 30
  const ORIGIN = 5

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <PuzzleBox>
          <svg viewBox="0 0 100 100" width="140" height="140">
            <rect
              x={ORIGIN} y={ORIGIN}
              width={SIZE * 3} height={SIZE * 3}
              fill={FILL} stroke={STROKE} strokeWidth="1.5"
            />
            {/* líneas verticales internas */}
            <line x1={ORIGIN + SIZE} y1={ORIGIN} x2={ORIGIN + SIZE} y2={ORIGIN + SIZE * 3} stroke={STROKE} strokeWidth="1.5" />
            <line x1={ORIGIN + SIZE * 2} y1={ORIGIN} x2={ORIGIN + SIZE * 2} y2={ORIGIN + SIZE * 3} stroke={STROKE} strokeWidth="1.5" />
            {/* líneas horizontales internas */}
            <line x1={ORIGIN} y1={ORIGIN + SIZE} x2={ORIGIN + SIZE * 3} y2={ORIGIN + SIZE} stroke={STROKE} strokeWidth="1.5" />
            <line x1={ORIGIN} y1={ORIGIN + SIZE * 2} x2={ORIGIN + SIZE * 3} y2={ORIGIN + SIZE * 2} stroke={STROKE} strokeWidth="1.5" />
          </svg>
        </PuzzleBox>
      </div>

      <Hint>Cuenta TODOS los cuadrados (de cualquier tamaño) e ingresa el número.</Hint>

      <div className="flex justify-center">
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onChange={(e) => {
            if (disabled) return
            // Solo dígitos enteros
            const cleaned = e.target.value.replace(/\D/g, '')
            onChange(cleaned)
          }}
          disabled={disabled}
          placeholder="0"
          className="w-32 px-4 py-3 text-center text-lg outline-none rounded-lg"
          style={{
            background: 'oklch(0.97 0.005 80)',
            border: '1px solid oklch(0.92 0.005 80)',
            color: 'var(--navy)',
            fontFamily: 'var(--font-geist-mono, monospace)',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--navy)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'oklch(0.92 0.005 80)')}
        />
      </div>
    </div>
  )
}
