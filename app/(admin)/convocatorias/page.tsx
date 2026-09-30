import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Plus, Megaphone, Users, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { applySessionVisibility } from '@/lib/auth/session-visibility'
import { CopyLinkButton } from './copy-link-button'
import { CerrarConvocatoriaButton } from './cerrar-convocatoria-button'
import { AgregarHabilitadosForm } from './agregar-habilitados-form'
import type { SessionStatus } from '@/types/database'

export const metadata: Metadata = { title: 'Convocatorias' }

// ─── Types ────────────────────────────────────────────────────────────────────

interface HabilitadoRow {
  id: string
  rut: string
  session_id: string | null
  evaluation_sessions: {
    status: SessionStatus
    candidates: { nombre: string; rut: string } | null
  } | null
}

interface ConvocatoriaRow {
  id: string
  token: string
  nombre: string
  cargo: string | null
  activa: boolean
  expira_at: string | null
  created_at: string
  batteries: { name: string } | null
  convocatoria_habilitados: HabilitadoRow[]
}

type Estado = 'activa' | 'expirada' | 'cerrada'
type EstadoPostulante = 'invitado' | 'en_curso' | 'completada'

// ─── Data fetching ─────────────────────────────────────────────────────────────

async function getConvocatorias(): Promise<ConvocatoriaRow[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const query = supabase
    .from('convocatorias')
    .select(`
      id, token, nombre, cargo, activa, expira_at, created_at,
      batteries(name),
      convocatoria_habilitados(
        id, rut, session_id,
        evaluation_sessions(status, candidates(nombre, rut))
      )
    `)
    .order('created_at', { ascending: false })

  // Visibilidad jerárquica por rol del creador — misma fuente que baterías/resultados.
  const { data } = await applySessionVisibility(query, user)
  return (data ?? []) as unknown as ConvocatoriaRow[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEstado(row: ConvocatoriaRow): Estado {
  if (!row.activa) return 'cerrada'
  if (row.expira_at && new Date(row.expira_at) <= new Date()) return 'expirada'
  return 'activa'
}

const ESTADO_CONFIG: Record<Estado, { label: string; bg: string; color: string }> = {
  activa: { label: 'Activa', bg: '#2D9E6B1A', color: '#2D9E6B' },
  expirada: { label: 'Expirada', bg: 'oklch(0.92 0 0)', color: 'oklch(0.50 0 0)' },
  cerrada: { label: 'Cerrada', bg: 'oklch(0.92 0 0)', color: 'oklch(0.50 0 0)' },
}

function getEstadoPostulante(h: HabilitadoRow): EstadoPostulante {
  if (h.evaluation_sessions?.status === 'completed') return 'completada'
  if (h.session_id) return 'en_curso'
  return 'invitado'
}

const ESTADO_POSTULANTE_CONFIG: Record<
  EstadoPostulante,
  { label: string; bg: string; color: string }
> = {
  invitado: { label: 'Invitado', bg: 'oklch(0.92 0 0)', color: 'oklch(0.50 0 0)' },
  en_curso: { label: 'En curso', bg: 'oklch(0.72 0.12 68 / 0.15)', color: 'oklch(0.55 0.10 68)' },
  completada: { label: 'Completada', bg: '#2D9E6B1A', color: '#2D9E6B' },
}

// Entrados primero (completada antes que en curso), luego invitados sin ingresar.
const ORDEN_ESTADO: Record<EstadoPostulante, number> = { completada: 0, en_curso: 1, invitado: 2 }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'oklch(0.20 0.06 268 / 0.06)' }}
      >
        <Megaphone className="w-7 h-7 text-navy opacity-40" />
      </div>
      <h3
        className="text-xl font-light mb-2"
        style={{ fontFamily: 'var(--font-fraunces)', color: 'var(--navy)' }}
      >
        Sin convocatorias aún
      </h3>
      <p className="text-sm text-muted-foreground mb-8 max-w-sm">
        Una convocatoria es un solo enlace que puedes enviar a varios postulantes de
        un cargo, limitado a la lista de RUT que habilites.
      </p>
      <Button asChild style={{ background: 'var(--navy)', color: 'var(--cream)' }}>
        <Link href="/convocatorias/nueva">
          <Plus className="w-4 h-4 mr-2" />
          Crear primera convocatoria
        </Link>
      </Button>
    </div>
  )
}

function PostulantesDropdown({
  convocatoriaId,
  habilitados,
}: {
  convocatoriaId: string
  habilitados: HabilitadoRow[]
}) {
  const ordenados = [...habilitados].sort(
    (a, b) => ORDEN_ESTADO[getEstadoPostulante(a)] - ORDEN_ESTADO[getEstadoPostulante(b)]
  )

  return (
    <details className="group border-t border-border/30">
      <summary className="flex items-center gap-2 px-5 py-3 text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-navy transition-colors list-none">
        <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
        Ver postulantes ({habilitados.length})
      </summary>
      <div className="px-5 pb-4">
        {ordenados.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Sin RUT habilitados.</p>
        ) : (
          <div className="divide-y divide-border/20 rounded-lg border border-border/30 overflow-hidden">
            {ordenados.map((h) => {
              const estadoP = getEstadoPostulante(h)
              const cfgP = ESTADO_POSTULANTE_CONFIG[estadoP]
              const nombre = h.evaluation_sessions?.candidates?.nombre
              return (
                <div key={h.id} className="flex items-center gap-3 px-3.5 py-2.5 bg-white">
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 w-[76px] text-center"
                    style={{ background: cfgP.bg, color: cfgP.color }}
                  >
                    {cfgP.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {nombre ?? <span className="italic text-muted-foreground">Aún no ingresa</span>}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono flex-shrink-0">{h.rut}</span>
                </div>
              )
            })}
          </div>
        )}
        <AgregarHabilitadosForm convocatoriaId={convocatoriaId} />
      </div>
    </details>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ConvocatoriasPage() {
  const convocatorias = await getConvocatorias()

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-light text-navy gold-line">Convocatorias</h1>
          <p className="text-sm text-muted-foreground mt-4">
            {convocatorias.length === 0
              ? 'No hay convocatorias creadas todavía.'
              : `${convocatorias.length} convocatoria${convocatorias.length === 1 ? '' : 's'} · un enlace, varios postulantes.`}
          </p>
        </div>
        <Button asChild style={{ background: 'var(--navy)', color: 'var(--cream)' }}>
          <Link href="/convocatorias/nueva">
            <Plus className="w-4 h-4 mr-2" />
            Nueva convocatoria
          </Link>
        </Button>
      </div>

      {/* Content */}
      {convocatorias.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="bg-white border border-border/50 rounded-xl overflow-hidden">
          <div className="divide-y divide-border/30">
            {convocatorias.map((row) => {
              const estado = getEstado(row)
              const cfg = ESTADO_CONFIG[estado]
              const total = row.convocatoria_habilitados.length
              const ingresados = row.convocatoria_habilitados.filter(
                (h) => h.session_id !== null
              ).length

              return (
                <div key={row.id}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-navy truncate">{row.nombre}</p>
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                        {row.cargo && <span>{row.cargo}</span>}
                        {row.cargo && <span>·</span>}
                        <span>{row.batteries?.name ?? 'Batería eliminada'}</span>
                        <span>·</span>
                        <span>Creada {formatDate(row.created_at)}</span>
                        {row.expira_at && (
                          <>
                            <span>·</span>
                            <span>Expira {formatDate(row.expira_at)}</span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                        <Users className="w-3.5 h-3.5" />
                        {ingresados} / {total}
                      </span>
                      <CopyLinkButton token={row.token} />
                      <CerrarConvocatoriaButton
                        convocatoriaId={row.id}
                        convocatoriaNombre={row.nombre}
                        activa={row.activa}
                      />
                    </div>
                  </div>

                  <PostulantesDropdown convocatoriaId={row.id} habilitados={row.convocatoria_habilitados} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
