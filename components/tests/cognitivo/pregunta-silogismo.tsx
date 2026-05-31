'use client'

import type { CognitivoItemSilogismo } from '@/types/database'

interface Props {
  item: CognitivoItemSilogismo
  value: 'verdadero' | 'falso' | 'dudoso' | null
  onChange: (v: 'verdadero' | 'falso' | 'dudoso') => void
  disabled?: boolean
  showCorrect?: boolean
}

const OPCIONES: ('verdadero' | 'falso' | 'dudoso')[] = ['verdadero', 'falso', 'dudoso']
const LABEL: Record<'verdadero' | 'falso' | 'dudoso', string> = {
  verdadero: 'Verdadero',
  falso: 'Falso',
  dudoso: 'Dudoso',
}

export function PreguntaSilogismo({ item, value, onChange, disabled, showCorrect }: Props) {
  return (
    <div className="space-y-4">
      <div
        className="rounded-xl px-5 py-4 space-y-2"
        style={{
          background: 'oklch(0.97 0.012 80)',
          borderLeft: '3px solid var(--gold)',
        }}
      >
        <p className="text-sm leading-relaxed" style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}>
          {item.premisa1}
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}>
          {item.premisa2}
        </p>
        <p
          className="text-sm leading-relaxed pt-2 mt-2"
          style={{
            color: 'var(--navy)',
            fontFamily: 'var(--font-fraunces, serif)',
            borderTop: '1px solid oklch(0.90 0.005 80)',
          }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest opacity-60 block mb-1">
            Conclusión
          </span>
          {item.conclusion}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {OPCIONES.map((opt) => {
          const selected = value === opt
          const isCorrect = showCorrect && opt === item.respuesta_correcta
          const isWrongSelection = showCorrect && selected && !isCorrect

          let background = 'oklch(0.97 0.005 80)'
          let borderColor = 'oklch(0.92 0.005 80)'
          let textColor = 'var(--navy)'

          if (selected && !showCorrect) {
            background = 'var(--navy)'
            textColor = 'var(--cream)'
            borderColor = 'var(--navy)'
          }
          if (isCorrect) {
            background = 'oklch(0.50 0.14 145)'
            textColor = 'var(--cream)'
            borderColor = 'oklch(0.50 0.14 145)'
          }
          if (isWrongSelection) {
            background = 'oklch(0.55 0.18 25)'
            textColor = 'var(--cream)'
            borderColor = 'oklch(0.55 0.18 25)'
          }

          return (
            <button
              key={opt}
              onClick={() => !disabled && onChange(opt)}
              disabled={disabled}
              className="py-3 rounded-lg text-sm font-medium transition-all"
              style={{
                background,
                color: textColor,
                border: '1px solid',
                borderColor,
                cursor: disabled ? 'default' : 'pointer',
                opacity: disabled && !selected && !isCorrect ? 0.55 : 1,
              }}
            >
              {LABEL[opt]}
            </button>
          )
        })}
      </div>
    </div>
  )
}
