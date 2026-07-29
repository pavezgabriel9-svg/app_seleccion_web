import type { ZAVICAxis, ZAVICResult } from '@/types/database'
import axesData from '@/lib/zavic/data/axes.json' with { type: 'json' }
import { normalizeZAVICResult } from '@/lib/zavic/score'
import { ZAVICChart } from './zavic-chart'

type SectionKey = 'valores' | 'intereses'

interface AxisDef {
  key: ZAVICAxis
  label: string
}

interface AxesData {
  valores: AxisDef[]
  intereses: AxisDef[]
}

const AXES = axesData as AxesData

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

function topDimensions(
  section: SectionKey,
  scores: ZAVICResult['resultado']
): { labels: string; score: number } {
  const axes = AXES[section]
  const sectionScores = scores[section] as Record<string, number>
  const maxScore = Math.max(...axes.map((axis) => sectionScores[axis.key] ?? 0))
  const labels = axes
    .filter((axis) => (sectionScores[axis.key] ?? 0) === maxScore)
    .map((axis) => axis.label)
    .join(' · ')

  return { labels, score: maxScore }
}

function ProfileHighlight({
  eyebrow,
  title,
  score,
  tone,
}: {
  eyebrow: string
  title: string
  score: number
  tone: SectionKey
}) {
  const isValues = tone === 'valores'
  const color = isValues ? '#047857' : '#1e40af'
  const background = isValues
    ? 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(255,255,255,0.96))'
    : 'linear-gradient(135deg, rgba(59,130,246,0.09), rgba(255,255,255,0.96))'

  return (
    <div className="rounded-xl px-5 py-4" style={{ background, border: `1px solid ${color}2e` }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color }}>
        {eyebrow}
      </p>
      <div className="flex items-end justify-between gap-4 mt-2">
        <p
          className="text-xl font-light leading-tight"
          style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}
        >
          {title}
        </p>
        <div className="shrink-0 text-right">
          <span
            className="text-3xl font-light"
            style={{ color, fontFamily: 'var(--font-fraunces, serif)' }}
          >
            {score}
          </span>
          <span className="text-xs text-muted-foreground"> / 40</span>
        </div>
      </div>
    </div>
  )
}

export function ZAVICResultCard({ data }: { data: ZAVICResult }) {
  const scores = normalizeZAVICResult(data)
  const topValue = topDimensions('valores', scores)
  const topInterest = topDimensions('intereses', scores)
  const isHistorical = data.version !== '2.0'
  const m = data.metadata

  return (
    <div className="space-y-7">
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h3
              className="text-xl font-semibold"
              style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}
            >
              Perfil integrado
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground max-w-2xl">
              Lectura conjunta de las ocho dimensiones del test, con una escala común de
              preferencia relativa.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider">
            <span className="inline-flex items-center gap-1.5" style={{ color: '#047857' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: '#047857' }} />
              Valores
            </span>
            <span className="inline-flex items-center gap-1.5" style={{ color: '#1e40af' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: '#1e40af' }} />
              Intereses
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ProfileHighlight
            eyebrow="Mayor puntaje en Valores"
            title={topValue.labels}
            score={topValue.score}
            tone="valores"
          />
          <ProfileHighlight
            eyebrow="Mayor puntaje en Intereses"
            title={topInterest.labels}
            score={topInterest.score}
            tone="intereses"
          />
        </div>

        <div
          className="rounded-xl py-4 px-3 sm:px-4"
          style={{ background: 'white', border: '1px solid oklch(0.92 0.005 80)' }}
        >
          <ZAVICChart scores={scores} />
        </div>
      </section>

      {isHistorical ? (
        <div
          className="rounded-xl px-4 py-3 text-xs leading-relaxed"
          style={{
            background: 'oklch(0.72 0.12 68 / 0.08)',
            border: '1px solid oklch(0.72 0.12 68 / 0.24)',
            color: 'var(--navy)',
          }}
        >
          Resultado histórico normalizado a la escala actual. Los datos originales permanecen
          intactos.
        </div>
      ) : null}

      <div
        className="rounded-xl p-4 text-xs"
        style={{ background: 'oklch(0.96 0.005 80)', color: 'var(--navy)' }}
      >
        <p className="font-semibold mb-2">Cómo leer este perfil</p>
        <ul className="space-y-1 opacity-80 leading-relaxed">
          <li>
            • Cada dimensión va de <strong>10 a 40</strong>: un puntaje mayor indica mayor
            relevancia relativa dentro de su grupo.
          </li>
          <li>
            • Valores e Intereses suman <strong>100 puntos cada uno</strong>. La comparación
            principal debe hacerse entre dimensiones del mismo grupo.
          </li>
          <li>
            • El perfil es una herramienta de apoyo para la evaluación profesional y no constituye
            por sí solo un diagnóstico.
          </li>
        </ul>
      </div>

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
