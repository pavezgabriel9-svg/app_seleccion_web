'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type {
  TestComponentProps,
  CognitivoItem,
  CognitivoRespuesta,
  CognitivoResult,
  CognitivoRespuestaValor,
} from '@/types/database'
import itemsData from '@/lib/cognitivo/data/items.json' with { type: 'json' }
import practicaData from '@/lib/cognitivo/data/practica.json' with { type: 'json' }
import { scoreCognitivo } from '@/lib/cognitivo/score'
import { PreguntaMultiple } from './cognitivo/pregunta-multiple'
import { PreguntaSiNo } from './cognitivo/pregunta-si-no'
import { PreguntaNumerica } from './cognitivo/pregunta-numerica'
import { PreguntaTexto } from './cognitivo/pregunta-texto'
import { PreguntaSilogismo } from './cognitivo/pregunta-silogismo'
import { PreguntaVisual } from './cognitivo/pregunta-visual'

const ITEMS = itemsData as CognitivoItem[]
const PRACTICA = practicaData as CognitivoItem[]
const TIMER_SECONDS = 12 * 60

type Fase = 'instrucciones' | 'practica' | 'test' | 'resultado'

// ─── Dispatcher por tipo de pregunta ───────────────────────────────────────

function ItemRenderer({
  item, value, onChange, locked, showCorrect,
}: {
  item: CognitivoItem
  value: CognitivoRespuestaValor
  onChange: (v: CognitivoRespuestaValor) => void
  locked: boolean
  showCorrect: boolean
}) {
  switch (item.tipo) {
    case 'multiple_5':
    case 'multiple_3':
      return (
        <PreguntaMultiple
          item={item}
          value={typeof value === 'number' ? value : null}
          onChange={onChange}
          disabled={locked}
          showCorrect={showCorrect}
        />
      )
    case 'si_no':
      return (
        <PreguntaSiNo
          item={item}
          value={value === 'SI' || value === 'NO' ? value : null}
          onChange={onChange}
          disabled={locked}
          showCorrect={showCorrect}
        />
      )
    case 'numerica':
      return (
        <PreguntaNumerica
          item={item}
          value={value === null ? null : String(value)}
          onChange={onChange}
          disabled={locked}
          showCorrect={showCorrect}
        />
      )
    case 'texto_corto':
      return (
        <PreguntaTexto
          item={item}
          value={value === null ? null : String(value)}
          onChange={onChange}
          disabled={locked}
          showCorrect={showCorrect}
        />
      )
    case 'silogismo': {
      const v = value === 'verdadero' || value === 'falso' || value === 'dudoso' ? value : null
      return (
        <PreguntaSilogismo
          item={item}
          value={v}
          onChange={onChange}
          disabled={locked}
          showCorrect={showCorrect}
        />
      )
    }
    case 'visual':
      return (
        <PreguntaVisual
          item={item}
          value={value === null ? null : value}
          onChange={onChange}
          disabled={locked}
          showCorrect={showCorrect}
        />
      )
  }
}

// ─── Componente principal ──────────────────────────────────────────────────

export default function CognitivoTest({ onComplete, isPending }: TestComponentProps) {
  const [fase, setFase] = useState<Fase>('instrucciones')

  const [practicaIdx, setPracticaIdx] = useState(0)
  const [practicaResp, setPracticaResp] = useState<CognitivoRespuestaValor[]>(
    () => PRACTICA.map(() => null)
  )
  const [practicaConfirmed, setPracticaConfirmed] = useState<boolean[]>(
    () => PRACTICA.map(() => false)
  )

  const [testIdx, setTestIdx] = useState(0)
  const [testResp, setTestResp] = useState<CognitivoRespuestaValor[]>(
    () => ITEMS.map(() => null)
  )
  const testRespRef = useRef(testResp)
  useEffect(() => { testRespRef.current = testResp }, [testResp])

  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS)

  const resultRef = useRef<CognitivoResult | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Telemetría
  const mountTimeRef = useRef(Date.now())
  const tabSwitchCountRef = useRef(0)
  const outOfFocusDurationRef = useRef(0)
  const lastHiddenAtRef = useRef<number | null>(null)

  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        tabSwitchCountRef.current++
        lastHiddenAtRef.current = Date.now()
      } else if (lastHiddenAtRef.current !== null) {
        outOfFocusDurationRef.current += Math.round((Date.now() - lastHiddenAtRef.current) / 1000)
        lastHiddenAtRef.current = null
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const finalizar = useCallback((timeOut: boolean) => {
    if (timerRef.current) clearInterval(timerRef.current)
    const now = Date.now()
    if (lastHiddenAtRef.current !== null) {
      outOfFocusDurationRef.current += Math.round((now - lastHiddenAtRef.current) / 1000)
      lastHiddenAtRef.current = null
    }
    const currentResp = testRespRef.current
    const respuestas: CognitivoRespuesta[] = ITEMS.map((it, i) => ({
      item: it.id,
      respuesta: currentResp[i],
    }))
    const itemsSinResponder = respuestas.filter(
      r => r.respuesta === null || r.respuesta === ''
    ).length

    resultRef.current = {
      respuestas,
      resultado: scoreCognitivo(respuestas),
      metadata: {
        duracion_total_s: Math.round((now - mountTimeRef.current) / 1000),
        tiempo_agotado: timeOut,
        items_sin_responder: itemsSinResponder,
        tab_switch_count: tabSwitchCountRef.current,
        out_of_focus_duration: outOfFocusDurationRef.current,
      },
      version: '1.0',
    }
    setFase('resultado')
  }, [])

  function startTimer() {
    if (timerRef.current) return
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          finalizar(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  function empezarTest() {
    setFase('test')
    startTimer()
  }

  function avanzarTest() {
    if (testIdx >= ITEMS.length - 1) {
      finalizar(false)
    } else {
      setTestIdx(i => i + 1)
    }
  }

  function confirmarPractica() {
    setPracticaConfirmed(p => {
      const next = [...p]
      next[practicaIdx] = true
      return next
    })
  }

  function siguientePractica() {
    if (practicaIdx >= PRACTICA.length - 1) empezarTest()
    else setPracticaIdx(i => i + 1)
  }

  // ── FASE INSTRUCCIONES ────────────────────────────────────────────────
  if (fase === 'instrucciones') {
    return (
      <div className="space-y-7">
        <div className="space-y-4">
          <h2
            className="text-2xl font-light"
            style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)', letterSpacing: '-0.02em' }}
          >
            Test de Capacidad Cognitiva
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Este test mide tu capacidad para resolver problemas. Contiene 50 preguntas de
              distintos tipos: vocabulario, matemáticas, lógica, atención al detalle y
              razonamiento espacial.
            </p>
            <p>
              Tendrás <strong style={{ color: 'var(--navy)' }}>12 minutos</strong> para
              responder lo más que puedas. Es poco probable que alcances a contestar las 50:
              lo importante es <strong style={{ color: 'var(--navy)' }}>acertar la mayor
              cantidad posible</strong>, no apurarte.
            </p>
          </div>
        </div>

        <div className="rounded-xl p-5 space-y-2" style={{ background: 'oklch(0.96 0.005 80)' }}>
          {[
            'Las preguntas son progresivamente más difíciles.',
            'Una vez que avances, no podrás volver atrás.',
            'Si no estás seguro, puedes saltarte una pregunta (cuenta como no respondida).',
            'Antes del test hay 3 preguntas de práctica para que conozcas los tipos.',
          ].map(t => (
            <div key={t} className="flex items-start gap-2.5">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--gold)' }} />
              <span className="text-[13px]" style={{ color: 'var(--navy)', opacity: 0.8 }}>{t}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => setFase('practica')}
          className="px-8 py-3 rounded-lg text-sm font-medium"
          style={{ background: 'var(--navy)', color: 'var(--cream)' }}
        >
          Empezar práctica →
        </button>
      </div>
    )
  }

  // ── FASE PRÁCTICA ──────────────────────────────────────────────────────
  if (fase === 'practica') {
    const item = PRACTICA[practicaIdx]
    const value = practicaResp[practicaIdx]
    const confirmed = practicaConfirmed[practicaIdx]
    const esUltima = practicaIdx === PRACTICA.length - 1
    const tieneResp = value !== null && value !== ''

    const setValue = (v: CognitivoRespuestaValor) => {
      if (confirmed) return
      setPracticaResp(p => {
        const next = [...p]
        next[practicaIdx] = v
        return next
      })
    }

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>
            Práctica · Ejemplo {item.letra}
          </span>
          <span className="text-xs text-muted-foreground">
            {practicaIdx + 1} / {PRACTICA.length}
          </span>
        </div>

        <p
          className="text-base leading-relaxed"
          style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}
        >
          {item.enunciado}
        </p>

        <ItemRenderer item={item} value={value} onChange={setValue} locked={confirmed} showCorrect={confirmed} />

        {confirmed && item.explicacion && (
          <div
            className="rounded-xl px-4 py-3"
            style={{ background: 'oklch(0.82 0.10 145 / 0.10)', borderLeft: '3px solid oklch(0.50 0.14 145)' }}
          >
            <p className="text-xs leading-relaxed" style={{ color: 'var(--navy)' }}>
              {item.explicacion}
            </p>
          </div>
        )}

        <div className="flex justify-end pt-2">
          {!confirmed ? (
            <button
              onClick={confirmarPractica}
              disabled={!tieneResp}
              className="px-8 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40"
              style={{ background: 'var(--navy)', color: 'var(--cream)' }}
            >
              Confirmar
            </button>
          ) : (
            <button
              onClick={siguientePractica}
              className="px-8 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: 'var(--navy)', color: 'var(--cream)' }}
            >
              {esUltima ? 'Empezar el test →' : 'Siguiente →'}
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── FASE TEST ──────────────────────────────────────────────────────────
  if (fase === 'test') {
    const item = ITEMS[testIdx]
    const value = testResp[testIdx]
    const esUltima = testIdx === ITEMS.length - 1

    const setValue = (v: CognitivoRespuestaValor) => {
      setTestResp(p => {
        const next = [...p]
        next[testIdx] = v
        return next
      })
    }

    const pct = timeLeft / TIMER_SECONDS
    const color = pct <= 0.10 ? '#CC2200' : pct <= 0.30 ? 'var(--gold)' : 'var(--navy)'
    const mins = Math.floor(timeLeft / 60)
    const secs = (timeLeft % 60).toString().padStart(2, '0')

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: 'var(--navy)' }}>
            Pregunta {testIdx + 1} de {ITEMS.length}
          </span>
          <span
            className="font-mono text-sm font-semibold"
            style={{ color, transition: 'color 0.4s ease' }}
          >
            {mins}:{secs}
          </span>
        </div>

        <div
          className="h-1 rounded-full overflow-hidden"
          style={{ background: 'oklch(0.92 0.005 80)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${((testIdx + 1) / ITEMS.length) * 100}%`,
              background: 'var(--navy)',
            }}
          />
        </div>

        <p
          className="text-base leading-relaxed pt-2"
          style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}
        >
          {item.enunciado}
        </p>

        <ItemRenderer item={item} value={value} onChange={setValue} locked={false} showCorrect={false} />

        <div className="flex justify-end pt-2">
          <button
            onClick={avanzarTest}
            className="px-8 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--navy)', color: 'var(--cream)' }}
          >
            {esUltima ? 'Finalizar' : 'Siguiente →'}
          </button>
        </div>
      </div>
    )
  }

  // ── FASE RESULTADO ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center text-center space-y-6 py-4">
      <div
        className="rounded-full flex items-center justify-center text-xl"
        style={{
          width: '52px',
          height: '52px',
          background: 'oklch(0.82 0.10 145 / 0.14)',
          border: '1.5px solid oklch(0.65 0.14 145 / 0.28)',
          color: 'oklch(0.50 0.14 145)',
        }}
      >
        ✓
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-light" style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}>
          ¡Bien hecho!
        </h2>
        <p className="text-sm text-muted-foreground">
          Has completado esta etapa de la evaluación.
        </p>
      </div>
      <button
        onClick={() => onComplete(resultRef.current!)}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-medium disabled:opacity-60"
        style={{ background: 'var(--navy)', color: 'var(--cream)' }}
      >
        {isPending ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Guardando...
          </>
        ) : (
          'Continuar →'
        )}
      </button>
    </div>
  )
}
