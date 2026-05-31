'use client'

import { FILL, Hint, PuzzleBox, STROKE } from './shared'

interface Props {
  value: string | number | null
  onChange: (v: string | number) => void
  disabled?: boolean
}

// Triángulo ABC con dos cevianas desde el vértice A hacia puntos D y E
// sobre el lado BC. Triángulos formados: ABD, ADE, AEC, ABE, ADC, ABC = 6.
// A en (90, 10), B en (10, 110), C en (170, 110), D y E intermedios.
const A = { x: 90, y: 15 }
const B = { x: 10, y: 110 }
const C = { x: 170, y: 110 }
const D = { x: 60, y: 110 }
const E = { x: 120, y: 110 }

export function ContarTriangulos1({ value, onChange, disabled }: Props) {
  const display = value === null || value === undefined ? '' : String(value)

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <PuzzleBox>
          <svg viewBox="0 0 180 130" width="220" height="160">
            {/* Triángulo principal ABC */}
            <polygon
              points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`}
              fill={FILL} stroke={STROKE} strokeWidth="1.5"
            />
            {/* Cevianas A→D y A→E */}
            <line x1={A.x} y1={A.y} x2={D.x} y2={D.y} stroke={STROKE} strokeWidth="1.5" />
            <line x1={A.x} y1={A.y} x2={E.x} y2={E.y} stroke={STROKE} strokeWidth="1.5" />
          </svg>
        </PuzzleBox>
      </div>

      <Hint>Cuenta TODOS los triángulos (incluyendo los formados por intersecciones).</Hint>

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
