'use client'

import type { CognitivoItemVisual } from '@/types/database'

interface Props {
  item: CognitivoItemVisual
  value: string | number | null
  onChange: (v: string | number) => void
  disabled?: boolean
  showCorrect?: boolean
}

// Placeholder hasta Fase 3 (subcomponentes SVG inline por visual_id)
export function PreguntaVisual({ item }: Props) {
  return (
    <div
      className="rounded-xl px-5 py-6 text-center space-y-2"
      style={{
        background: 'oklch(0.96 0.005 80)',
        border: '1px dashed oklch(0.85 0.01 80)',
      }}
    >
      <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--navy)', opacity: 0.55 }}>
        Pregunta visual ({item.visual_id})
      </p>
      <p className="text-sm" style={{ color: 'var(--navy)' }}>
        Este tipo de ítem se implementará en la fase 3 (figuras SVG inline).
      </p>
    </div>
  )
}
