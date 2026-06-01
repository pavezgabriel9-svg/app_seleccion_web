'use client'

import type { CognitivoItemTextoCorto } from '@/types/database'

interface Props {
  item: CognitivoItemTextoCorto
  value: string | null
  onChange: (v: string) => void
  disabled?: boolean
  showCorrect?: boolean
}

export function PreguntaTexto({ item, value, onChange, disabled, showCorrect }: Props) {
  return (
    <div className="space-y-3">
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => !disabled && onChange(e.target.value)}
        disabled={disabled}
        placeholder="Tu respuesta"
        className="w-full px-4 py-3 rounded-lg text-base outline-none"
        style={{
          background: 'oklch(0.97 0.005 80)',
          border: '1px solid oklch(0.92 0.005 80)',
          color: 'var(--navy)',
          opacity: disabled ? 0.7 : 1,
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--navy)')}
        onBlur={(e) => (e.currentTarget.style.borderColor = 'oklch(0.92 0.005 80)')}
      />
      {showCorrect && (
        <p className="text-xs" style={{ color: 'var(--navy)', opacity: 0.7 }}>
          Respuesta correcta:{' '}
          <span className="font-mono font-semibold" style={{ color: 'oklch(0.42 0.13 145)' }}>
            {item.respuesta_correcta}
          </span>
        </p>
      )}
    </div>
  )
}
