'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { TestComponentProps, StroopResult } from '@/types/database'

// ─── Constantes hoistadas (js-hoist-regexp equivalent) ────────────────────────

const COLORS = [
  { id: 'rojo',     name: 'ROJO',     bg: '#CC2200', fg: 'white' },
  { id: 'azul',     name: 'AZUL',     bg: '#003580', fg: 'white' },
  { id: 'verde',    name: 'VERDE',    bg: '#1A6B30', fg: 'white' },
  { id: 'amarillo', name: 'AMARILLO', bg: '#CC9900', fg: 'white' },
] as const

type ColorItem = typeof COLORS[number]
type Fase = 'instrucciones' | 'practica' | 'real' | 'resultado'

const PRACTICE_TIME = 10
const REAL_TIME = 30

// ─── Helpers hoistados ────────────────────────────────────────────────────────

function pickRandom(last: ColorItem | null): ColorItem {
  let item: ColorItem
  do { item = COLORS[Math.floor(Math.random() * COLORS.length)] }
  while (item === last)
  return item
}

// ─── Sub-componente: juego Stroop ─────────────────────────────────────────────

interface GameProps {
  timeLimit: number
  onEnd: (score: number, total: number, errors: number, elapsed: number) => void
  isPractice?: boolean
}

function StroopGame({ timeLimit, onEnd, isPractice = false }: GameProps) {
  const [word, setWord]       = useState<ColorItem>(() => pickRandom(null))
  const [ink, setInk]         = useState<ColorItem>(() => pickRandom(null))
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [score, setScore]     = useState(0)
  const [total, setTotal]     = useState(0)
  const [errors, setErrors]   = useState(0)
  const [done, setDone]       = useState(false)

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedRef  = useRef(false)
  const startTimeRef = useRef<number>(0)
  const scoreRef    = useRef(0)
  const totalRef    = useRef(0)
  const errorsRef   = useRef(0)
  const lastWordRef = useRef<ColorItem | null>(null)
  const lastInkRef  = useRef<ColorItem | null>(null)

  const nextStimulus = useCallback(() => {
    const newWord = pickRandom(lastWordRef.current)
    const newInk  = pickRandom(lastInkRef.current)
    lastWordRef.current = newWord
    lastInkRef.current  = newInk
    setWord(newWord)
    setInk(newInk)
  }, [])

  const endGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setDone(true)
    const elapsed = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : timeLimit
    onEnd(scoreRef.current, totalRef.current, errorsRef.current, elapsed)
  }, [onEnd, timeLimit])

  function startTimer() {
    if (startedRef.current) return
    startedRef.current = true
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { endGame(); return 0 }
        return t - 1
      })
    }, 1000)
  }

  function handleClick(color: ColorItem) {
    if (done) return
    startTimer()
    totalRef.current++
    // Faithful to original: correct = clicked button name matches the displayed WORD name
    if (color.name === word.name) {
      scoreRef.current++
      setScore(s => s + 1)
    } else {
      errorsRef.current++
      setErrors(e => e + 1)
    }
    setTotal(t => t + 1)
    nextStimulus()
  }

  useEffect(() => {
    nextStimulus()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [nextStimulus])

  const pct = (timeLeft / timeLimit) * 100

  return (
    <div className="space-y-6">
      {isPractice && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
          style={{ background: 'rgb(216 31 15 / 0.12)', color: 'var(--gold)' }}>
          PRÁCTICA — {timeLimit}s
        </div>
      )}

      {/* Timer */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{timeLeft}s restantes</span>
          <span>Aciertos <strong style={{ color: 'var(--navy)' }}>{score}</strong> · Errores <strong style={{ color: '#CC2200' }}>{errors}</strong></span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'oklch(0.88 0.01 80)' }}>
          <div className="h-full rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${pct}%`, background: timeLeft <= 5 ? '#8e0b24' : 'var(--brand)' }} />
        </div>
      </div>

      {/* Estímulo */}
      <div className="flex items-center justify-center py-10">
        <span className="select-none font-bold tracking-widest"
          style={{ fontSize: '4rem', color: ink.bg, fontFamily: 'var(--font-fraunces, serif)' }}>
          {word.name}
        </span>
      </div>

      {/* Botones de color */}
      <div className="grid grid-cols-2 gap-3">
        {COLORS.map(c => (
          <button key={c.id} onClick={() => handleClick(c)} disabled={done}
            className="py-5 rounded-xl font-bold text-sm tracking-widest transition-all duration-100 active:scale-95 disabled:opacity-40"
            style={{ background: c.bg, color: c.fg }}>
            {c.name}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function StroopTest({ onComplete, isPending, hasPractice }: TestComponentProps) {
  const [fase, setFase] = useState<Fase>('instrucciones')
  const resultsRef = useRef<{ score: number; total: number; errors: number; tiempoTotal: number } | null>(null)

  function handlePracticeEnd() {
    setFase('real')
  }

  function handleRealEnd(score: number, total: number, errors: number, elapsed: number) {
    resultsRef.current = { score, total, errors, tiempoTotal: elapsed }
    setFase('resultado')
  }

  function handleComplete() {
    const r = resultsRef.current
    if (!r) return
    const result: StroopResult = {
      score: r.score,
      total: r.total,
      errors: r.errors,
      tiempoTotal: r.tiempoTotal,
    }
    onComplete(result)
  }

  // ── Instrucciones ──────────────────────────────────────────────────────────
  if (fase === 'instrucciones') {
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-light" style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}>
            Prueba Stroop
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>Aparecerá una <strong className="text-foreground">palabra de color</strong> en pantalla, escrita con una tinta que puede ser de un color diferente.</p>
            <p>Tu tarea es presionar el botón que <strong className="text-foreground">coincida con la palabra</strong> mostrada en pantalla, sin importar el color de la tinta.</p>
            <div className="rounded-xl p-4 space-y-2" style={{ background: 'oklch(0.96 0.005 80)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--navy)' }}>Ejemplo</p>
              <p className="text-xs">Si ves <span className="font-bold" style={{ color: '#1A6B30' }}>ROJO</span> (la palabra "ROJO" en tinta verde), debes presionar el botón <strong>ROJO</strong>.</p>
            </div>
            <p>El cronómetro comenzará con tu primer clic. Responde lo más rápido posible.</p>
          </div>
        </div>
        <button
          onClick={() => setFase(hasPractice ? 'practica' : 'real')}
          className="px-8 py-3 rounded-lg text-sm font-medium"
          style={{ background: 'var(--brand)', color: 'white' }}>
          {hasPractice ? 'Comenzar práctica →' : 'Comenzar →'}
        </button>
      </div>
    )
  }

  // ── Práctica ───────────────────────────────────────────────────────────────
  if (fase === 'practica') {
    return (
      <div className="space-y-6">
        <StroopGame key="practica" timeLimit={PRACTICE_TIME} isPractice onEnd={handlePracticeEnd} />
        <p className="text-center text-xs text-muted-foreground">
          La práctica termina automáticamente. Luego comenzará el test real de {REAL_TIME} segundos.
        </p>
      </div>
    )
  }

  // ── Resultado ──────────────────────────────────────────────────────────────
  if (fase === 'resultado') {
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-light" style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}>
            ¡Bien hecho!
          </h2>
          <p className="text-sm text-muted-foreground">
            Has completado esta etapa de la evaluación.
          </p>
        </div>
        <button onClick={handleComplete} disabled={isPending}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-medium disabled:opacity-60"
          style={{ background: 'var(--brand)', color: 'white' }}>
          {isPending
            ? <><span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />Guardando...</>
            : 'Continuar →'}
        </button>
      </div>
    )
  }

  // ── Real ────────────────────────────────────────────────────────────────────
  return (
    <StroopGame key="real" timeLimit={REAL_TIME} onEnd={handleRealEnd} />
  )
}
