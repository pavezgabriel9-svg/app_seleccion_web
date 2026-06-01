'use client'

import { useState } from 'react'
import axesData from '@/lib/zavic/data/axes.json' with { type: 'json' }

interface AxisDef {
  key: string
  label: string
  descripcion: string
}
interface AxesData {
  valores: AxisDef[]
  intereses: AxisDef[]
}

const AXES = axesData as AxesData

interface Props {
  seccion: 'valores' | 'intereses'
  scores: Record<string, number>
}

function categoria(score: number): string {
  if (score <= 15) return 'Predominante'
  if (score <= 20) return 'Significativo'
  if (score <= 30) return 'Promedio'
  return 'Bajo'
}

function colorFor(score: number): string {
  if (score <= 20) return 'var(--navy)'
  if (score <= 30) return 'oklch(0.72 0.12 68 / 0.7)'
  return 'oklch(0.72 0.12 68 / 0.35)'
}

export function ZAVICChart({ seccion, scores }: Props) {
  const [hovered, setHovered] = useState<string | null>(null)
  const axes = AXES[seccion]

  // ── Dimensiones del SVG ─────────────────────────────────────────────────
  const W = 460
  const H = 312
  const left = 42
  const right = 16
  const top = 28
  const baseY = 230
  const maxH = baseY - top
  const innerW = W - left - right
  const colW = innerW / 4
  const barW = 62

  // Barra más alta = puntaje más bajo = preferencia más fuerte
  const heightFor = (score: number) => Math.max(0, ((40 - score) / 30) * maxH)
  const yFor = (score: number) => baseY - heightFor(score)

  const yLabels = [
    { score: 10, label: '10' },
    { score: 25, label: '25' },
    { score: 40, label: '40' },
  ]

  return (
    <div className="space-y-4 w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ maxWidth: `${W}px`, display: 'block', margin: '0 auto' }}
        role="img"
        aria-label={`Gráfico ZAVIC — ${seccion}`}
      >
        {/* Escala Y tenue */}
        {yLabels.map(({ score, label }) => (
          <g key={score}>
            <line
              x1={left - 4}
              x2={left}
              y1={yFor(score)}
              y2={yFor(score)}
              stroke="oklch(0.72 0.03 265 / 0.5)"
              strokeWidth={0.5}
            />
            <text
              x={left - 8}
              y={yFor(score) + 3}
              fontSize="9"
              textAnchor="end"
              fill="oklch(0.55 0.03 265 / 0.7)"
              fontFamily="var(--font-geist-mono, monospace)"
            >
              {label}
            </text>
          </g>
        ))}

        {/* Línea media (neutro = 25) */}
        <line
          x1={left}
          y1={yFor(25)}
          x2={W - right}
          y2={yFor(25)}
          stroke="var(--gold)"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.55}
        />

        {axes.map((ax, i) => {
          const score = scores[ax.key] ?? 0
          const barH = heightFor(score)
          const cx = left + colW * i + colW / 2
          const x = cx - barW / 2
          const y = baseY - barH
          const isHovered = hovered === ax.key
          const isDimmed = hovered !== null && !isHovered

          return (
            <g
              key={ax.key}
              onMouseEnter={() => setHovered(ax.key)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(ax.key)}
              onBlur={() => setHovered(null)}
              tabIndex={0}
              role="button"
              aria-label={`${ax.label}: puntaje ${score}, ${categoria(score)}`}
              style={{ cursor: 'pointer', outline: 'none' }}
            >
              <rect
                x={cx - colW / 2}
                y={top - 8}
                width={colW}
                height={H - top + 8}
                fill="transparent"
              />
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={4}
                fill={colorFor(score)}
                opacity={isDimmed ? 0.32 : 1}
                stroke={isHovered ? 'var(--gold)' : 'transparent'}
                strokeWidth={2}
                style={{ transition: 'opacity .15s ease, stroke .15s ease' }}
              />
              {/* Puntaje */}
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
                {score}
              </text>
              {/* Nombre de la dimensión */}
              <text
                x={cx}
                y={baseY + 22}
                fontSize="13"
                fontWeight={isHovered ? 700 : 600}
                textAnchor="middle"
                fill="var(--navy)"
                fontFamily="var(--font-fraunces, serif)"
                opacity={isDimmed ? 0.45 : 1}
                style={{ transition: 'opacity .15s ease' }}
              >
                {ax.label}
              </text>
              {/* Categoría */}
              <text
                x={cx}
                y={baseY + 40}
                fontSize="10"
                textAnchor="middle"
                fill="oklch(0.55 0.03 265)"
                opacity={isDimmed ? 0.4 : 1}
                style={{ transition: 'opacity .15s ease' }}
              >
                {categoria(score)}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Panel de explicación */}
      <div
        className="rounded-xl px-4 py-3 mx-auto"
        style={{
          maxWidth: `${W}px`,
          minHeight: '72px',
          background: hovered ? 'oklch(0.96 0.005 80)' : 'transparent',
          border: '1px solid',
          borderColor: hovered ? 'oklch(0.92 0.005 80)' : 'oklch(0.94 0.005 80)',
          transition: 'background .2s ease, border-color .2s ease',
        }}
      >
        {hovered
          ? (() => {
              const ax = axes.find((a) => a.key === hovered)!
              return (
                <div className="space-y-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>
                    {ax.label}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {ax.descripcion}
                  </p>
                </div>
              )
            })()
          : (
              <p className="text-xs text-center text-muted-foreground py-2">
                Pasa el cursor sobre cualquier dimensión para ver su descripción.
              </p>
            )}
      </div>
    </div>
  )
}
