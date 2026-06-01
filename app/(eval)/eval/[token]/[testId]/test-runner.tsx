'use client'

import dynamic from 'next/dynamic'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { completeTestAction } from '../../actions'
import type { TestResultData, TestComponentProps, TestSnapshot } from '@/types/database'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  sessionId: string
  token: string
  testId: string
  testName: string
  testPath: string
  hasPractice: boolean
  completedTestIds: string[]
  totalTests: number
  candidateName?: string
  testsSnapshot: TestSnapshot[]
}

interface HanoiTestProps extends TestComponentProps {
  variant: 'medio' | 'dificil'
  candidateName?: string
}

// ─── Dynamic imports — bundle-dynamic-imports: solo carga el test activo ──────

const StroopTest  = dynamic<TestComponentProps>(() => import('@/components/tests/stroop'))
const LuscherTest = dynamic<TestComponentProps>(() => import('@/components/tests/luscher'))
const MemoriaTest = dynamic<TestComponentProps>(() => import('@/components/tests/memoria'))
const ICTest        = dynamic<TestComponentProps>(() => import('@/components/tests/ic'))
const DISCTest      = dynamic<TestComponentProps>(() => import('@/components/tests/disc'))
const ZAVICTest     = dynamic<TestComponentProps>(() => import('@/components/tests/zavic'))
const CognitivoTest = dynamic<TestComponentProps>(() => import('@/components/tests/cognitivo'))
const HanoiTest     = dynamic<HanoiTestProps>(() => import('@/components/tests/hanoi'))

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useTestNavigation(sessionId: string, testId: string, token: string) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function completeTest(results: TestResultData) {
    startTransition(async () => {
      const result = await completeTestAction(sessionId, testId, token, results)
      router.push(result.redirect)
    })
  }

  return { completeTest, isPending }
}

// ─── Test resolver (por path del snapshot) ────────────────────────────────────

function resolveTestComponent(
  testPath: string,
  hasPractice: boolean,
  baseProps: Omit<TestComponentProps, 'hasPractice'>,
  testName: string,
  candidateName?: string,
): React.ReactNode {
  const path = testPath.toLowerCase()
  const fullProps: TestComponentProps = { ...baseProps, hasPractice }

  if (path.includes('stroop'))        return <StroopTest  {...fullProps} />
  if (path.includes('luscher'))       return <LuscherTest {...fullProps} />
  if (path.includes('memoria'))       return <MemoriaTest {...fullProps} />
  if (path.includes('hanoi-dificil')) return <HanoiTest   {...fullProps} variant="dificil" candidateName={candidateName} />
  if (path.includes('hanoi'))         return <HanoiTest   {...fullProps} variant="medio"   candidateName={candidateName} />
  if (path.includes('disc'))          return <DISCTest    {...fullProps} />
  if (path.includes('zavic'))         return <ZAVICTest   {...fullProps} />
  if (path.includes('tcg'))           return <CognitivoTest {...fullProps} />
  if (path.includes('ic'))            return <ICTest      {...fullProps} />

  // Fallback
  return (
    <div className="text-center space-y-8 py-10">
      <h2 className="text-2xl font-light" style={{ color: 'var(--navy)' }}>{testName}</h2>
      <p className="text-sm text-muted-foreground">Esta prueba estará disponible próximamente.</p>
      <button
        onClick={() => baseProps.onComplete({})}
        disabled={baseProps.isPending}
        className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-medium disabled:opacity-60"
        style={{ background: 'var(--navy)', color: 'var(--cream)' }}
      >
        {baseProps.isPending
          ? <><span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />Guardando...</>
          : 'Continuar →'}
      </button>
    </div>
  )
}

// ─── TestProgressPanel ────────────────────────────────────────────────────────

function TestProgressPanel({
  tests,
  completedTestIds,
  activeTestId,
}: {
  tests: TestSnapshot[]
  completedTestIds: string[]
  activeTestId: string
}) {
  if (!tests.length) return null
  const completedSet = new Set(completedTestIds)

  return (
    <nav aria-label="Progreso de evaluación">
      <ol className="flex items-start w-full">
        {tests.map((test, idx) => {
          const isCompleted = completedSet.has(test.id)
          const isActive = test.id === activeTestId
          const isLast = idx === tests.length - 1

          return (
            <li key={test.id} className={cn('flex items-start', !isLast && 'flex-1')}>
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                {/* Step circle */}
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500"
                  style={{
                    background: isCompleted
                      ? 'oklch(0.93 0.05 145)'
                      : isActive
                      ? 'var(--navy)'
                      : 'oklch(0.93 0.004 80)',
                    color: isCompleted
                      ? 'oklch(0.42 0.13 145)'
                      : isActive
                      ? 'var(--cream)'
                      : 'oklch(0.68 0.004 80)',
                    boxShadow: isActive
                      ? '0 0 0 2px white, 0 0 0 3.5px var(--gold)'
                      : 'none',
                  }}
                >
                  {isCompleted ? (
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                {/* Test name */}
                <span
                  className="text-[9px] leading-tight text-center max-w-[56px] truncate"
                  style={{
                    color: isCompleted
                      ? 'oklch(0.72 0.004 80)'
                      : isActive
                      ? 'var(--navy)'
                      : 'oklch(0.75 0.004 80)',
                    fontWeight: isActive ? 600 : 400,
                  }}
                  title={test.name}
                >
                  {test.name}
                </span>
              </div>

              {/* Connector line — gray always, since order is free */}
              {!isLast && (
                <div
                  className="flex-1 h-px mx-1.5"
                  style={{ marginTop: '12px', background: 'oklch(0.90 0.004 80)' }}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// ─── TestRunner (orchestrator) ────────────────────────────────────────────────

export function TestRunner({
  sessionId, token, testId, testName, testPath,
  hasPractice, completedTestIds, totalTests, candidateName, testsSnapshot,
}: Props) {
  const { completeTest, isPending } = useTestNavigation(sessionId, testId, token)
  const completedCount = completedTestIds.length

  // IC provee su propio contenedor wide; el resto usa la card estrecha estándar.
  // Comparación exacta: 'zavic' / 'disc' también contienen 'ic' como subcadena.
  const isICTest = testPath.toLowerCase() === 'ic'
  const testContent = resolveTestComponent(
    testPath, hasPractice,
    { onComplete: completeTest, isPending },
    testName, candidateName,
  )

  return (
    <div className="space-y-6">
      {/* Breadcrumb + progreso — siempre estrecho y centrado */}
      <div className="max-w-xl mx-auto space-y-6">
        <Link
          href={`/eval/${token}/hub`}
          className="inline-flex items-center gap-1.5 transition-colors duration-200"
          style={{ color: 'oklch(0.62 0.005 80)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--navy)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'oklch(0.62 0.005 80)')}
        >
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          <span className="text-[11px]">Menú de evaluaciones</span>
        </Link>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            {candidateName && (
              <span className="text-xs text-muted-foreground">{candidateName}</span>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {completedCount} / {totalTests}
            </span>
          </div>
          <TestProgressPanel
            tests={testsSnapshot}
            completedTestIds={completedTestIds}
            activeTestId={testId}
          />
        </div>
      </div>

      {/* Test content */}
      {isICTest ? (
        // IC maneja su propio layout wide (max-w-6xl card)
        testContent
      ) : (
        <div
          className="max-w-xl mx-auto rounded-2xl border p-8"
          style={{ background: 'white', borderColor: 'oklch(0.92 0.005 80)' }}
        >
          {testContent}
        </div>
      )}
    </div>
  )
}
