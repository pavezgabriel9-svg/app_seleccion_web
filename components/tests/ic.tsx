'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { TestComponentProps, ICResultV2 } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

// ─── Datos hoistados (fuera del componente) ───────────────────────────────────

const TABLE_ROWS = [
  { cantidad: '300.000', clase: 'Incendios',  fecha: '02/01/1976' },
  { cantidad: '100.000', clase: 'Vida',        fecha: '22/10/1975' },
  { cantidad: '400.000', clase: 'Accidentes', fecha: '14/09/1975' },
  { cantidad: '200.000', clase: 'Vida',        fecha: '13/11/1976' },
  { cantidad: '400.000', clase: 'Incendios',  fecha: '17/05/1976' },
  { cantidad: '300.000', clase: 'Accidentes', fecha: '12/10/1975' },
  { cantidad: '500.000', clase: 'Vida',        fecha: '16/02/1976' },
  { cantidad: '100.000', clase: 'Incendios',  fecha: '03/08/1976' },
  { cantidad: '400.000', clase: 'Incendios',  fecha: '11/08/1976' },
  { cantidad: '200.000', clase: 'Accidentes', fecha: '21/05/1975' },
  { cantidad: '500.000', clase: 'Vida',        fecha: '09/03/1975' },
  { cantidad: '300.000', clase: 'Incendios',  fecha: '17/07/1976' },
  { cantidad: '100.000', clase: 'Accidentes', fecha: '04/06/1976' },
  { cantidad: '100.000', clase: 'Vida',        fecha: '23/11/1976' },
  { cantidad: '500.000', clase: 'Vida',        fecha: '18/04/1975' },
  { cantidad: '200.000', clase: 'Accidentes', fecha: '24/12/1976' },
  { cantidad: '500.000', clase: 'Accidentes', fecha: '19/04/1975' },
  { cantidad: '200.000', clase: 'Vida',        fecha: '07/12/1976' },
  { cantidad: '400.000', clase: 'Incendios',  fecha: '26/05/1975' },
  { cantidad: '300.000', clase: 'Accidentes', fecha: '06/01/1976' },
  { cantidad: '500.000', clase: 'Vida',        fecha: '29/03/1975' },
  { cantidad: '300.000', clase: 'Vida',        fecha: '28/06/1975' },
  { cantidad: '400.000', clase: 'Accidentes', fecha: '08/02/1976' },
  { cantidad: '100.000', clase: 'Incendios',  fecha: '27/07/1975' },
  { cantidad: '200.000', clase: 'Accidentes', fecha: '21/01/1976' },
] as const

// Columnas correctas por fila (1-indexed: 1, 2, 3)
const CORRECT_ANSWERS: readonly number[][] = [
  [1,3],[2],[1],[],[3],[1],[3],[],[],[1],
  [3],[],[2],[],[3],[],[],[],[1,3],[1,2],
  [3],[3],[1],[],[1,2],
]

const TIMER_SECONDS = 7 * 60

// Criterios de selección hoistados (datos estáticos, fuera del componente)
const CRITERIA_DATA = [
  {
    numero: 'I',
    tipos: 'Incendios o Accidentes',
    monto: '$150.000 – $400.000',
    fechas: '15/03/1975 – 10/05/1976',
  },
  {
    numero: 'II',
    tipos: 'Vida o Accidentes',
    monto: 'Hasta $300.000',
    fechas: '15/10/1975 – 20/08/1976',
  },
  {
    numero: 'III',
    tipos: 'Incendios o Vida',
    monto: '$200.000 – $500.000',
    fechas: '10/02/1975 – 15/06/1976',
  },
] as const

type Fase = 'instrucciones' | 'test' | 'resultado'
type SubmissionMode = 'manual' | 'timeout'

function createEmptyAnswers() {
  return TABLE_ROWS.map(() => [false, false, false])
}

// ─── Panel de criterios (componente estático, sin props, hoistado) ─────────────

function CriteriaCard() {
  return (
    <Card
      className="gap-0 py-0 shadow-none"
      style={{ background: 'oklch(0.97 0.005 80)', border: '1px solid oklch(0.90 0.005 80)' }}
    >
      <CardHeader className="px-4 pt-4 pb-3">
        <CardTitle
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'var(--navy)', fontFamily: 'var(--font-sans)', opacity: 0.6 }}
        >
          Criterios de selección
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-0">
        {CRITERIA_DATA.map((c, idx) => (
          <div key={c.numero}>
            {idx > 0 && (
              <Separator className="my-3" style={{ background: 'oklch(0.88 0.005 80)' }} />
            )}
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <span
                  className="mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0"
                  style={{ background: 'oklch(0.72 0.12 68 / 0.18)', color: 'var(--navy)' }}
                >
                  {c.numero}
                </span>
                <span
                  className="text-xs font-semibold leading-tight"
                  style={{ color: 'var(--navy)', fontFamily: 'var(--font-sans)' }}
                >
                  {c.tipos}
                </span>
              </div>
              <div className="pl-7 space-y-0.5">
                <p
                  className="text-[11px] leading-snug"
                  style={{ color: 'var(--navy)', opacity: 0.65, fontFamily: 'var(--font-sans)' }}
                >
                  <span className="font-semibold">Monto:</span> {c.monto}
                </p>
                <p
                  className="text-[11px] leading-snug"
                  style={{ color: 'var(--navy)', opacity: 0.65, fontFamily: 'var(--font-sans)' }}
                >
                  <span className="font-semibold">Fechas:</span> {c.fechas}
                </p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ICTest({ onComplete, isPending }: TestComponentProps) {
  const [fase, setFase]       = useState<Fase>('instrucciones')
  const [answers, setAnswers] = useState<boolean[][]>(createEmptyAnswers)
  const [timeLeft, setTimeLeft]         = useState(TIMER_SECONDS)
  const [timerStarted, setTimerStarted] = useState(false)
  const [submitted, setSubmitted]       = useState(false)

  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const resultRef = useRef<ICResultV2 | null>(null)
  const answersRef = useRef<boolean[][]>(createEmptyAnswers())
  const submittedRef = useRef(false)

  // Telemetría — sin re-renders
  const mountTimeRef            = useRef(Date.now())
  const firstInteractionTimeRef = useRef<number | null>(null)
  const tabSwitchCountRef       = useRef(0)
  const outOfFocusDurationRef   = useRef(0)
  const lastHiddenAtRef         = useRef<number | null>(null)

  function startTimer() {
    if (timerRef.current) return
    setTimerStarted(true)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => Math.max(t - 1, 0))
    }, 1000)
  }

  function toggleCheckbox(rowIdx: number, colIdx: number) {
    if (submitted) return
    if (firstInteractionTimeRef.current === null) {
      firstInteractionTimeRef.current = Date.now()
    }
    if (!timerStarted) startTimer()
    const next = answersRef.current.map(r => [...r])
    next[rowIdx][colIdx] = !next[rowIdx][colIdx]
    answersRef.current = next
    setAnswers(next)
  }

  const handleSubmit = useCallback((mode: SubmissionMode = 'manual') => {
    if (submittedRef.current) return
    submittedRef.current = true
    setSubmitted(true)
    if (timerRef.current) clearInterval(timerRef.current)

    let puntaje = 0, incorrectas = 0, omisiones = 0
    TABLE_ROWS.forEach((_, i) => {
      const correctCols = CORRECT_ANSWERS[i]
      const userCols    = answersRef.current[i]
      correctCols.forEach(col => {
        if (userCols[col - 1]) puntaje++
        else omisiones++
      })
      for (let c = 0; c < 3; c++) {
        if (userCols[c] && !correctCols.includes(c + 1)) incorrectas++
      }
    })

    const totalCorrectas = CORRECT_ANSWERS.reduce((sum, cols) => sum + cols.length, 0)
    let puntuacionAjustada = puntaje - incorrectas - omisiones * 0.2
    if (puntuacionAjustada < 0) puntuacionAjustada = 0
    const porcentaje = (puntuacionAjustada / totalCorrectas) * 100
    const nivelRendimiento =
      porcentaje >= 90 ? 'Resultado Sobresaliente' :
      porcentaje >= 70 ? 'Rendimiento alto' :
      porcentaje >= 40 ? 'Rendimiento esperado' : 'Bajo rendimiento'

    // Telemetría
    const now = Date.now()
    if (lastHiddenAtRef.current !== null) {
      outOfFocusDurationRef.current += Math.round((now - lastHiddenAtRef.current) / 1000)
      lastHiddenAtRef.current = null
    }

    resultRef.current = {
      respuestas: {
        puntaje,
        incorrectas,
        omisiones,
        puntuacionAjustada: parseFloat(puntuacionAjustada.toFixed(1)),
        nivelRendimiento,
      },
      metadata: {
        preparation_time: firstInteractionTimeRef.current
          ? Math.round((firstInteractionTimeRef.current - mountTimeRef.current) / 1000)
          : Math.round((now - mountTimeRef.current) / 1000),
        total_viewing_time: Math.round((now - mountTimeRef.current) / 1000),
        tab_switch_count: tabSwitchCountRef.current,
        out_of_focus_duration: outOfFocusDurationRef.current,
      },
    }

    setFase('resultado')
    if (mode === 'timeout') onComplete(resultRef.current)
  }, [onComplete])

  useEffect(() => {
    if (!timerStarted || timeLeft !== 0 || submittedRef.current) return
    handleSubmit('timeout')
  }, [handleSubmit, timeLeft, timerStarted])

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  // Monitoreo de integridad — Page Visibility API
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        tabSwitchCountRef.current++
        lastHiddenAtRef.current = Date.now()
      } else {
        if (lastHiddenAtRef.current !== null) {
          outOfFocusDurationRef.current += Math.round((Date.now() - lastHiddenAtRef.current) / 1000)
          lastHiddenAtRef.current = null
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const mins = Math.floor(timeLeft / 60)
  const secs = (timeLeft % 60).toString().padStart(2, '0')

  // ── Instrucciones ──────────────────────────────────────────────────────────
  if (fase === 'instrucciones') {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl border p-6 md:p-8 space-y-8"
        style={{ borderColor: 'oklch(0.92 0.005 80)' }}>
        <div className="space-y-4">
          <h2 className="text-2xl font-light" style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}>
            Instrucciones Complejas (IC)
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>La siguiente prueba evalúa tu capacidad para seguir instrucciones.</p>
            <div className="rounded-xl p-5 space-y-3" style={{ background: 'oklch(0.96 0.005 80)', fontSize: '0.8rem' }}>
              <p><strong className="text-foreground">Criterio I:</strong> Seleccione la columna 1 a la altura de cada seguro de <em>incendios o accidentes</em>, cuyo monto esté entre $150.000–$400.000, contratado entre el 15/03/1975 y el 10/05/1976.</p>
              <p><strong className="text-foreground">Criterio II:</strong> Seleccione la columna 2 a la altura de cada seguro de <em>vida o accidentes</em>, hasta $300.000, contratado entre el 15/10/1975 y el 20/08/1976.</p>
              <p><strong className="text-foreground">Criterio III:</strong> Seleccione la columna 3 a la altura de cada seguro de <em>incendios o vida</em>, cuyo monto esté entre $200.000–$500.000, contratado entre el 10/02/1975 y el 15/06/1976.</p>
            </div>
            <ul className="space-y-1 list-disc list-inside text-xs">
              <li>Marca la casilla en la columna correspondiente (1, 2 y/o 3) según aplique.</li>
              <li>Si una fila no cumple ningún criterio, no marques nada.</li>
              <li>El cronómetro de <strong className="text-foreground">7 minutos</strong> comenzará al marcar la primera casilla.</li>
              <li>Al terminar, presiona el botón <strong className="text-foreground">&ldquo;Finalizar prueba&rdquo;</strong>.</li>
            </ul>
          </div>
        </div>
        <button onClick={() => setFase('test')}
          className="px-8 py-3 rounded-lg text-sm font-medium"
          style={{ background: 'var(--navy)', color: 'var(--cream)' }}>
          Entendido — ver tabla →
        </button>
      </div>
    )
  }

  // ── Resultado ──────────────────────────────────────────────────────────────
  if (fase === 'resultado') {
    const r = resultRef.current!
    return (
      <div className="max-w-xl mx-auto bg-white rounded-2xl border p-6 md:p-8 space-y-8"
        style={{ borderColor: 'oklch(0.92 0.005 80)' }}>
        <div className="space-y-4">
          <h2 className="text-2xl font-light" style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}>
            ¡Bien hecho!
          </h2>
          <p className="text-sm text-muted-foreground">
            Has completado esta etapa de la evaluación.
          </p>
        </div>
        <button onClick={() => onComplete(r)} disabled={isPending}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-medium disabled:opacity-60"
          style={{ background: 'var(--navy)', color: 'var(--cream)' }}>
          {isPending
            ? <><span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />Guardando...</>
            : 'Continuar →'}
        </button>
      </div>
    )
  }

  // ── Test — layout dos columnas ────────────────────────────────────────────
  return (
    <div
      className="max-w-6xl mx-auto bg-white rounded-2xl border p-6 md:p-8"
      style={{ borderColor: 'oklch(0.92 0.005 80)' }}
    >
      {/* ── Header sticky ─────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between sticky top-0 z-10 py-2 px-1 mb-5"
        style={{ background: 'white' }}
      >
        <span className="text-sm font-medium" style={{ color: 'var(--navy)' }}>
          IC — Instrucciones Complejas
        </span>
        <div className="flex items-center gap-3">
          {timerStarted && (
            <span
              className="font-mono text-sm font-medium"
              style={{ color: timeLeft < 60 ? '#CC2200' : 'var(--navy)' }}
            >
              {mins}:{secs}
            </span>
          )}
          {!timerStarted && (
            <span className="text-xs text-muted-foreground">Cronómetro inicia al marcar</span>
          )}
          <button
            onClick={() => handleSubmit()}
            disabled={submitted}
            className="px-4 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
            style={{ background: 'var(--navy)', color: 'var(--cream)' }}
          >
            Finalizar prueba
          </button>
        </div>
      </div>

      {/* ── Grid dos columnas ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5 items-start">

        {/* Columna izquierda: criterios */}
        <div>
          {/* Mobile: acordeón <details> nativo, colapsado por defecto */}
          <details className="md:hidden group">
            <summary
              className="flex items-center justify-between cursor-pointer select-none list-none px-4 py-2.5 rounded-lg text-xs font-medium"
              style={{
                background: 'oklch(0.97 0.005 80)',
                color: 'var(--navy)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <span>Ver criterios de selección</span>
              <svg
                className="w-3.5 h-3.5 transition-transform duration-200 group-open:rotate-180"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="mt-2">
              <CriteriaCard />
            </div>
          </details>

          {/* Desktop: panel sticky que se mantiene visible al hacer scroll */}
          <div className="hidden md:block sticky top-6">
            <CriteriaCard />
          </div>
        </div>

        {/* Columna derecha: tabla interactiva */}
        <div className="space-y-4 pb-12">
          <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid oklch(0.90 0.005 80)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'oklch(0.96 0.005 80)' }}>
                  {['#', 'Cantidad', 'Clase', 'Fecha', 'Col. 1', 'Col. 2', 'Col. 3'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground first:w-8">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((row, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: 'oklch(0.92 0.005 80)' }}>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 text-xs tabular-nums">{row.cantidad}</td>
                    <td className="px-3 py-2 text-xs">{row.clase}</td>
                    <td className="px-3 py-2 text-xs tabular-nums">{row.fecha}</td>
                    {[0, 1, 2].map(col => (
                      <td key={col} className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={answers[i][col]}
                          onChange={() => toggleCheckbox(i, col)}
                          disabled={submitted}
                          className="w-4 h-4 rounded"
                          style={{ accentColor: 'var(--navy)', cursor: submitted ? 'default' : 'pointer' }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => handleSubmit()}
              disabled={submitted}
              className="px-8 py-3 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: 'var(--navy)', color: 'var(--cream)' }}
            >
              Finalizar prueba
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
