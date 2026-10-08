import type { ExcelNivel, ExcelResult } from '@/types/database'
import type { ExcelDetalleItem } from '@/lib/excel/score'
import preguntasData from '@/lib/excel/data/preguntas.json' with { type: 'json' }

// Tarjeta solo de presentación: el resultado y el detalle ya vienen corregidos desde la
// página (server component), que recalcula con scoreExcel/detalleExcel a partir de `respuestas`.
// Acá solo se importa preguntas.json (enunciados), nunca la pauta.

interface Pregunta {
  id: number
  area: number
  enunciado: string
  alternativas: { id: string; texto: string }[]
}
interface Area {
  id: number
  nombre: string
  items: number[]
}
const DATA = preguntasData as unknown as { areas: Area[]; preguntas: Pregunta[] }
const PREGUNTA = new Map(DATA.preguntas.map((p) => [p.id, p]))

type Resultado = NonNullable<ExcelResult['resultado']>

const NIVEL_ESTILO: Record<ExcelNivel, { bg: string; fg: string }> = {
  Básico: { bg: 'oklch(0.93 0.012 265)', fg: 'oklch(0.38 0.04 265)' },
  Intermedio: { bg: 'oklch(0.72 0.12 68 / 0.18)', fg: 'var(--navy)' },
  Avanzado: { bg: 'var(--navy)', fg: 'var(--cream)' },
}

function NivelBadge({ nivel }: { nivel: ExcelNivel }) {
  const e = NIVEL_ESTILO[nivel]
  return (
    <span
      className="inline-block rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap"
      style={{ background: e.bg, color: e.fg }}
    >
      {nivel}
    </span>
  )
}

function IntegrityStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center py-4 rounded-xl" style={{ background: 'oklch(0.96 0.005 80)' }}>
      <div className="text-2xl font-light" style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  )
}

function mmss(s: number) {
  const t = Math.max(0, Math.round(s))
  return `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, '0')}`
}

function textoAlternativa(item: number, letra: string | null) {
  if (!letra) return null
  return PREGUNTA.get(item)?.alternativas.find((a) => a.id === letra)?.texto ?? null
}

export function ExcelResultCard({
  data,
  resultado,
  detalle,
}: {
  data: ExcelResult
  resultado: Resultado
  detalle: ExcelDetalleItem[]
}) {
  const m = data.metadata
  const sinResponder = resultado.total - resultado.items_respondidos
  const porItem = new Map(detalle.map((d) => [d.item, d]))

  return (
    <div className="space-y-7">
      {/* Síntesis */}
      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold" style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}>
            Excel — Conocimientos
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground max-w-2xl">
            Selección múltiple, {resultado.total} preguntas, 1 punto por respuesta correcta y sin descuento por error.
            Básico hasta 60 % · Intermedio sobre 60 % y hasta 85 % · Avanzado sobre 85 %.
          </p>
        </div>
        <div
          className="rounded-xl px-5 py-5 flex items-center justify-between gap-4 flex-wrap"
          style={{
            background: 'linear-gradient(135deg, oklch(0.72 0.12 68 / 0.14), rgba(255,255,255,0.96))',
            border: '1px solid oklch(0.72 0.12 68 / 0.32)',
          }}
        >
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--navy)', opacity: 0.65 }}>
              Nivel de dominio
            </p>
            <NivelBadge nivel={resultado.nivel} />
          </div>
          <div className="text-right">
            <span className="text-4xl font-light" style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}>
              {resultado.puntaje}
            </span>
            <span className="text-sm text-muted-foreground"> / {resultado.total}</span>
            <div className="text-xs text-muted-foreground font-mono">
              {resultado.porcentaje.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %
            </div>
          </div>
        </div>
      </section>

      {/* Logro por área */}
      <section className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Logro por área</p>
        <div className="space-y-3 rounded-xl p-4" style={{ background: 'white', border: '1px solid oklch(0.92 0.005 80)' }}>
          {DATA.areas.map((a) => {
            const v = resultado.por_area[a.nombre] ?? { correctas: 0, total: a.items.length }
            const pct = v.total ? (v.correctas / v.total) * 100 : 0
            return (
              <div key={a.id} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm" style={{ color: 'var(--navy)' }}>
                    {a.id}. {a.nombre}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {v.correctas} / {v.total}
                  </span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: 'oklch(0.94 0.005 80)' }}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={v.total}
                  aria-valuenow={v.correctas}
                  aria-label={a.nombre}
                >
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--brand)' }} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Detalle por pregunta */}
      <section className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Detalle por pregunta
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Las letras corresponden al documento original de la prueba; al candidato se le mostraron en otro orden.
        </p>
        {DATA.areas.map((a) => {
          const v = resultado.por_area[a.nombre]
          return (
            <details
              key={a.id}
              className="rounded-xl"
              style={{ border: '1px solid oklch(0.92 0.005 80)', background: 'white' }}
            >
              <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none">
                <span className="text-sm flex-1 min-w-0" style={{ color: 'var(--navy)' }}>
                  {a.id}. {a.nombre}
                </span>
                <span className="text-xs font-mono text-muted-foreground shrink-0">
                  {v?.correctas ?? 0} / {v?.total ?? a.items.length}
                </span>
              </summary>
              <ul className="px-4 pb-4 space-y-4">
                {a.items.map((n) => {
                  const d = porItem.get(n)
                  const p = PREGUNTA.get(n)
                  if (!d || !p) return null
                  const marcada = textoAlternativa(n, d.respuesta)
                  const correcta = textoAlternativa(n, d.correcta)
                  const estado = !d.respondida ? 'sin' : d.acierto ? 'ok' : 'mal'
                  return (
                    <li key={n} className="space-y-1.5" style={{ borderTop: '1px solid oklch(0.94 0.005 80)', paddingTop: '12px' }}>
                      <div className="flex items-start gap-2.5">
                        <span
                          className="shrink-0 inline-flex items-center justify-center rounded-md text-xs font-semibold"
                          style={{
                            width: '24px',
                            height: '24px',
                            background:
                              estado === 'ok' ? 'oklch(0.93 0.05 145)' : estado === 'mal' ? 'oklch(0.95 0.04 25)' : 'oklch(0.96 0.005 80)',
                            color:
                              estado === 'ok' ? 'oklch(0.42 0.13 145)' : estado === 'mal' ? 'oklch(0.40 0.15 25)' : 'oklch(0.55 0.02 265)',
                          }}
                          aria-label={estado === 'ok' ? 'Correcta' : estado === 'mal' ? 'Incorrecta' : 'Sin responder'}
                        >
                          {estado === 'ok' ? '✓' : estado === 'mal' ? '✗' : '–'}
                        </span>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--navy)' }}>
                          <span className="font-mono text-xs font-semibold mr-1.5">{n}.</span>
                          {p.enunciado}
                        </p>
                      </div>
                      <div className="pl-[34px] space-y-1 text-[13px] leading-relaxed" style={{ color: 'var(--navy)' }}>
                        <p>
                          <span className="text-muted-foreground">Respondió: </span>
                          {d.respondida && marcada ? (
                            <>
                              <span className="font-mono font-semibold uppercase">{d.respuesta})</span> {marcada}
                            </>
                          ) : (
                            <em>sin responder</em>
                          )}
                        </p>
                        {estado !== 'ok' && correcta && (
                          <p>
                            <span className="text-muted-foreground">Correcta: </span>
                            <span className="font-mono font-semibold uppercase">{d.correcta})</span> {correcta}
                          </p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </details>
          )
        })}
      </section>

      {/* Integridad */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Monitoreo de integridad</p>
        {m?.tiempo_agotado && (
          <div
            className="rounded-xl px-4 py-3 text-xs leading-relaxed"
            style={{ background: 'oklch(0.95 0.04 25)', border: '1px solid oklch(0.80 0.10 25 / 0.5)', color: 'oklch(0.40 0.15 25)' }}
          >
            Se agotó el tiempo (30 minutos): la prueba se envió automáticamente con lo respondido hasta ese momento.
          </div>
        )}
        {sinResponder > 0 && (
          <div
            className="rounded-xl px-4 py-3 text-xs leading-relaxed"
            style={{ background: 'oklch(0.95 0.04 25)', border: '1px solid oklch(0.80 0.10 25 / 0.5)', color: 'oklch(0.40 0.15 25)' }}
          >
            Este resultado tiene {sinResponder} {sinResponder === 1 ? 'pregunta sin responder' : 'preguntas sin responder'}; cada una suma 0 puntos.
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <IntegrityStat label="Duración total" value={mmss(m?.duracion_total_s ?? 0)} />
          <IntegrityStat label="Sin responder" value={sinResponder} />
          <IntegrityStat label="Cambios pestaña" value={m?.tab_switch_count ?? 0} />
          <IntegrityStat label="Fuera de foco" value={`${m?.out_of_focus_duration ?? 0}s`} />
        </div>
      </div>
    </div>
  )
}
