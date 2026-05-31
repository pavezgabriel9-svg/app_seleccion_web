'use client'

import type { CognitivoItemVisual } from '@/types/database'
import { Ensamble1 } from './visuales/ensamble-1'
import { Division1 } from './visuales/division-1'
import { CombinarRectangulo1 } from './visuales/combinar-rectangulo-1'
import { ContarCuadrados1 } from './visuales/contar-cuadrados-1'
import { DividirCuadrado1 } from './visuales/dividir-cuadrado-1'
import { FormarTriangulo1 } from './visuales/formar-triangulo-1'
import { ContarTriangulos1 } from './visuales/contar-triangulos-1'

interface Props {
  item: CognitivoItemVisual
  value: string | number | null
  onChange: (v: string | number) => void
  disabled?: boolean
  showCorrect?: boolean
}

export function PreguntaVisual({ item, value, onChange, disabled }: Props) {
  const sub = { value, onChange, disabled }

  switch (item.visual_id) {
    case 'ensamble_1':             return <Ensamble1            {...sub} />
    case 'division_1':             return <Division1            {...sub} />
    case 'combinar_rectangulo_1':  return <CombinarRectangulo1  {...sub} />
    case 'contar_cuadrados_1':     return <ContarCuadrados1     {...sub} />
    case 'dividir_cuadrado_1':     return <DividirCuadrado1     {...sub} />
    case 'formar_triangulo_1':     return <FormarTriangulo1     {...sub} />
    case 'contar_triangulos_1':    return <ContarTriangulos1    {...sub} />
    default:
      return (
        <div
          className="rounded-xl px-5 py-6 text-center"
          style={{ background: 'oklch(0.96 0.005 80)', border: '1px dashed oklch(0.85 0.01 80)' }}
        >
          <p className="text-sm" style={{ color: 'var(--navy)' }}>
            Pregunta visual no disponible: <code>{item.visual_id}</code>
          </p>
        </div>
      )
  }
}
