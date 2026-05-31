'use client'

import type { CognitivoItemNumerica } from '@/types/database'

interface Props {
  item: CognitivoItemNumerica
  value: string | null
  onChange: (v: string) => void
  disabled?: boolean
  showCorrect?: boolean
}

export function PreguntaNumerica({ item, value, onChange, disabled, showCorrect }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          type="text"
          inputMode="decimal"
          value={value ?? ''}
          onChange={(e) => !disabled && onChange(e.target.value)}
          disabled={disabled}
          placeholder="Tu respuesta"
          className="flex-1 px-4 py-3 rounded-lg text-lg outline-none"
          style={{
            background: 'oklch(0.97 0.005 80)',
            border: '1px solid oklch(0.92 0.005 80)',
            color: 'var(--navy)',
            fontFamily: 'var(--font-geist-mono, monospace)',
            opacity: disabled ? 0.7 : 1,
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--navy)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'oklch(0.92 0.005 80)')}
        />
        {item.unidad && (
          <span className="text-sm text-muted-foreground">{item.unidad}</span>
        )}
      </div>
      {showCorrect && (
        <p className="text-xs" style={{ color: 'var(--navy)', opacity: 0.7 }}>
          Respuesta correcta:{' '}
          <span className="font-mono font-semibold" style={{ color: 'oklch(0.42 0.13 145)' }}>
            {item.respuesta_correcta}
            {item.unidad ? ` ${item.unidad}` : ''}
          </span>
        </p>
      )}
    </div>
  )
}
