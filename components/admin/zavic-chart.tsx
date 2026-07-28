'use client'

import { useState } from 'react'
import axesData from '@/lib/zavic/data/axes.json' with { type: 'json' }
import type { ZAVICAxis, ZAVICResult } from '@/types/database'

type SectionKey = 'valores' | 'intereses'

interface AxisDef {
  key: ZAVICAxis
  label: string
  descripcion: string
}

interface AxisWithSection extends AxisDef {
  section: SectionKey
}

interface AxesData {
  valores: AxisDef[]
  intereses: AxisDef[]
}

const AXES_DATA = axesData as AxesData
const AXES: AxisWithSection[] = [
  ...AXES_DATA.valores.map((axis) => ({ ...axis, section: 'valores' as const })),
  ...AXES_DATA.intereses.map((axis) => ({ ...axis, section: 'intereses' as const })),
]

const SECTION_META: Record<
  SectionKey,
  { label: string; color: string; soft: string; border: string }
> = {
  valores: {
    label: 'Valores',
    color: '#047857',
    soft: 'rgba(16, 185, 129, 0.055)',
    border: 'rgba(16, 185, 129, 0.24)',
  },
  intereses: {
    label: 'Intereses',
    color: '#1e40af',
    soft: 'rgba(59, 130, 246, 0.05)',
    border: 'rgba(59, 130, 246, 0.22)',
  },
}

interface Props {
  scores: ZAVICResult['resultado']
}

function scoreFor(axis: AxisWithSection, scores: ZAVICResult['resultado']): number {
  if (axis.section === 'valores') {
    return scores.valores[axis.key as keyof typeof scores.valores] ?? 0
  }
  return scores.intereses[axis.key as keyof typeof scores.intereses] ?? 0
}

export function ZAVICChart({ scores }: Props) {
  const [activeAxis, setActiveAxis] = useState<ZAVICAxis | null>(null)

  const width = 880
  const height = 332
  const left = 48
  const right = 18
  const top = 48
  const baseY = 258
  const chartHeight = baseY - top
  const innerWidth = width - left - right
  const columnWidth = innerWidth / AXES.length
  const barWidth = 52
  const splitX = left + innerWidth / 2

  const yFor = (score: number) => baseY - (Math.max(0, Math.min(score, 40)) / 40) * chartHeight
  const hoveredAxis = activeAxis ? AXES.find((axis) => axis.key === activeAxis) ?? null : null

  return (
    <div className="space-y-4 w-full">
      <div className="overflow-x-auto pb-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          style={{ minWidth: '760px', display: 'block' }}
          role="img"
          aria-label="Perfil integrado ZAVIC de Valores e Intereses"
        >
          <rect
            x={left}
            y={top - 24}
            width={innerWidth / 2}
            height={baseY - top + 32}
            rx={10}
            fill={SECTION_META.valores.soft}
          />
          <rect
            x={splitX}
            y={top - 24}
            width={innerWidth / 2}
            height={baseY - top + 32}
            rx={10}
            fill={SECTION_META.intereses.soft}
          />

          <text
            x={left + innerWidth / 4}
            y={top - 8}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            letterSpacing="1.6"
            fill={SECTION_META.valores.color}
          >
            VALORES
          </text>
          <text
            x={splitX + innerWidth / 4}
            y={top - 8}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            letterSpacing="1.6"
            fill={SECTION_META.intereses.color}
          >
            INTERESES
          </text>

          {[0, 10, 20, 30, 40].map((score) => (
            <g key={score}>
              <line
                x1={left}
                x2={width - right}
                y1={yFor(score)}
                y2={yFor(score)}
                stroke={score === 0 ? 'oklch(0.70 0.02 265 / 0.55)' : 'oklch(0.74 0.02 265 / 0.24)'}
                strokeWidth={score === 0 ? 1 : 0.75}
                strokeDasharray={score === 0 ? undefined : '3 5'}
              />
              <text
                x={left - 10}
                y={yFor(score) + 3}
                fontSize="9"
                textAnchor="end"
                fill="oklch(0.52 0.03 265 / 0.72)"
                fontFamily="var(--font-geist-mono, monospace)"
              >
                {score}
              </text>
            </g>
          ))}

          <line
            x1={splitX}
            x2={splitX}
            y1={top - 18}
            y2={baseY + 8}
            stroke="var(--gold)"
            strokeWidth={1}
            strokeDasharray="3 5"
            opacity={0.65}
          />

          {AXES.map((axis, index) => {
            const score = scoreFor(axis, scores)
            const centerX = left + columnWidth * index + columnWidth / 2
            const y = yFor(score)
            const barHeight = baseY - y
            const isActive = activeAxis === axis.key
            const isDimmed = activeAxis !== null && !isActive
            const meta = SECTION_META[axis.section]

            return (
              <g
                key={axis.key}
                tabIndex={0}
                role="button"
                aria-label={`${axis.label}: ${score} de 40, ${meta.label}`}
                onMouseEnter={() => setActiveAxis(axis.key)}
                onMouseLeave={() => setActiveAxis(null)}
                onFocus={() => setActiveAxis(axis.key)}
                onBlur={() => setActiveAxis(null)}
                onClick={() => setActiveAxis((current) => (current === axis.key ? null : axis.key))}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  setActiveAxis((current) => (current === axis.key ? null : axis.key))
                }}
                style={{ cursor: 'pointer', outline: 'none' }}
              >
                <rect
                  x={centerX - columnWidth / 2}
                  y={top - 2}
                  width={columnWidth}
                  height={height - top + 2}
                  fill="transparent"
                />
                <rect
                  x={centerX - barWidth / 2}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={6}
                  fill={meta.color}
                  opacity={isDimmed ? 0.3 : 0.9}
                  stroke={isActive ? 'var(--gold)' : 'rgba(255,255,255,0.65)'}
                  strokeWidth={isActive ? 2.5 : 1}
                  style={{
                    transition: 'opacity .16s ease, stroke .16s ease, filter .16s ease',
                    filter: isActive ? 'drop-shadow(0 5px 8px rgba(21, 32, 63, 0.15))' : 'none',
                  }}
                />
                <text
                  x={centerX}
                  y={Math.max(y - 9, top - 5)}
                  fontSize="13"
                  fontWeight="700"
                  textAnchor="middle"
                  fill="var(--navy)"
                  fontFamily="var(--font-geist-mono, monospace)"
                  opacity={isDimmed ? 0.38 : 1}
                >
                  {score}
                </text>
                <text
                  x={centerX}
                  y={baseY + 24}
                  fontSize="11"
                  fontWeight={isActive ? 700 : 600}
                  textAnchor="middle"
                  fill="var(--navy)"
                  opacity={isDimmed ? 0.4 : 0.86}
                >
                  {axis.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div
        className="rounded-xl px-4 py-3.5"
        style={{
          minHeight: '82px',
          background: hoveredAxis ? SECTION_META[hoveredAxis.section].soft : 'oklch(0.985 0.003 80)',
          border: '1px solid',
          borderColor: hoveredAxis
            ? SECTION_META[hoveredAxis.section].border
            : 'oklch(0.92 0.005 80)',
          transition: 'background .18s ease, border-color .18s ease',
        }}
      >
        {hoveredAxis ? (
          <div className="flex items-start gap-3">
            <span
              className="shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider"
              style={{
                background: SECTION_META[hoveredAxis.section].color,
                color: 'white',
              }}
            >
              {SECTION_META[hoveredAxis.section].label}
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>
                {hoveredAxis.label}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {hoveredAxis.descripcion}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[52px]">
            <p className="text-xs text-center text-muted-foreground">
              Selecciona una dimensión para revisar su significado. Un puntaje mayor indica
              mayor relevancia relativa dentro de su grupo.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
