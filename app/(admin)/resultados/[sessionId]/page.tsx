import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type {
  HanoiResult,
  ICResult,
  ICResultV2,
  MemoriaResult,
  StroopResult,
  LuscherResult,
  DISCResult,
  ZAVICResult,
  CognitivoResult,
  TestResultData,
} from '@/types/database'
import { DISCResultCard } from '@/components/admin/disc-result-card'
import { ZAVICResultCard } from '@/components/admin/zavic-result-card'
import { CognitivoResultCard } from '@/components/admin/cognitivo-result-card'

export const metadata: Metadata = { title: 'Detalle de evaluación' }

// ─── Types ────────────────────────────────────────────────────────────────────

interface TestResultRow {
  test_id: string
  results: TestResultData
  completed_at: string
  tests: { name: string; path: string } | null
}

interface SessionDetail {
  id: string
  completed_at: string | null
  started_at: string | null
  batteries: { name: string } | null
  candidates: { nombre: string; rut: string; registered_at: string } | null
  test_results: TestResultRow[]
}

// ─── Data fetching ─────────────────────────────────────────────────────────────

async function getSessionDetail(
  sessionId: string,
  adminId: string
): Promise<SessionDetail | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('evaluation_sessions')
    .select(`
      id, completed_at, started_at,
      batteries(name),
      candidates(nombre, rut, registered_at),
      test_results(test_id, results, completed_at, tests(name, path))
    `)
    .eq('id', sessionId)
    .eq('admin_id', adminId)
    .eq('status', 'completed')
    .single()

  if (!data) return null

  const session = data as unknown as SessionDetail
  session.test_results = [...session.test_results].sort(
    (a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime()
  )

  return session
}

// ─── Type narrowing ───────────────────────────────────────────────────────────

function isHanoi(r: TestResultData): r is HanoiResult {
  return typeof r === 'object' && r !== null && 'movimientos' in r && 'faltas' in r
}
function isIC(r: TestResultData): r is ICResult {
  return typeof r === 'object' && r !== null && 'puntaje' in r && 'incorrectas' in r
}
function isICv2(r: TestResultData): r is ICResultV2 {
  return typeof r === 'object' && r !== null && 'respuestas' in r && 'metadata' in r
}
function isMemoria(r: TestResultData): r is MemoriaResult {
  return typeof r === 'object' && r !== null && 'intentos' in r && 'erroresRepetidos' in r
}
function isStroop(r: TestResultData): r is StroopResult {
  return typeof r === 'object' && r !== null && 'score' in r && 'total' in r && 'errors' in r
}
function isLuscher(r: TestResultData): r is LuscherResult {
  return typeof r === 'object' && r !== null && 'grises' in r && 'colores1' in r
}
function isDISC(r: TestResultData): r is DISCResult {
  return (
    typeof r === 'object' &&
    r !== null &&
    'resultado' in r &&
    typeof (r as DISCResult).resultado === 'object' &&
    'codigo' in (r as DISCResult).resultado
  )
}
function isZAVIC(r: TestResultData): r is ZAVICResult {
  return (
    typeof r === 'object' &&
    r !== null &&
    'resultado' in r &&
    typeof (r as ZAVICResult).resultado === 'object' &&
    'valores' in (r as ZAVICResult).resultado &&
    'intereses' in (r as ZAVICResult).resultado
  )
}
function isCognitivo(r: TestResultData): r is CognitivoResult {
  return (
    typeof r === 'object' &&
    r !== null &&
    'resultado' in r &&
    typeof (r as CognitivoResult).resultado === 'object' &&
    'puntaje' in (r as CognitivoResult).resultado &&
    'por_categoria' in (r as CognitivoResult).resultado
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function Stat({ label, value }: { label: string; value: string | number }) {
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

// ─── Result renderers per test type ──────────────────────────────────────────

function ResultCard({ result }: { result: TestResultData }) {
  if (isDISC(result)) {
    return <DISCResultCard data={result} />
  }

  if (isZAVIC(result)) {
    return <ZAVICResultCard data={result} />
  }

  if (isCognitivo(result)) {
    return <CognitivoResultCard data={result} />
  }

  if (isHanoi(result)) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">{result.rendimiento}</p>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Movimientos" value={result.movimientos} />
          <Stat label="Faltas" value={result.faltas} />
          <Stat label="Tiempo (s)" value={result.tiempoTotal} />
        </div>
      </div>
    )
  }

  if (isICv2(result)) {
    const r = result.respuestas
    const m = result.metadata
    return (
      <div className="space-y-4">
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{r.nivelRendimiento}</p>
          <div className="grid grid-cols-4 gap-3">
            <Stat label="Correctas" value={r.puntaje} />
            <Stat label="Incorrectas" value={r.incorrectas} />
            <Stat label="Omisiones" value={r.omisiones} />
            <Stat label="Ajustado" value={r.puntuacionAjustada} />
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Monitoreo de integridad
          </p>
          <div className="grid grid-cols-4 gap-3">
            <Stat label="T. preparación" value={`${m.preparation_time}s`} />
            <Stat label="T. total" value={`${m.total_viewing_time}s`} />
            <Stat label="Cambios pestaña" value={m.tab_switch_count} />
            <Stat label="Fuera de foco" value={`${m.out_of_focus_duration}s`} />
          </div>
        </div>
      </div>
    )
  }

  if (isIC(result)) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">{result.nivelRendimiento}</p>
        <div className="grid grid-cols-4 gap-3">
          <Stat label="Correctas" value={result.puntaje} />
          <Stat label="Incorrectas" value={result.incorrectas} />
          <Stat label="Omisiones" value={result.omisiones} />
          <Stat label="Ajustado" value={result.puntuacionAjustada} />
        </div>
      </div>
    )
  }

  if (isMemoria(result)) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">{result.rendimiento}</p>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Intentos" value={result.intentos} />
          <Stat label="Tiempo (s)" value={result.tiempo} />
          <Stat label="Errores" value={result.erroresRepetidos} />
        </div>
      </div>
    )
  }

  if (isStroop(result)) {
    const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Aciertos" value={result.score} />
          <Stat label="Errores" value={result.errors} />
          <Stat label="Total" value={result.total} />
        </div>
        <p className="text-xs text-muted-foreground">{pct}% precisión · {result.tiempoTotal}s</p>
      </div>
    )
  }

  if (isLuscher(result)) {
    const rows = [
      { label: 'Grises', values: result.grises },
      { label: 'Colores I', values: result.colores1 },
      { label: 'Formas', values: result.formas },
      { label: 'Colores II', values: result.colores2 },
    ]
    return (
      <div className="space-y-2">
        {rows.map(({ label, values }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{label}</span>
            <span
              className="text-xs font-mono"
              style={{ color: 'var(--navy)' }}
            >
              {values.join(' → ')}
            </span>
          </div>
        ))}
      </div>
    )
  }

  // Fallback — unknown result shape
  return (
    <pre
      className="text-xs overflow-auto rounded-lg p-3"
      style={{ background: 'oklch(0.96 0.005 80)', color: 'var(--navy)' }}
    >
      {JSON.stringify(result, null, 2)}
    </pre>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ sessionId: string }>
}

export default async function SessionDetailPage({ params }: Props) {
  const { sessionId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const session = await getSessionDetail(sessionId, user.id)
  if (!session) notFound()

  const candidate = Array.isArray(session.candidates)
    ? session.candidates[0]
    : session.candidates
  const battery = Array.isArray(session.batteries)
    ? session.batteries[0]
    : session.batteries

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/resultados" className="hover:text-navy transition-colors">
          Resultados
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground/70 truncate max-w-[200px]">
          {candidate?.nombre ?? 'Candidato'}
        </span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-4xl font-light text-navy gold-line">
          {candidate?.nombre ?? 'Candidato'}
        </h1>
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {candidate?.rut && (
            <span className="text-xs text-muted-foreground">{candidate.rut}</span>
          )}
          {battery && (
            <span className="text-xs text-muted-foreground">· {battery.name}</span>
          )}
          {session.completed_at && (
            <span className="text-xs text-muted-foreground">
              · Completado el {formatDate(session.completed_at)}
            </span>
          )}
        </div>
      </div>

      {/* Test results */}
      <div className="space-y-5">
        {session.test_results.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No se encontraron resultados de pruebas para esta sesión.
          </p>
        ) : (
          session.test_results.map((tr) => {
            const testInfo = Array.isArray(tr.tests) ? tr.tests[0] : tr.tests
            return (
              <div
                key={tr.test_id}
                className="bg-white border border-border/50 rounded-xl overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-navy">
                    {testInfo?.name ?? 'Test'}
                  </h2>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDate(tr.completed_at)}
                  </span>
                </div>
                <div className="p-5">
                  <ResultCard result={tr.results} />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
