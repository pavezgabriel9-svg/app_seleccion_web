import type { CognitivoCategoria, CognitivoResult } from '@/types/database'

const CATEGORIA_LABEL: Record<CognitivoCategoria, string> = {
  verbal:   'Verbal',
  numerico: 'Numérico',
  logico:   'Lógico',
  espacial: 'Espacial',
  atencion: 'Atención',
}

const CATEGORIA_ORDER: CognitivoCategoria[] = [
  'verbal', 'numerico', 'logico', 'espacial', 'atencion',
]

const CATEGORIA_DESC: Record<CognitivoCategoria, string> = {
  verbal:   'Vocabulario, sinónimos, antónimos, refranes',
  numerico: 'Aritmética, series, proporciones, porcentajes',
  logico:   'Silogismos, deducción, ordenamiento',
  espacial: 'Razonamiento con figuras y rotación mental',
  atencion: 'Comparación de cadenas, atención al detalle',
}

// Color por nivel (Bajo / Promedio / Alto / Muy alto)
const NIVEL_BG: Record<CognitivoResult['resultado']['categoria'], string> = {
  'Bajo':     'oklch(0.55 0.18 25)',
  'Promedio': 'oklch(0.72 0.12 68)',
  'Alto':     'var(--navy)',
  'Muy alto': 'oklch(0.30 0.04 268)',
}

function barColorFor(pct: number): string {
  if (pct >= 70) return 'var(--navy)'
  if (pct >= 40) return 'oklch(0.72 0.12 68)'
  return 'oklch(0.72 0.12 68 / 0.4)'
}

function IntegrityStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center py-4 rounded-xl" style={{ background: 'oklch(0.96 0.005 80)' }}>
      <div
        className="text-2xl font-light"
        style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  )
}

export function CognitivoResultCard({ data }: { data: CognitivoResult }) {
  const { puntaje, categoria, por_categoria, items_respondidos } = data.resultado
  const m = data.metadata
  const total = 50
  const porcentaje = Math.round((puntaje / total) * 100)
  const noRespondidas = m.items_sin_responder

  return (
    <div className="space-y-6">
      {/* Header: puntaje grande + chip de categoría */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Puntaje total
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-5xl font-light"
              style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)', letterSpacing: '-0.02em' }}
            >
              {puntaje}
            </span>
            <span
              className="text-2xl font-light"
              style={{ color: 'oklch(0.65 0.03 265)', fontFamily: 'var(--font-fraunces, serif)' }}
            >
              / {total}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">{porcentaje}% de aciertos</div>
        </div>

        <span
          className="px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide"
          style={{ background: NIVEL_BG[categoria], color: 'var(--cream)' }}
        >
          {categoria}
        </span>
      </div>

      {/* Flag tiempo agotado */}
      {m.tiempo_agotado && (
        <div
          className="rounded-xl px-4 py-3 flex items-start gap-3"
          style={{
            background: 'oklch(0.85 0.10 25 / 0.10)',
            border: '1px solid oklch(0.55 0.18 25 / 0.30)',
          }}
        >
          <span style={{ color: 'oklch(0.42 0.18 25)', fontSize: '14px', lineHeight: '20px' }}>⚠</span>
          <div className="space-y-1">
            <p className="text-xs font-semibold" style={{ color: 'oklch(0.35 0.18 25)' }}>
              Tiempo agotado
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'oklch(0.42 0.18 25)' }}>
              El candidato no alcanzó a responder las {total} preguntas dentro de los 12 minutos.
              Las preguntas no respondidas cuentan como incorrectas.
            </p>
          </div>
        </div>
      )}

      {/* Breakdown por categoría — barras horizontales */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Desempeño por área cognitiva
        </p>
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'white', border: '1px solid oklch(0.92 0.005 80)' }}
        >
          {CATEGORIA_ORDER.map((cat) => {
            const { correctas, total: catTotal } = por_categoria[cat]
            const pct = catTotal > 0 ? (correctas / catTotal) * 100 : 0
            return (
              <div key={cat} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold" style={{ color: 'var(--navy)' }}>
                      {CATEGORIA_LABEL[cat]}
                    </span>
                    <span className="text-[10px] ml-2" style={{ color: 'oklch(0.62 0.03 265)' }}>
                      {CATEGORIA_DESC[cat]}
                    </span>
                  </div>
                  <span
                    className="text-[11px] font-mono tabular-nums shrink-0"
                    style={{ color: 'oklch(0.50 0.03 265)' }}
                  >
                    {correctas} / {catTotal} · {Math.round(pct)}%
                  </span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: 'oklch(0.94 0.005 80)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: barColorFor(pct) }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Resumen de respuestas */}
      <div className="grid grid-cols-3 gap-3">
        <IntegrityStat label="Aciertos" value={puntaje} />
        <IntegrityStat label="Respondidas" value={items_respondidos} />
        <IntegrityStat label="Sin responder" value={noRespondidas} />
      </div>

      {/* Cómo leer */}
      <div
        className="rounded-xl p-4 text-xs"
        style={{ background: 'oklch(0.96 0.005 80)', color: 'var(--navy)' }}
      >
        <p className="font-semibold mb-2">Cómo leer este informe</p>
        <ul className="space-y-1 opacity-80 leading-relaxed">
          <li>
            • Puntaje crudo de <strong>0 a 50</strong>. Categorías:{' '}
            <strong>Bajo</strong> ≤14 · <strong>Promedio</strong> 15–22 ·{' '}
            <strong>Alto</strong> 23–32 · <strong>Muy alto</strong> ≥33.
          </li>
          <li>
            • El desempeño por área permite distinguir perfiles (ej. fuerte en verbal pero débil
            en numérico) más allá del puntaje total.
          </li>
          <li>
            • Una alta cantidad de preguntas sin responder + tiempo agotado puede sugerir
            estrategia conservadora o dificultad de gestión del tiempo, más que falta de capacidad.
          </li>
        </ul>
      </div>

      {/* Monitoreo de integridad */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Monitoreo de integridad
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <IntegrityStat label="Duración total" value={`${m.duracion_total_s}s`} />
          <IntegrityStat label="Tiempo agotado" value={m.tiempo_agotado ? 'Sí' : 'No'} />
          <IntegrityStat label="Cambios pestaña" value={m.tab_switch_count} />
          <IntegrityStat label="Fuera de foco" value={`${m.out_of_focus_duration}s`} />
        </div>
      </div>
    </div>
  )
}
