'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Download, ArrowRight } from 'lucide-react'
import { normalizarDocumento } from '@/lib/documento'
import type { SessionSummary } from '@/app/(admin)/resultados/page'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function unwrap<T>(val: T | T[] | null | undefined): T | null {
  if (!val) return null
  return Array.isArray(val) ? val[0] ?? null : val
}

function exportCSV(sessions: SessionSummary[], adminEmails?: Record<string, string>) {
  const withAttribution = !!adminEmails
  const header = [
    'Candidato', 'RUT / DNI', 'Batería', 'Fecha completado', 'Tests completados',
    ...(withAttribution ? ['Creado por'] : []),
  ]

  const rows = sessions.map((s) => {
    const c = unwrap(s.candidates)
    const b = unwrap(s.batteries)
    const tests = s.test_results
      .map((tr) => unwrap(tr.tests)?.name ?? '')
      .filter(Boolean)
      .join('; ')

    return [
      c?.nombre ?? '',
      c?.rut ?? '',
      b?.name ?? '',
      formatDate(s.completed_at),
      tests,
      ...(withAttribution ? [adminEmails?.[s.admin_id] ?? s.admin_id] : []),
    ]
  })

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `resultados_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  sessions: SessionSummary[]
  adminEmails?: Record<string, string>
}

export function ResultadosTable({ sessions, adminEmails }: Props) {
  const [search, setSearch] = useState('')
  const withAttribution = !!adminEmails

  const filtered = useMemo(() => {
    if (!search.trim()) return sessions
    const q = search.toLowerCase().trim()
    // Los documentos se guardan normalizados (sin puntos ni guión), así que
    // la búsqueda también se normaliza para encontrar "12.345.678-9".
    const qDoc = normalizarDocumento(search).toLowerCase()
    return sessions.filter((s) => {
      const c = unwrap(s.candidates)
      return (
        c?.nombre?.toLowerCase().includes(q) ||
        c?.rut?.toLowerCase().includes(qDoc)
      )
    })
  }, [sessions, search])

  if (sessions.length === 0) {
    return (
      <div className="text-center py-20 bg-white border border-border/50 rounded-xl">
        <p className="text-sm text-muted-foreground">
          Cuando los candidatos completen sus evaluaciones, los resultados aparecerán aquí.
        </p>
      </div>
    )
  }

  const tableHeaders = [
    'Candidato', 'RUT / DNI', 'Batería',
    ...(withAttribution ? ['Creado por'] : []),
    'Completado', 'Tests', '',
  ]

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre o documento…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border/50 bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 transition-shadow"
          />
        </div>
        <button
          onClick={() => exportCSV(filtered, adminEmails)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border border-border/50 bg-white hover:bg-muted/30 transition-colors"
          style={{ color: 'var(--navy)' }}
        >
          <Download className="w-3.5 h-3.5" />
          Exportar CSV
          {search && filtered.length !== sessions.length && (
            <span
              className="ml-1 px-1.5 py-px rounded-full text-[10px]"
              style={{ background: 'oklch(0.72 0.12 68 / 0.15)', color: 'var(--gold)' }}
            >
              {filtered.length}
            </span>
          )}
        </button>
      </div>

      {/* Table or empty */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white border border-border/50 rounded-xl">
          <p className="text-sm text-muted-foreground">
            Sin resultados para &ldquo;{search}&rdquo;
          </p>
        </div>
      ) : (
        <div className="bg-white border border-border/50 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'oklch(0.96 0.005 80)' }}>
                {tableHeaders.map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium text-muted-foreground first:pl-5 last:pr-5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.map((session) => {
                const c = unwrap(session.candidates)
                const b = unwrap(session.batteries)
                const testCount = session.test_results.length
                const creatorEmail = adminEmails?.[session.admin_id]

                return (
                  <tr
                    key={session.id}
                    className="hover:bg-muted/20 transition-colors duration-100"
                  >
                    <td className="pl-5 pr-4 py-3.5">
                      <p className="font-medium text-foreground truncate max-w-[180px]">
                        {c?.nombre ?? 'Sin nombre'}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {c?.rut ?? '—'}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground truncate max-w-[160px]">
                      {b?.name ?? (
                        <span className="italic opacity-60">Batería eliminada</span>
                      )}
                    </td>
                    {withAttribution && (
                      <td className="px-4 py-3.5">
                        <span
                          className="text-[11px] px-2 py-0.5 rounded-full"
                          style={{ background: 'oklch(0.20 0.06 268 / 0.06)', color: 'var(--navy)' }}
                          title={creatorEmail}
                        >
                          {creatorEmail ?? '—'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3.5 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {formatDate(session.completed_at)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{ background: '#2D9E6B1A', color: '#2D9E6B' }}
                      >
                        {testCount} prueba{testCount !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="pl-4 pr-5 py-3.5 text-right">
                      <Link
                        href={`/resultados/${session.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
                        style={{ color: 'var(--gold)' }}
                      >
                        Ver detalles
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Count indicator when filtered */}
      {search.trim() && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {filtered.length} de {sessions.length} resultado{sessions.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
