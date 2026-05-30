import type { ZAVICResult } from '@/types/database'
import { ZAVICChart } from './zavic-chart'

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

export function ZAVICResultCard({ data }: { data: ZAVICResult }) {
  const { valores, intereses } = data.resultado
  const m = data.metadata

  return (
    <div className="space-y-8">
      {/* Sección VALORES */}
      <section className="space-y-3">
        <div className="space-y-1">
          <h3
            className="text-lg font-semibold"
            style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}
          >
            Valores
          </h3>
          <p className="text-xs text-muted-foreground">
            Cómo se posiciona el candidato frente a normas y dilemas éticos.
          </p>
        </div>
        <div
          className="rounded-xl py-4 px-3"
          style={{ background: 'white', border: '1px solid oklch(0.92 0.005 80)' }}
        >
          <ZAVICChart seccion="valores" scores={valores} />
        </div>
      </section>

      {/* Sección INTERESES */}
      <section className="space-y-3">
        <div className="space-y-1">
          <h3
            className="text-lg font-semibold"
            style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}
          >
            Intereses
          </h3>
          <p className="text-xs text-muted-foreground">
            Hacia dónde se orientan las preferencias e intereses motivacionales.
          </p>
        </div>
        <div
          className="rounded-xl py-4 px-3"
          style={{ background: 'white', border: '1px solid oklch(0.92 0.005 80)' }}
        >
          <ZAVICChart seccion="intereses" scores={intereses} />
        </div>
      </section>

      {/* Cómo leer */}
      <div
        className="rounded-xl p-4 text-xs"
        style={{ background: 'oklch(0.96 0.005 80)', color: 'var(--navy)' }}
      >
        <p className="font-semibold mb-2">Cómo leer este informe</p>
        <ul className="space-y-1 opacity-80 leading-relaxed">
          <li>
            • Cada dimensión va de <strong>10 (preferencia máxima)</strong> a{' '}
            <strong>40 (preferencia mínima)</strong>. Línea media en 25 = neutro.
          </li>
          <li>
            • Categorías: <strong>Predominante</strong> ≤15 · <strong>Significativo</strong> 16–20 ·{' '}
            <strong>Promedio</strong> 21–30 · <strong>Bajo</strong> ≥31.
          </li>
          <li>• La suma de las 4 dimensiones de cada sección es siempre 100.</li>
        </ul>
      </div>

      {/* Monitoreo de integridad */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Monitoreo de integridad
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <IntegrityStat label="Duración total" value={`${m.duracion_total_s}s`} />
          <IntegrityStat label="Ítems sin responder" value={m.items_sin_responder} />
          <IntegrityStat label="Cambios pestaña" value={m.tab_switch_count} />
          <IntegrityStat label="Fuera de foco" value={`${m.out_of_focus_duration}s`} />
        </div>
      </div>
    </div>
  )
}
