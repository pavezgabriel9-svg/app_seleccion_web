import type { IPVEscala, IPVResult } from '@/types/database'
import { getEscalaDef, interpretar, scoreIPV } from '@/lib/ipv/score'
import { IPVProfileChart, IPV_GRUPOS } from './ipv-profile-chart'

const COMPUESTAS = new Set<IPVEscala>(['R', 'A'])

// Niveles en tonos de la misma paleta (sin connotación buena/mala): más oscuro = mayor nivel
const NIVEL_ESTILO: Record<string, { bg: string; fg: string }> = {
  'muy bajo': { bg: 'oklch(0.96 0.005 80)', fg: 'oklch(0.45 0.03 265)' },
  bajo: { bg: 'oklch(0.93 0.012 265)', fg: 'oklch(0.38 0.04 265)' },
  promedio: { bg: 'oklch(0.72 0.12 68 / 0.18)', fg: 'var(--navy)' },
  'mayor promedio': { bg: 'oklch(0.50 0.05 265)', fg: 'white' },
  alto: { bg: 'var(--navy)', fg: 'var(--cream)' },
}

function NivelBadge({ nivel }: { nivel: string }) {
  const estilo = NIVEL_ESTILO[nivel] ?? NIVEL_ESTILO.promedio
  return (
    <span
      className="inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap"
      style={{ background: estilo.bg, color: estilo.fg }}
    >
      {nivel || '—'}
    </span>
  )
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

function Highlight({
  eyebrow,
  titulo,
  pt,
  pd,
  nivel,
  destacado,
}: {
  eyebrow: string
  titulo: string
  pt: number
  pd: number
  nivel: string
  destacado?: boolean
}) {
  return (
    <div
      className="rounded-xl px-5 py-4"
      style={{
        background: destacado
          ? 'linear-gradient(135deg, oklch(0.72 0.12 68 / 0.14), rgba(255,255,255,0.96))'
          : 'oklch(0.97 0.005 80)',
        border: destacado ? '1px solid oklch(0.72 0.12 68 / 0.32)' : '1px solid oklch(0.92 0.005 80)',
      }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--navy)', opacity: 0.65 }}>
        {eyebrow}
      </p>
      <div className="flex items-end justify-between gap-4 mt-2">
        <div className="space-y-1.5 min-w-0">
          <p
            className="text-lg font-light leading-tight"
            style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}
          >
            {titulo}
          </p>
          <NivelBadge nivel={nivel} />
        </div>
        <div className="shrink-0 text-right">
          <span
            className="text-3xl font-light"
            style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}
          >
            {pt}
          </span>
          <span className="text-xs text-muted-foreground"> / 10</span>
          <div className="text-[10px] text-muted-foreground font-mono">PD {pd}</div>
        </div>
      </div>
    </div>
  )
}

export function IPVResultCard({ data }: { data: IPVResult }) {
  // Siempre se recalcula desde las respuestas: si cambian claves o baremos,
  // los resultados antiguos se ven con la regla vigente sin migrar datos.
  const { escalas } = scoreIPV(data.respuestas)
  const m = data.metadata
  const sinResponder = m?.items_sin_responder ?? 0

  return (
    <div className="space-y-7">
      {/* Síntesis */}
      <section className="space-y-3">
        <div className="space-y-1">
          <h3
            className="text-xl font-semibold"
            style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}
          >
            Perfil de personalidad para ventas
          </h3>
          <p className="text-xs leading-relaxed text-muted-foreground max-w-2xl">
            Doce escalas expresadas en decatipos (1 a 10). La banda central, decatipos 4 a 7,
            corresponde al rango promedio.
          </p>
        </div>
        <div className="space-y-3">
          <Highlight
            destacado
            eyebrow="Disposición general para la venta (DGV)"
            titulo={getEscalaDef('DGV').nombre}
            pt={escalas.DGV.pt}
            pd={escalas.DGV.pd}
            nivel={escalas.DGV.nivel}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(['R', 'A'] as const).map((c) => (
            <Highlight
              key={c}
              eyebrow={`${c} · subtotal`}
              titulo={getEscalaDef(c).nombre}
              pt={escalas[c].pt}
              pd={escalas[c].pd}
              nivel={escalas[c].nivel}
            />
          ))}
        </div>
      </section>

      {/* Perfil gráfico */}
      <section
        className="rounded-xl py-4 px-3 sm:px-4"
        style={{ background: 'white', border: '1px solid oklch(0.92 0.005 80)' }}
      >
        <IPVProfileChart escalas={escalas} />
      </section>

      {/* Tabla PD / PT / nivel */}
      <section className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Puntajes por escala
        </p>
        <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid oklch(0.92 0.005 80)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'oklch(0.96 0.005 80)' }}>
                <th scope="col" className="text-left font-semibold text-xs px-4 py-2.5" style={{ color: 'var(--navy)' }}>Escala</th>
                <th scope="col" className="text-right font-semibold text-xs px-4 py-2.5" style={{ color: 'var(--navy)' }}>PD</th>
                <th scope="col" className="text-right font-semibold text-xs px-4 py-2.5" style={{ color: 'var(--navy)' }}>PT</th>
                <th scope="col" className="text-left font-semibold text-xs px-4 py-2.5" style={{ color: 'var(--navy)' }}>Nivel</th>
              </tr>
            </thead>
            <tbody>
              {IPV_GRUPOS.flatMap((g) => g.codigos).map((codigo) => {
                const def = getEscalaDef(codigo)
                const r = escalas[codigo]
                const compuesta = COMPUESTAS.has(codigo) || codigo === 'DGV'
                return (
                  <tr
                    key={codigo}
                    style={{
                      borderTop: '1px solid oklch(0.94 0.005 80)',
                      background: compuesta ? 'oklch(0.30 0.04 268 / 0.035)' : undefined,
                    }}
                  >
                    <td className="px-4 py-2.5" style={{ color: 'var(--navy)' }}>
                      <span className="font-mono text-xs font-semibold inline-block w-10">{codigo}</span>
                      <span className={compuesta ? 'font-semibold' : ''}>{def.nombre}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono" style={{ color: 'var(--navy)' }}>{r.pd}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold" style={{ color: 'var(--navy)' }}>{r.pt}</td>
                    <td className="px-4 py-2.5"><NivelBadge nivel={r.nivel} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Interpretación agrupada */}
      <section className="space-y-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Interpretación
        </p>
        {IPV_GRUPOS.map((g) => (
          <div key={g.key} className="space-y-2">
            <p className="text-sm font-semibold" style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}>
              {g.titulo}
            </p>
            {g.codigos.map((codigo) => {
              const r = escalas[codigo]
              const { texto } = interpretar(codigo, r.pt)
              return (
                <details
                  key={codigo}
                  open={codigo === 'DGV'}
                  className="group rounded-xl"
                  style={{ border: '1px solid oklch(0.92 0.005 80)', background: 'white' }}
                >
                  <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none">
                    <span className="font-mono text-xs font-semibold w-10 shrink-0" style={{ color: 'var(--navy)' }}>{codigo}</span>
                    <span className="text-sm flex-1 min-w-0" style={{ color: 'var(--navy)' }}>{getEscalaDef(codigo).nombre}</span>
                    <span className="text-xs font-mono text-muted-foreground shrink-0">PT {r.pt}</span>
                    <NivelBadge nivel={r.nivel} />
                  </summary>
                  <p className="px-4 pb-4 text-[13px] leading-relaxed" style={{ color: 'var(--navy)', opacity: 0.85 }}>
                    {texto || 'Sin texto de interpretación para este decatipo.'}
                  </p>
                </details>
              )
            })}
          </div>
        ))}
      </section>

      {/* Nota de lectura */}
      <div
        className="rounded-xl px-4 py-3 text-xs leading-relaxed"
        style={{
          background: 'oklch(0.72 0.12 68 / 0.08)',
          border: '1px solid oklch(0.72 0.12 68 / 0.24)',
          color: 'var(--navy)',
        }}
      >
        <strong>Nota de lectura:</strong> Comprensión (I) se convierte a decatipo con su propio
        baremo; los informes del Excel anterior usaban por error el baremo de DGV y la
        subestimaban, por lo que su PT puede diferir de esos informes. El perfil es una herramienta de apoyo para la evaluación
        profesional y no constituye por sí solo un diagnóstico.
      </div>

      {/* Integridad */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Monitoreo de integridad
        </p>
        {sinResponder > 0 && (
          <div
            className="rounded-xl px-4 py-3 text-xs leading-relaxed"
            style={{ background: 'oklch(0.95 0.04 25)', border: '1px solid oklch(0.80 0.10 25 / 0.5)', color: 'oklch(0.40 0.15 25)' }}
          >
            Este resultado tiene {sinResponder} {sinResponder === 1 ? 'ítem sin responder' : 'ítems sin responder'}; cada uno suma 0 coincidencias.
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <IntegrityStat label="Duración total" value={`${m?.duracion_total_s ?? 0}s`} />
          <IntegrityStat label="Ítems sin responder" value={sinResponder} />
          <IntegrityStat label="Cambios pestaña" value={m?.tab_switch_count ?? 0} />
          <IntegrityStat label="Fuera de foco" value={`${m?.out_of_focus_duration ?? 0}s`} />
        </div>
      </div>
    </div>
  )
}
