import type { IPVEscala, IPVEscalaResultado } from '@/types/database'
import { getEscalaDef } from '@/lib/ipv/score'

/** Agrupación de la hoja de perfil: DGV | R (I–IV) | A (V–VIII) | IX */
export const IPV_GRUPOS: { key: string; titulo: string; codigos: IPVEscala[] }[] = [
  { key: 'dgv', titulo: 'Disposición general para la venta', codigos: ['DGV'] },
  { key: 'receptividad', titulo: 'Receptividad', codigos: ['R', 'I', 'II', 'III', 'IV'] },
  { key: 'agresividad', titulo: 'Agresividad', codigos: ['A', 'V', 'VI', 'VII', 'VIII'] },
  { key: 'sociabilidad', titulo: 'Sociabilidad', codigos: ['IX'] },
]

const COMPUESTAS = new Set<IPVEscala>(['R', 'A'])

// Geometría (viewBox). La tabla de decatipos ocupa 10 columnas de COL_W.
const W = 660
const LABEL_W = 236
const COL_W = 40
const GRID_W = COL_W * 10
const TOP = 52
const ROW_H = 30
const GROUP_GAP = 14
const BOTTOM = 14

interface Props {
  escalas: Record<IPVEscala, IPVEscalaResultado>
}

export function IPVProfileChart({ escalas }: Props) {
  const left = LABEL_W
  const right = left + GRID_W

  // Posición vertical de cada fila (con una separación extra entre grupos)
  const filas: { codigo: IPVEscala; y: number; grupo: number }[] = []
  const separadores: number[] = []
  let cursor = TOP
  IPV_GRUPOS.forEach((g, gi) => {
    if (gi > 0) {
      separadores.push(cursor + GROUP_GAP / 2)
      cursor += GROUP_GAP
    }
    g.codigos.forEach((codigo) => {
      filas.push({ codigo, y: cursor + ROW_H / 2, grupo: gi })
      cursor += ROW_H
    })
  })
  const height = cursor + BOTTOM
  const xFor = (pt: number) => left + (pt - 0.5) * COL_W

  const puntos = filas.map((f) => ({ ...f, x: xFor(escalas[f.codigo].pt), r: escalas[f.codigo] }))
  const resumen = puntos
    .map((p) => `${p.codigo}: decatipo ${p.r.pt}`)
    .join(', ')

  return (
    <div className="overflow-x-auto pb-1">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        width="100%"
        style={{ minWidth: '560px', display: 'block' }}
        role="img"
        aria-label={`Perfil IPV en decatipos de 1 a 10. ${resumen}`}
      >
        {/* Banda Promedio (decatipos 4–7) */}
        <rect
          x={left + COL_W * 3}
          y={TOP - 8}
          width={COL_W * 4}
          height={height - TOP - BOTTOM + 16}
          rx={8}
          fill="var(--gold)"
          opacity={0.14}
        />
        <text
          x={left + COL_W * 5}
          y={TOP - 34}
          textAnchor="middle"
          fontSize="10"
          fontWeight="700"
          letterSpacing="1.4"
          fill="var(--navy)"
          opacity={0.7}
        >
          PROMEDIO
        </text>

        {/* Encabezado de decatipos + líneas verticales */}
        {Array.from({ length: 10 }, (_, i) => i + 1).map((pt) => (
          <g key={pt}>
            <text
              x={xFor(pt)}
              y={TOP - 14}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill="var(--navy)"
              fontFamily="var(--font-geist-mono, monospace)"
            >
              {pt}
            </text>
            <line
              x1={xFor(pt)}
              x2={xFor(pt)}
              y1={TOP - 4}
              y2={height - BOTTOM}
              stroke="oklch(0.74 0.02 265 / 0.28)"
              strokeWidth={0.75}
              strokeDasharray="2 5"
            />
          </g>
        ))}

        {/* Filas compuestas resaltadas + separadores de grupo */}
        {filas.map((f) =>
          COMPUESTAS.has(f.codigo) ? (
            <rect
              key={`bg-${f.codigo}`}
              x={0}
              y={f.y - ROW_H / 2 + 2}
              width={right}
              height={ROW_H - 4}
              rx={6}
              fill="oklch(0.30 0.04 268 / 0.045)"
            />
          ) : null
        )}
        {separadores.map((y) => (
          <line
            key={y}
            x1={0}
            x2={right}
            y1={y}
            y2={y}
            stroke="var(--gold)"
            strokeWidth={1}
            strokeDasharray="3 5"
            opacity={0.65}
          />
        ))}

        {/* Línea del perfil */}
        <polyline
          points={puntos.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="var(--navy)"
          strokeWidth={1.6}
          strokeLinejoin="round"
          opacity={0.55}
        />

        {/* Etiquetas y puntos */}
        {puntos.map((p) => {
          const def = getEscalaDef(p.codigo)
          const compuesta = COMPUESTAS.has(p.codigo)
          const roman = !compuesta && p.codigo !== 'DGV'
          return (
            <g key={p.codigo}>
              <title>{`${def.nombre}: PD ${p.r.pd} · decatipo ${p.r.pt} (${p.r.nivel})`}</title>
              <text
                x={roman ? 22 : 10}
                y={p.y + 4}
                fontSize="11"
                fontWeight={compuesta || p.codigo === 'DGV' ? 700 : 600}
                fill="var(--navy)"
                fontFamily="var(--font-geist-mono, monospace)"
              >
                {p.codigo}
              </text>
              <text
                x={roman ? 62 : 50}
                y={p.y + 4}
                fontSize="11"
                fontWeight={compuesta || p.codigo === 'DGV' ? 600 : 400}
                fill="var(--navy)"
                opacity={0.88}
              >
                {def.nombre}
              </text>
              <circle
                cx={p.x}
                cy={p.y}
                r={11}
                fill={compuesta || p.codigo === 'DGV' ? 'var(--gold)' : 'var(--navy)'}
                stroke="white"
                strokeWidth={2}
              />
              <text
                x={p.x}
                y={p.y + 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill={compuesta || p.codigo === 'DGV' ? 'var(--navy)' : 'var(--cream)'}
                fontFamily="var(--font-geist-mono, monospace)"
              >
                {p.r.pt}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
