'use client'

import type { CognitivoItemMultiple3, CognitivoItemMultiple5 } from '@/types/database'

interface Props {
  item: CognitivoItemMultiple5 | CognitivoItemMultiple3
  value: number | null
  onChange: (v: number) => void
  disabled?: boolean
  showCorrect?: boolean
}

export function PreguntaMultiple({ item, value, onChange, disabled, showCorrect }: Props) {
  return (
    <div className="space-y-2">
      {item.opciones.map((opcion, idx) => {
        const num = idx + 1
        const selected = value === num
        const isCorrect = showCorrect && num === item.respuesta_correcta
        const isWrongSelection = showCorrect && selected && !isCorrect

        let background = 'oklch(0.97 0.005 80)'
        let borderColor = 'oklch(0.92 0.005 80)'
        let textColor = 'var(--navy)'
        let badgeBg = 'white'
        let badgeColor = 'oklch(0.65 0.03 265)'

        if (selected && !showCorrect) {
          background = 'oklch(0.30 0.04 268 / 0.06)'
          borderColor = 'var(--navy)'
          badgeBg = 'var(--navy)'
          badgeColor = 'var(--cream)'
        }
        if (isCorrect) {
          background = 'oklch(0.82 0.10 145 / 0.12)'
          borderColor = 'oklch(0.50 0.14 145 / 0.6)'
          badgeBg = 'oklch(0.50 0.14 145)'
          badgeColor = 'var(--cream)'
        }
        if (isWrongSelection) {
          background = 'oklch(0.85 0.10 25 / 0.10)'
          borderColor = 'oklch(0.55 0.18 25 / 0.5)'
          badgeBg = 'oklch(0.55 0.18 25)'
          badgeColor = 'var(--cream)'
        }

        return (
          <button
            key={num}
            onClick={() => !disabled && onChange(num)}
            disabled={disabled}
            className="w-full text-left flex items-start gap-3 rounded-xl px-4 py-3.5 transition-all"
            style={{
              background,
              border: '1px solid',
              borderColor,
              cursor: disabled ? 'default' : 'pointer',
              opacity: disabled && !selected && !isCorrect ? 0.55 : 1,
            }}
          >
            <span
              className="shrink-0 inline-flex items-center justify-center font-semibold"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: badgeBg,
                color: badgeColor,
                border: '1px solid',
                borderColor: badgeBg === 'white' ? 'oklch(0.88 0.005 80)' : 'transparent',
                fontFamily: 'var(--font-geist-mono, monospace)',
                fontSize: '13px',
              }}
            >
              {num}
            </span>
            <span className="text-sm leading-relaxed pt-0.5" style={{ color: textColor }}>
              {opcion}
            </span>
          </button>
        )
      })}
    </div>
  )
}
