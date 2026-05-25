import type { DISCResult } from '@/types/database'
import patternTextsData from '@/lib/disc/data/pattern-texts.json' with { type: 'json' }
import { DISCChart } from './disc-chart'

interface PatternText {
  emociones?: string
  meta?: string
  juzga_a_los_demas_por?: string
  influye_mediante?: string
  valor_para_organizacion?: string
  bajo_presion?: string
  teme?: string
  abusa_de?: string
  seria_mas_eficaz_si?: string
  descripcion_general?: string[]
}

const PATTERN_TEXTS = patternTextsData as Record<string, PatternText>

const FIELD_ORDER: { key: keyof PatternText; label: string }[] = [
  { key: 'emociones', label: 'Emociones' },
  { key: 'meta', label: 'Meta' },
  { key: 'juzga_a_los_demas_por', label: 'Juzga a los demás por' },
  { key: 'influye_mediante', label: 'Influye mediante' },
  { key: 'valor_para_organizacion', label: 'Valor para la organización' },
  { key: 'bajo_presion', label: 'Bajo presión' },
  { key: 'teme', label: 'Teme' },
  { key: 'abusa_de', label: 'Abusa de' },
  { key: 'seria_mas_eficaz_si', label: 'Sería más eficaz si' },
]

function CountChips({ data }: { data: DISCResult }) {
  const { conteos, netos } = data.resultado
  const rows = [
    { label: 'D', mas: conteos.d_mas, menos: conteos.d_menos, neto: netos.d },
    { label: 'I', mas: conteos.i_mas, menos: conteos.i_menos, neto: netos.i },
    { label: 'S', mas: conteos.s_mas, menos: conteos.s_menos, neto: netos.s },
    { label: 'C', mas: conteos.c_mas, menos: conteos.c_menos, neto: netos.c },
  ]
  return (
    <div className="flex flex-wrap gap-2">
      {rows.map((r) => (
        <span
          key={r.label}
          className="text-[11px] font-mono px-2.5 py-1 rounded-md"
          style={{ background: 'oklch(0.96 0.005 80)', color: 'oklch(0.50 0.03 265)' }}
        >
          <span style={{ color: 'var(--navy)', fontWeight: 600 }}>{r.label}</span>: +{r.mas} / -{r.menos} ={' '}
          {r.neto >= 0 ? `+${r.neto}` : r.neto}
        </span>
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-sm" style={{ color: 'var(--navy)' }}>
        {children}
      </p>
    </div>
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

export function DISCResultCard({ data }: { data: DISCResult }) {
  const { codigo, patron, segmentos } = data.resultado
  const m = data.metadata
  const texto = PATTERN_TEXTS[patron]
  const camposConTexto = texto
    ? FIELD_ORDER.filter((f) => typeof texto[f.key] === 'string' && texto[f.key])
    : []

  return (
    <div className="space-y-6">
      {/* Header del patrón */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <h3 className="text-2xl font-light" style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}>
          {patron}
        </h3>
        <span
          className="text-xs font-mono px-2.5 py-1 rounded-md tracking-widest"
          style={{ background: 'var(--navy)', color: 'var(--cream)' }}
        >
          {codigo}
        </span>
      </div>

      {/* Gráfico DISC */}
      <div className="flex justify-center rounded-xl py-4" style={{ background: 'white', border: '1px solid oklch(0.92 0.005 80)' }}>
        <DISCChart segmentos={segmentos} />
      </div>

      {/* Conteos brutos */}
      <CountChips data={data} />

      {/* Textos descriptivos o caja informativa */}
      {texto ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {camposConTexto.map((f) => (
              <Field key={f.key} label={f.label}>
                {texto[f.key] as string}
              </Field>
            ))}
          </div>
          {texto.descripcion_general && texto.descripcion_general.length > 0 && (
            <div className="space-y-3 pt-2">
              {texto.descripcion_general.map((parrafo, i) => (
                <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                  {parrafo}
                </p>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div
          className="rounded-xl p-4 text-sm leading-relaxed"
          style={{ background: 'oklch(0.72 0.12 68 / 0.08)', border: '1px solid oklch(0.72 0.12 68 / 0.3)', color: 'var(--navy)' }}
        >
          Este patrón corresponde a una configuración con baja definición psicométrica. Se
          recomienda análisis profesional para una interpretación adecuada.
        </div>
      )}

      {/* Monitoreo de integridad */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Monitoreo de integridad
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <IntegrityStat label="Duración total" value={`${m.duracion_total_s}s`} />
          <IntegrityStat label="Grupos sin responder" value={m.grupos_sin_responder} />
          <IntegrityStat label="Cambios pestaña" value={m.tab_switch_count} />
          <IntegrityStat label="Fuera de foco" value={`${m.out_of_focus_duration}s`} />
        </div>
      </div>
    </div>
  )
}
