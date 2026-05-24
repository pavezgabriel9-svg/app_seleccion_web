'use client'

import { useState } from 'react'
import type { DISCResult } from '@/types/database'

type AxisKey = 'd' | 'i' | 's' | 'c'

interface AxisInfo {
  letter: string
  title: string
  subtitle: string
  description: string
}

const AXIS_INFO: Record<AxisKey, AxisInfo> = {
  d: {
    letter: 'D',
    title: 'Decisión / Dominancia',
    subtitle: 'Dominance',
    description:
      'Cómo responde la persona a los retos y desafíos. Un puntaje alto indica orientación a resultados, competitividad y asertividad.',
  },
  i: {
    letter: 'I',
    title: 'Influencia',
    subtitle: 'Influence',
    description:
      'Cómo se relaciona la persona con los demás y cómo influye en ellos. Puntaje alto significa optimismo, extroversión y un fuerte enfoque en las relaciones interpersonales.',
  },
  s: {
    letter: 'S',
    title: 'Serenidad / Estabilidad',
    subtitle: 'Steadiness',
    description:
      'Cómo responde la persona al ritmo del entorno y al cambio. Puntaje alto refleja paciencia, lealtad, cooperación y un estilo de trabajo predecible.',
  },
  c: {
    letter: 'C',
    title: 'Cautela / Concienzudo',
    subtitle: 'Conscientiousness',
    description:
      'Cómo responde la persona a las reglas, normas y procedimientos. Puntaje alto indica precisión, análisis, atención al detalle y apego a la calidad.',
  },
}

const AXES_ORDER: AxisKey[] = ['d', 'i', 's', 'c']

function nivel(seg: number): string {
  return seg > 4 ? 'Alto' : seg < 4 ? 'Bajo' : 'Medio'
}

function colorFor(seg: number): string {
  return seg > 4 ? 'var(--navy)' : seg < 4 ? 'oklch(0.72 0.12 68 / 0.6)' : 'var(--gold)'
}

export function DISCChart({ segmentos }: { segmentos: DISCResult['resultado']['segmentos'] }) {
  const [hovered, setHovered] = useState<AxisKey | null>(null)

  // ── Dimensiones del SVG ─────────────────────────────────────────────────
  const W = 460
  const H = 290
  const left = 38           // espacio para la escala Y
  const right = 16
  const top = 28            // espacio para el número de segmento sobre las barras
  const baseY = 230         // línea inferior de las barras
  const maxH = baseY - top  // altura disponible para segmento 7
  const innerW = W - left - right
  const colW = innerW / 4
  const barW = 60

  const yFor = (s: number) => baseY - (s / 7) * maxH

  return (
    <div className="space-y-4 w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ maxWidth: `${W}px`, display: 'block', margin: '0 auto' }}
        role="img"
        aria-label="Gráfico DISC"
      >
        {/* Escala Y tenue (1..7) */}
        {[1, 2, 3, 4, 5, 6, 7].map((s) => (
          <g key={s}>
            <line
              x1={left - 4}
              x2={left}
              y1={yFor(s)}
              y2={yFor(s)}
              stroke="oklch(0.72 0.03 265 / 0.5)"
              strokeWidth={0.5}
            />
            <text
              x={left - 8}
              y={yFor(s) + 3}
              fontSize="9"
              textAnchor="end"
              fill="oklch(0.55 0.03 265 / 0.7)"
              fontFamily="var(--font-geist-mono, monospace)"
            >
              {s}
            </text>
          </g>
        ))}

        {/* Línea media (segmento 4) */}
        <line
          x1={left}
          y1={yFor(4)}
          x2={W - right}
          y2={yFor(4)}
          stroke="var(--gold)"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.55}
        />

        {AXES_ORDER.map((axKey, i) => {
          const seg = segmentos[axKey]
          const barH = (seg / 7) * maxH
          const cx = left + colW * i + colW / 2
          const x = cx - barW / 2
          const y = baseY - barH
          const isHovered = hovered === axKey
          const isDimmed = hovered !== null && !isHovered

          return (
            <g
              key={axKey}
              onMouseEnter={() => setHovered(axKey)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(axKey)}
              onBlur={() => setHovered(null)}
              tabIndex={0}
              role="button"
              aria-label={`${AXIS_INFO[axKey].title}: segmento ${seg}`}
              style={{ cursor: 'pointer', outline: 'none' }}
            >
              {/* Hit-area transparente cubre toda la columna */}
              <rect
                x={cx - colW / 2}
                y={top - 8}
                width={colW}
                height={H - top + 8}
                fill="transparent"
              />

              {/* Barra */}
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={4}
                fill={colorFor(seg)}
                opacity={isDimmed ? 0.32 : 1}
                stroke={isHovered ? 'var(--gold)' : 'transparent'}
                strokeWidth={2}
                style={{ transition: 'opacity .15s ease, stroke .15s ease' }}
              />

              {/* Número de segmento */}
              <text
                x={cx}
                y={y - 8}
                fontSize="13"
                fontWeight={600}
                textAnchor="middle"
                fill="var(--navy)"
                fontFamily="var(--font-geist-mono, monospace)"
                opacity={isDimmed ? 0.4 : 1}
                style={{ transition: 'opacity .15s ease' }}
              >
                {seg}
              </text>

              {/* Letra del eje */}
              <text
                x={cx}
                y={baseY + 24}
                fontSize="18"
                fontWeight={isHovered ? 700 : 600}
                textAnchor="middle"
                fill="var(--navy)"
                fontFamily="var(--font-fraunces, serif)"
                opacity={isDimmed ? 0.45 : 1}
                style={{ transition: 'opacity .15s ease' }}
              >
                {AXIS_INFO[axKey].letter}
              </text>

              {/* Nivel (Alto / Medio / Bajo) */}
              <text
                x={cx}
                y={baseY + 42}
                fontSize="10"
                textAnchor="middle"
                fill="oklch(0.60 0.03 265)"
                opacity={isDimmed ? 0.4 : 1}
                style={{ transition: 'opacity .15s ease' }}
              >
                {nivel(seg)}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Panel de explicación del eje */}
      <div
        className="rounded-xl px-4 py-3 mx-auto"
        style={{
          maxWidth: `${W}px`,
          minHeight: '76px',
          background: hovered ? 'oklch(0.96 0.005 80)' : 'transparent',
          border: '1px solid',
          borderColor: hovered ? 'oklch(0.92 0.005 80)' : 'oklch(0.94 0.005 80)',
          transition: 'background .2s ease, border-color .2s ease',
        }}
      >
        {hovered ? (
          <div className="flex items-start gap-3">
            <span
              className="shrink-0 w-9 h-9 rounded-md flex items-center justify-center text-base font-semibold"
              style={{
                background: 'var(--navy)',
                color: 'var(--cream)',
                fontFamily: 'var(--font-fraunces, serif)',
              }}
            >
              {AXIS_INFO[hovered].letter}
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>
                {AXIS_INFO[hovered].title}{' '}
                <span className="text-xs font-normal italic text-muted-foreground">
                  ({AXIS_INFO[hovered].subtitle})
                </span>
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {AXIS_INFO[hovered].description}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-center text-muted-foreground py-2">
            Pasa el cursor sobre <strong style={{ color: 'var(--navy)' }}>D</strong>,{' '}
            <strong style={{ color: 'var(--navy)' }}>I</strong>,{' '}
            <strong style={{ color: 'var(--navy)' }}>S</strong> o{' '}
            <strong style={{ color: 'var(--navy)' }}>C</strong> para ver su significado.
          </p>
        )}
      </div>
    </div>
  )
}
