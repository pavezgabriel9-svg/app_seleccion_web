'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { TestComponentProps, MemoriaResult } from '@/types/database'

// ─── Constantes hoistadas ─────────────────────────────────────────────────────

const REAL_PAIRS  = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const PRAC_PAIRS  = [1, 2, 3]

type Fase = 'instrucciones' | 'practica' | 'practica_done' | 'real' | 'resultado'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr, ...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Sub-componente: tablero de memoria ──────────────────────────────────────

interface BoardProps {
  pairs: number[]
  isPractice: boolean
  onComplete: (intentos: number, tiempo: number, errores: number) => void
}

function MemoriaBoard({ pairs, isPractice, onComplete }: BoardProps) {
  const [cards]            = useState<{ id: string; value: number }[]>(() =>
    shuffle(pairs).map((v, i) => ({ id: `${i}-${v}`, value: v }))
  )
  const [flipped, setFlipped]   = useState<string[]>([])
  const [matched, setMatched]   = useState<string[]>([])
  const [blocked, setBlocked]   = useState(false)
  const [elapsed, setElapsed]   = useState(0)

  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedRef   = useRef(false)
  const intentosRef  = useRef(0)
  const erroresRef   = useRef(0)
  const matchedRef   = useRef(0)

  function startTimer() {
    if (startedRef.current) return
    startedRef.current = true
    const start = Date.now()
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 1000)
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const handleFlip = useCallback((card: { id: string; value: number }) => {
    if (blocked || matched.includes(card.id) || flipped.includes(card.id)) return
    startTimer()

    const newFlipped = [...flipped, card.id]
    setFlipped(newFlipped)

    if (newFlipped.length === 2) {
      setBlocked(true)
      intentosRef.current++

      const [a, b] = newFlipped.map(id => cards.find(c => c.id === id)!)
      if (a.value === b.value) {
        const newMatched = [...matched, a.id, b.id]
        setMatched(newMatched)
        setFlipped([])
        setBlocked(false)
        matchedRef.current++

        if (newMatched.length === cards.length) {
          if (timerRef.current) clearInterval(timerRef.current)
          const finalTime = Math.floor((Date.now() - (startedRef.current ? 0 : Date.now())) / 1000)
          setTimeout(() => onComplete(intentosRef.current, elapsed + 1, erroresRef.current), 400)
        }
      } else {
        erroresRef.current++
        setTimeout(() => {
          setFlipped([])
          setBlocked(false)
        }, 900)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked, matched, flipped, cards])

  const cols = isPractice ? 3 : 5

  return (
    <div className="space-y-4">
      {!isPractice && (
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>Intentos: <strong style={{ color: 'var(--navy)' }}>{intentosRef.current}</strong></span>
          <span>{elapsed}s</span>
          <span>Errores: <strong style={{ color: '#CC2200' }}>{erroresRef.current}</strong></span>
        </div>
      )}
      <div className="grid gap-2.5 mx-auto" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, maxWidth: isPractice ? 260 : 400 }}>
        {cards.map(card => {
          const isFlipped  = flipped.includes(card.id) || matched.includes(card.id)
          const isMatched  = matched.includes(card.id)

          return (
            <button key={card.id} onClick={() => handleFlip(card)}
              className="relative aspect-square rounded-xl overflow-hidden"
              style={{ perspective: '600px', border: 'none', background: 'transparent', cursor: isFlipped ? 'default' : 'pointer' }}>
              <div style={{
                position: 'relative', width: '100%', height: '100%',
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transition: 'transform 0.3s ease',
              }}>
                {/* Frente (tapada): rojo de marca con el isotipo recortado */}
                <div style={{
                  position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                  background: 'var(--brand)', borderRadius: '10px', overflow: 'hidden',
                }}>
                  <span aria-hidden="true" className="memoria-dorso" />
                </div>
                {/* Reverso (número) */}
                <div style={{
                  position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  background: isMatched ? 'oklch(0.88 0.08 140 / 0.15)' : 'white',
                  borderRadius: '10px',
                  border: `2px solid ${isMatched ? 'oklch(0.55 0.12 140)' : 'oklch(0.88 0.01 80)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{
                    color: isMatched ? 'oklch(0.45 0.12 140)' : 'var(--gold)',
                    fontSize: isPractice ? '1.5rem' : '1.25rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-fraunces, serif)',
                  }}>
                    {card.value}
                  </span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function calcularPuntuacion(intentos: number, tiempo: number, errores: number) {
  const pMem  = intentos <= 23 ? 10 : intentos <= 26 ? 8 : intentos <= 29 ? 5 : 3
  const pConc = tiempo   <= 40 ? 10 : tiempo   <= 50 ? 8 : tiempo   <= 70 ? 5 : 3
  const pErr  = errores  === 0 ? 10 : errores  <= 3  ? 8 : errores  <= 6  ? 5 : errores <= 9 ? 4 : 3
  const total = Math.round((pMem + pConc + pErr) / 3)
  const rendimiento =
    total >= 9 ? 'Rendimiento Sobresaliente' :
    total >= 7 ? 'Rendimiento Alto' :
    total >= 5 ? 'Rendimiento Promedio' : 'Rendimiento Bajo'
  return { puntuacionTotal: total, rendimiento }
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function MemoriaTest({ onComplete, isPending, hasPractice }: TestComponentProps) {
  const [fase, setFase] = useState<Fase>('instrucciones')
  const resultRef = useRef<MemoriaResult | null>(null)
  // Key para forzar re-mount del Board al cambiar de fase
  const [boardKey, setBoardKey] = useState(0)

  function handlePracticeDone() {
    setFase('practica_done')
  }

  function handleRealDone(intentos: number, tiempo: number, errores: number) {
    const { puntuacionTotal, rendimiento } = calcularPuntuacion(intentos, tiempo, errores)
    resultRef.current = { intentos, tiempo, erroresRepetidos: errores, puntuacionTotal, rendimiento }
    setFase('resultado')
  }

  function startReal() {
    setBoardKey(k => k + 1)
    setFase('real')
  }

  // ── Instrucciones ──────────────────────────────────────────────────────────
  if (fase === 'instrucciones') {
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-light" style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}>
            Prueba de Memoria
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>Se mostrarán cartas boca abajo con números del <strong className="text-foreground">1 al 10</strong>, cada uno duplicado (20 cartas en total).</p>
            <p>Voltea dos cartas por turno. Si coinciden, se quedan descubiertas. Si no, se voltean de nuevo.</p>
            <p>El objetivo es encontrar todos los pares en la menor cantidad de intentos y tiempo posible.</p>
          </div>
        </div>
        <button onClick={() => setFase(hasPractice ? 'practica' : 'real')}
          className="px-8 py-3 rounded-lg text-sm font-medium"
          style={{ background: 'var(--brand)', color: 'white' }}>
          {hasPractice ? 'Comenzar práctica →' : 'Comenzar →'}
        </button>
      </div>
    )
  }

  // ── Práctica completada ────────────────────────────────────────────────────
  if (fase === 'practica_done') {
    return (
      <div className="text-center space-y-8 py-6">
        <div className="space-y-3">
          <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center text-2xl"
            style={{ background: 'oklch(0.88 0.08 140 / 0.15)' }}>✓</div>
          <h2 className="text-xl font-light" style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}>
            ¡Práctica completada!
          </h2>
          <p className="text-sm text-muted-foreground">
            Ahora comenzará el test real con 10 pares (20 cartas).
          </p>
        </div>
        <button onClick={startReal} className="px-8 py-3 rounded-lg text-sm font-medium"
          style={{ background: 'var(--brand)', color: 'white' }}>
          Comenzar test real →
        </button>
      </div>
    )
  }

  // ── Resultado ──────────────────────────────────────────────────────────────
  if (fase === 'resultado') {
    const r = resultRef.current!
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
        <button onClick={() => onComplete(r)} disabled={isPending}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-medium disabled:opacity-60"
          style={{ background: 'var(--brand)', color: 'white' }}>
          {isPending
            ? <><span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />Guardando...</>
            : 'Continuar →'}
        </button>
      </div>
    )
  }

  // ── Práctica ───────────────────────────────────────────────────────────────
  if (fase === 'practica') {
    return (
      <div className="space-y-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
          style={{ background: 'rgb(216 31 15 / 0.12)', color: 'var(--gold)' }}>
          PRÁCTICA — 3 pares
        </div>
        <MemoriaBoard key={`prac-${boardKey}`} pairs={PRAC_PAIRS} isPractice onComplete={handlePracticeDone} />
      </div>
    )
  }

  // ── Real ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <MemoriaBoard key={`real-${boardKey}`} pairs={REAL_PAIRS} isPractice={false} onComplete={handleRealDone} />
    </div>
  )
}
