import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { TestSnapshot } from '@/types/database'

interface Props {
  params: Promise<{ token: string }>
}

type TestState = 'completed' | 'available'

type TestWithState = TestSnapshot & { state: TestState }

export default async function HubPage({ params }: Props) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: session } = await supabase
    .from('evaluation_sessions')
    .select('id, status, tests_snapshot, convocatoria_id')
    .eq('token', token)
    .single()

  if (!session) {
    return (
      <HubMessage
        icon="✕"
        title="Evaluación no encontrada"
        message="Este enlace no existe o ha expirado. Contacta a quien te lo envió."
        variant="error"
      />
    )
  }

  if (session.status === 'pending') {
    redirect(`/eval/${token}`)
  }

  // Sesiones que provienen de una convocatoria (link compartido) llevan una
  // cookie httpOnly puesta por ingresarConvocatoriaAction al validar el RUT.
  // Sin ella, alguien no puede retomar el hub de otra persona simplemente
  // adivinando o copiando el token de sesión.
  if (session.convocatoria_id) {
    const cookieStore = await cookies()
    const cookieValue = cookieStore.get(`cv_${session.id}`)?.value
    if (cookieValue !== token) {
      return (
        <HubMessage
          icon="🔒"
          title="Acceso no verificado"
          message="Para continuar, ingresa nuevamente desde el enlace de la convocatoria con tu nombre y RUT."
          variant="error"
        />
      )
    }
  }

  const snapshot = session.tests_snapshot as TestSnapshot[]

  const { data: completedResults } = await supabase
    .from('test_results')
    .select('test_id')
    .eq('session_id', session.id)

  const completedTestIds = new Set(completedResults?.map(r => r.test_id) ?? [])
  const completedCount = completedTestIds.size

  const { data: candidate } = await supabase
    .from('candidates')
    .select('nombre')
    .eq('session_id', session.id)
    .single()

  const firstName = candidate?.nombre?.split(' ')[0] ?? ''

  const tests: TestWithState[] = snapshot.map(t => ({
    ...t,
    state: completedTestIds.has(t.id) ? 'completed' : 'available',
  }))

  const allDone = completedCount >= snapshot.length

  if (allDone) {
    return <SuccessState firstName={firstName} totalTests={snapshot.length} />
  }

  const progressPct = Math.round((completedCount / snapshot.length) * 100)

  return (
    <div className="max-w-xl mx-auto space-y-10">
      {/* Header */}
      <div className="space-y-5">
        <div className="space-y-1.5">
          {firstName && (
            <p
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: 'var(--muted-foreground)' }}
            >
              {firstName}
            </p>
          )}
          <h1 className="text-3xl font-light text-navy gold-line">
            Tus evaluaciones
          </h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Puedes completar las pruebas en cualquier orden. Haz clic en una para comenzar.
        </p>

        {/* Progress bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-muted-foreground">
              Progreso general
            </span>
            <span
              className="text-[11px] font-semibold tabular-nums"
              style={{ color: 'var(--navy)' }}
            >
              {completedCount} / {snapshot.length}
            </span>
          </div>
          <div
            className="h-1 rounded-full overflow-hidden"
            style={{ background: 'oklch(0.90 0.005 80)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%`, background: 'var(--gold)' }}
            />
          </div>
        </div>
      </div>

      {/* Test list */}
      <ol className="space-y-3" aria-label="Lista de pruebas">
        {tests.map((test, idx) => (
          <TestCard key={test.id} test={test} index={idx} token={token} />
        ))}
      </ol>

      {/* Footer note */}
      <p className="text-[11px] text-muted-foreground/50 text-center">
        Puedes completar las pruebas en cualquier orden.
      </p>
    </div>
  )
}

// ─── TestCard ─────────────────────────────────────────────────────────────────

function TestCard({
  test,
  index,
  token,
}: {
  test: TestWithState
  index: number
  token: string
}) {
  const isCompleted = test.state === 'completed'

  const inner = (
    <div
      className="flex items-center gap-4 px-5 py-4 rounded-xl border transition-all duration-200"
      style={{
        background: isCompleted ? 'oklch(0.97 0.015 145)' : 'white',
        borderColor: isCompleted ? 'oklch(0.84 0.05 145)' : '#d5d5d5',
        boxShadow: isCompleted
          ? 'none'
          : '0 1px 2px rgb(0 0 0 / 0.04)',
      }}
    >
      {/* Step indicator */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
        style={{
          background: isCompleted ? 'oklch(0.88 0.07 145)' : 'var(--brand)',
          color: isCompleted ? 'oklch(0.38 0.13 145)' : 'var(--cream)',
        }}
      >
        {isCompleted ? (
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        ) : (
          index + 1
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold leading-snug"
          style={{ color: isCompleted ? 'oklch(0.52 0.005 80)' : 'var(--brand)' }}
        >
          {test.name}
        </p>
        <p
          className="text-[11px] mt-0.5"
          style={{
            color: isCompleted ? 'oklch(0.50 0.10 145)' : 'oklch(0.50 0.005 80)',
          }}
        >
          {isCompleted ? 'Completada' : 'Disponible — haz clic para comenzar'}
        </p>
      </div>

      {/* Right indicator */}
      {isCompleted ? (
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: 'oklch(0.62 0.12 145)' }}
        />
      ) : (
        <span
          className="inline-flex items-center gap-1 text-sm font-semibold shrink-0"
          style={{ color: 'var(--brand)' }}
        >
          Comenzar
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </span>
      )}
    </div>
  )

  if (isCompleted) {
    return <li aria-disabled="true">{inner}</li>
  }

  return (
    <li>
      <Link href={`/eval/${token}/${test.id}`} className="block">
        {inner}
      </Link>
    </li>
  )
}

// ─── SuccessState ─────────────────────────────────────────────────────────────

function SuccessState({
  firstName,
  totalTests,
}: {
  firstName: string
  totalTests: number
}) {
  return (
    <div className="text-center space-y-10 py-12">
      {/* Icon */}
      <div
        className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
        style={{ background: 'oklch(0.20 0.06 268 / 0.07)' }}
      >
        <svg
          className="w-7 h-7"
          style={{ color: 'var(--gold)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      </div>

      {/* Message */}
      <div className="space-y-3">
        <p
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--gold)' }}
        >
          {totalTests} de {totalTests} completadas
        </p>
        <h1 className="text-3xl font-light" style={{ color: 'var(--navy)' }}>
          {firstName ? `¡Gracias, ${firstName}!` : '¡Evaluación completada!'}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
          Has completado todas tus pruebas satisfactoriamente. Tus resultados han
          sido registrados y serán revisados por el equipo evaluador.
        </p>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 max-w-[200px] mx-auto">
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--gold)' }}
        />
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      <p className="text-[11px] text-muted-foreground/50">
        Puede cerrar esta ventana.
      </p>
    </div>
  )
}

// ─── HubMessage ───────────────────────────────────────────────────────────────

function HubMessage({
  icon,
  title,
  message,
  variant = 'error',
}: {
  icon: string
  title: string
  message: string
  variant?: 'error' | 'success'
}) {
  const isSuccess = variant === 'success'
  return (
    <div className="text-center space-y-5 py-16">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mx-auto text-lg"
        style={{
          background: isSuccess
            ? 'oklch(0.20 0.06 268 / 0.07)'
            : 'oklch(0.58 0.22 27 / 0.08)',
          color: isSuccess ? 'var(--navy)' : 'oklch(0.58 0.22 27)',
        }}
      >
        {icon}
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-light text-navy">{title}</h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
          {message}
        </p>
      </div>
    </div>
  )
}
