'use client'

import type { CognitivoItemSiNo } from '@/types/database'

interface Props {
  item: CognitivoItemSiNo
  value: 'SI' | 'NO' | null
  onChange: (v: 'SI' | 'NO') => void
  disabled?: boolean
  showCorrect?: boolean
}

export function PreguntaSiNo({ item, value, onChange, disabled, showCorrect }: Props) {
  const options: ('SI' | 'NO')[] = ['SI', 'NO']

  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((opt) => {
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
            className="py-5 rounded-xl text-lg font-semibold transition-all"
            style={{
              background,
              color: textColor,
              border: '1px solid',
              borderColor,
              fontFamily: 'var(--font-fraunces, serif)',
              cursor: disabled ? 'default' : 'pointer',
              opacity: disabled && !selected && !isCorrect ? 0.55 : 1,
            }}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}
