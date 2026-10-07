'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { TestComponentProps, HanoiResult } from '@/types/database'

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG = {
  medio:   { towerCount: 4, discCount: 5, timeLimit: 5 * 60 },
  dificil: { towerCount: 3, discCount: 5, timeLimit: 8 * 60 },
} as const

// Disc widths as % of tower button width (disc 1 = smallest, disc 5 = largest)
const DISC_WIDTHS_PCT = [0, 34, 50, 63, 77, 92]

// Disc gradients: light navy (small) → deep navy (large)
const DISC_GRADIENTS = [
  '',
  'linear-gradient(160deg, oklch(0.76 0.05 268) 0%, oklch(0.68 0.06 268) 100%)',
  'linear-gradient(160deg, oklch(0.62 0.07 268) 0%, oklch(0.54 0.07 268) 100%)',
  'linear-gradient(160deg, oklch(0.46 0.08 268) 0%, oklch(0.38 0.08 268) 100%)',
  'linear-gradient(160deg, oklch(0.31 0.07 268) 0%, oklch(0.24 0.07 268) 100%)',
  'linear-gradient(160deg, oklch(0.22 0.06 268) 0%, oklch(0.16 0.06 268) 100%)',
]

type Variant = 'medio' | 'dificil'
type Fase    = 'instrucciones' | 'practica' | 'practica_done' | 'real' | 'resultado'

interface HanoiProps extends TestComponentProps {
  variant: Variant
  candidateName?: string
}

interface BoardProps {
  towerCount: number
  discCount: number
  timeLimit?: number
  isPractice?: boolean
  variantShort?: string
  onComplete: (movimientos: number, faltas: number, tiempoTotal: number) => void
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function calcularScore(variant: Variant, movimientos: number, faltas: number, tiempoTotal: number) {
  let movScore: number, errScore: number, timScore: number

  if (variant === 'medio') {
    movScore = movimientos >= 15 && movimientos <= 17 ? 100 :
               movimientos >= 18 && movimientos <= 20 ? 85  :
               movimientos >= 21 && movimientos <= 27 ? 60  : 30
    errScore = faltas === 0               ? 100 :
               faltas >= 1  && faltas <= 7  ? 85  :
               faltas >= 8  && faltas <= 14 ? 60  : 30
    timScore = tiempoTotal <= 30  ? 100 :
               tiempoTotal <= 64  ? 85  :
               tiempoTotal <= 90  ? 60  : 30
  } else {
    movScore = movimientos >= 31 && movimientos <= 35 ? 100 :
               movimientos >= 36 && movimientos <= 40 ? 85  :
               movimientos >= 41 && movimientos <= 50 ? 60  : 30
    errScore = faltas === 0               ? 100 :
               faltas >= 1  && faltas <= 5 ? 85  :
               faltas >= 6  && faltas <= 10 ? 60  : 30
    timScore = tiempoTotal <= 120 ? 100 :
               tiempoTotal <= 180 ? 85  :
               tiempoTotal <= 300 ? 60  : 30
  }

  const puntajeFinal = movScore * 0.4 + errScore * 0.35 + timScore * 0.25
  const rendimiento  =
    puntajeFinal >= 90 ? 'Rendimiento Sobresaliente' :
    puntajeFinal >= 76 ? 'Rendimiento Alto'           :
    puntajeFinal >= 41 ? 'Rendimiento Promedio'       : 'Rendimiento Bajo'

  return { puntajeFinal: Math.round(puntajeFinal), rendimiento }
}

// ─── CSS Keyframes (injected once per mount) ──────────────────────────────────

function HanoiStyles() {
  return (
    <style>{`
      @keyframes hanoiShake {
        0%, 100% { transform: translateX(0); }
        20%       { transform: translateX(-8px); }
        40%       { transform: translateX(8px); }
        60%       { transform: translateX(-5px); }
        80%       { transform: translateX(5px); }
      }
      @keyframes hanoiPulseWarning {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.50; }
      }
      @keyframes hanoiPulseCritical {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.35; }
      }
      @keyframes hanoiFadeIn {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0);   }
      }
      @keyframes hanoiSpin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  )
}

// ─── HanoiBoard (full-screen overlay) ────────────────────────────────────────

function HanoiBoard({
  towerCount, discCount, timeLimit, isPractice = false,
  variantShort, onComplete,
}: BoardProps) {
  const [towers, setTowers] = useState<number[][]>(() => {
    const t: number[][] = Array.from({ length: towerCount }, () => [])
    for (let d = discCount; d >= 1; d--) t[0].push(d)
    return t
  })
  const [selected, setSelected]       = useState<number | null>(null)
  const [movimientos, setMovimientos] = useState(0)
  const [faltas, setFaltas]           = useState(0)
  const [timeLeft, setTimeLeft]       = useState(timeLimit ?? 0)
  const [finished, setFinished]       = useState(false)
  const [shakingTower, setShakingTower] = useState<number | null>(null)
  const [timerStarted, setTimerStarted] = useState(false)

  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedRef   = useRef(false)
  const startTimeRef = useRef<number>(0)
  const movRef       = useRef(0)
  const faltasRef    = useRef(0)

  const timePercent  = timeLimit ? timeLeft / timeLimit : 1
  const timerUrgency = timePercent <= 0.10 ? 'critical' : timePercent <= 0.30 ? 'warning' : 'normal'

  const timerColor =
    timerUrgency === 'critical' ? '#CC2200' :
    timerUrgency === 'warning'  ? 'oklch(0.72 0.12 68)' :
    'var(--navy)'

  const timerAnimation =
    timerUrgency === 'critical' ? 'hanoiPulseCritical 0.5s ease-in-out infinite' :
    timerUrgency === 'warning'  ? 'hanoiPulseWarning 1.2s ease-in-out infinite'  : 'none'

  const finish = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setFinished(true)
    const elapsed = startedRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : 0
    onComplete(movRef.current, faltasRef.current, elapsed)
  }, [onComplete])

  const startTimer = useCallback(() => {
    if (startedRef.current || !timeLimit) return
    startedRef.current   = true
    startTimeRef.current = Date.now()
    setTimerStarted(true)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          setFinished(true)
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
          onComplete(movRef.current, faltasRef.current, elapsed)
          return 0
        }
        return t - 1
      })
    }, 1000)
  }, [timeLimit, onComplete])

  function handleTowerClick(towerIdx: number) {
    if (finished) return

    setTowers(prev => {
      const next = prev.map(t => [...t])

      if (selected === null) {
        if (next[towerIdx].length > 0) {
          setSelected(towerIdx)
          if (!isPractice) startTimer()
        }
        return next
      }

      if (towerIdx === selected) {
        setSelected(null)
        return next
      }

      const movingDisc = next[selected][next[selected].length - 1]
      const targetTop  = next[towerIdx][next[towerIdx].length - 1]

      if (targetTop === undefined || movingDisc < targetTop) {
        // Valid move
        next[selected].pop()
        next[towerIdx].push(movingDisc)
        movRef.current++
        setMovimientos(m => m + 1)
        setSelected(null)

        if (next[towerIdx].length === discCount && towerIdx === towerCount - 1) {
          setTimeout(() => finish(), 200)
        }
      } else {
        // Invalid move
        faltasRef.current++
        setFaltas(f => f + 1)
        const srcTower = selected
        setShakingTower(srcTower)
        setTimeout(() => setShakingTower(null), 450)
        setSelected(null)
      }

      return next
    })
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const mins = timeLimit ? Math.floor(timeLeft / 60) : 0
  const secs = timeLimit ? (timeLeft % 60).toString().padStart(2, '0') : '00'

  return (
    <div
      role="main"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'oklch(0.98 0.005 85)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'hanoiFadeIn 0.25s ease-out',
      }}
    >
      {/* ─── HUD ──────────────────────────────────────────────────────── */}
      <div
        style={{
          height: '60px',
          background: 'white',
          borderBottom: '1px solid oklch(0.92 0.005 80)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 clamp(12px, 4vw, 24px)',
          flexShrink: 0,
          gap: '8px',
        }}
      >
        {/* Left: test name + variant badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: '0 1 auto' }}>
          <span
            style={{
              fontFamily: 'var(--font-fraunces, serif)',
              fontSize: 'clamp(13px, 3.5vw, 15px)',
              fontWeight: 300,
              color: 'var(--navy)',
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Torre de Hanói
          </span>
          {!isPractice && variantShort && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: 'oklch(0.97 0.005 85)',
                background: 'var(--brand)',
                padding: '2px 8px',
                borderRadius: '100px',
                flexShrink: 0,
              }}
            >
              {variantShort}
            </span>
          )}
          {isPractice && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: 'var(--gold)',
                background: 'rgb(216 31 15 / 0.10)',
                border: '1px solid rgb(216 31 15 / 0.30)',
                padding: '2px 8px',
                borderRadius: '100px',
                flexShrink: 0,
              }}
            >
              Práctica
            </span>
          )}
        </div>

        {/* Center: timer */}
        {timeLimit && (
          <div
            style={{
              fontFamily: 'var(--font-geist-mono, monospace)',
              fontSize: 'clamp(18px, 5vw, 23px)',
              fontWeight: 500,
              color: timerColor,
              letterSpacing: '0.02em',
              animation: timerAnimation,
              minWidth: '72px',
              textAlign: 'center',
              flexShrink: 0,
              transition: 'color 0.4s ease',
            }}
          >
            {timerStarted
              ? `${mins}:${secs}`
              : (
                <span
                  style={{
                    fontSize: '10px',
                    color: 'oklch(0.65 0.02 265)',
                    fontFamily: 'var(--font-sora, sans-serif)',
                    fontWeight: 400,
                    letterSpacing: '0.02em',
                  }}
                >
                  Inicia al mover
                </span>
              )
            }
          </div>
        )}

        {/* Right: moves + errors */}
        {!isPractice && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: 'clamp(15px, 4vw, 18px)',
                  fontWeight: 500,
                  color: 'var(--navy)',
                  lineHeight: 1,
                  fontFamily: 'var(--font-geist-mono, monospace)',
                }}
              >
                {movimientos}
              </div>
              <div
                style={{
                  fontSize: '9px',
                  color: 'oklch(0.60 0.03 265)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginTop: '2px',
                }}
              >
                mov
              </div>
            </div>
            <div style={{ width: '1px', height: '26px', background: 'oklch(0.88 0.01 80)' }} />
            <div style={{ textAlign: 'right' }}>
              <div
                style={{
                  fontSize: 'clamp(15px, 4vw, 18px)',
                  fontWeight: 500,
                  color: faltas > 0 ? '#CC2200' : 'oklch(0.60 0.03 265)',
                  lineHeight: 1,
                  fontFamily: 'var(--font-geist-mono, monospace)',
                  transition: 'color 0.3s ease',
                }}
              >
                {faltas}
              </div>
              <div
                style={{
                  fontSize: '9px',
                  color: 'oklch(0.60 0.03 265)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginTop: '2px',
                }}
              >
                err
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Tower area ───────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(12px, 3vw, 28px) clamp(8px, 3vw, 20px)',
          minHeight: 0,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${towerCount}, 1fr)`,
            gap: 'clamp(6px, 2vw, 18px)',
            width: '100%',
            maxWidth: `${towerCount * 175}px`,
            alignItems: 'end',
          }}
        >
          {towers.map((tower, tIdx) => {
            const isSelected = selected === tIdx
            const isShaking  = shakingTower === tIdx

            return (
              <button
                key={tIdx}
                onClick={() => handleTowerClick(tIdx)}
                disabled={finished}
                aria-label={`Torre ${tIdx + 1}, ${tower.length} discos`}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column-reverse',
                  alignItems: 'center',
                  gap: 'clamp(2px, 0.5vh, 4px)',
                  paddingBottom: '10px',
                  paddingTop: '16px',
                  width: '100%',
                  minHeight: 'clamp(140px, 28vh, 260px)',
                  background: isSelected ? 'rgb(216 31 15 / 0.06)' : 'transparent',
                  borderRadius: '14px',
                  border: isSelected
                    ? '1.5px dashed rgb(216 31 15 / 0.55)'
                    : '1.5px solid transparent',
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                  cursor: finished ? 'default' : 'pointer',
                  animation: isShaking ? 'hanoiShake 0.45s ease' : 'none',
                  outline: 'none',
                }}
              >
                {/* Poste vertical */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '12px',
                    bottom: '17px',
                    transform: 'translateX(-50%)',
                    width: '3px',
                    background: 'oklch(0.20 0.06 268 / 0.17)',
                    borderRadius: '2px',
                  }}
                />

                {/* Base */}
                <div
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    width: '88%',
                    height: '7px',
                    background: 'oklch(0.20 0.06 268 / 0.22)',
                    borderRadius: '4px',
                  }}
                />

                {/* Discos */}
                {tower.map((disc, dIdx) => {
                  const isTopDisc      = dIdx === tower.length - 1
                  const isSelectedDisc = isSelected && isTopDisc

                  return (
                    <div
                      key={`${tIdx}-${dIdx}-${disc}`}
                      style={{
                        position: 'relative',
                        zIndex: 2,
                        width: `${DISC_WIDTHS_PCT[disc]}%`,
                        height: 'clamp(16px, 2.8vh, 24px)',
                        background: DISC_GRADIENTS[disc],
                        borderRadius: '5px',
                        boxShadow: isSelectedDisc
                          ? `0 0 0 2px var(--gold), 0 6px 18px oklch(0 0 0 / 0.18)`
                          : `0 1px 3px oklch(0 0 0 / 0.14)`,
                        transform: isSelectedDisc ? 'translateY(-14px)' : 'translateY(0)',
                        transition: 'transform 0.18s ease-out, box-shadow 0.18s ease-out',
                      }}
                    />
                  )
                })}

                {/* Número de torre */}
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-2px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '10px',
                    color: 'oklch(0.68 0.03 265)',
                    fontFamily: 'var(--font-geist-mono, monospace)',
                    letterSpacing: '0.04em',
                    userSelect: 'none',
                  }}
                >
                  {tIdx + 1}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── Footer hint ──────────────────────────────────────────────── */}
      <div
        style={{
          height: '46px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          padding: '0 16px',
        }}
      >
        {!finished && (
          <p
            style={{
              fontSize: '12px',
              color: selected !== null ? 'var(--gold)' : 'oklch(0.62 0.03 265)',
              fontWeight: selected !== null ? 500 : 400,
              letterSpacing: '0.01em',
              transition: 'color 0.2s ease',
              textAlign: 'center',
              margin: 0,
            }}
          >
            {selected !== null
              ? 'Disco seleccionado — toca la torre destino'
              : 'Toca una torre para seleccionar su disco superior'}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function CheckCircle() {
  return (
    <div
      style={{
        width: '52px',
        height: '52px',
        borderRadius: '50%',
        background: 'oklch(0.82 0.10 145 / 0.14)',
        border: '1.5px solid oklch(0.65 0.14 145 / 0.28)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '20px',
        color: 'oklch(0.50 0.14 145)',
        flexShrink: 0,
      }}
    >
      ✓
    </div>
  )
}

function StatsPill({ towerCount, discCount, timeLimit }: { towerCount: number; discCount: number; timeLimit: number }) {
  const stats = [
    { label: 'Torres', value: towerCount },
    { label: 'Discos', value: discCount },
    { label: 'Tiempo', value: `${timeLimit / 60} min` },
  ]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        padding: '14px 20px',
        background: 'oklch(0.96 0.005 80)',
        borderRadius: '12px',
        border: '1px solid oklch(0.90 0.008 80)',
        width: '100%',
      }}
    >
      {stats.map(({ label, value }, i) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 'clamp(16px, 4vw, 19px)',
                fontWeight: 600,
                color: 'var(--navy)',
                fontFamily: 'var(--font-geist-mono, monospace)',
                lineHeight: 1,
              }}
            >
              {value}
            </div>
            <div
              style={{
                fontSize: '9px',
                color: 'oklch(0.60 0.03 265)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginTop: '4px',
              }}
            >
              {label}
            </div>
          </div>
          {i < stats.length - 1 && (
            <div style={{ width: '1px', height: '28px', background: 'oklch(0.88 0.01 80)', flexShrink: 0 }} />
          )}
        </div>
      ))}
    </div>
  )
}

function PrimaryButton({
  onClick,
  disabled,
  isPending,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  isPending?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '14px',
        borderRadius: '10px',
        background: 'var(--brand)',
        color: 'oklch(0.97 0.005 85)',
        fontSize: '14px',
        fontWeight: 500,
        letterSpacing: '0.01em',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'opacity 0.15s ease',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = '0.88' }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.opacity = '1' }}
    >
      {isPending && (
        <span
          style={{
            width: '14px',
            height: '14px',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'hanoiSpin 0.7s linear infinite',
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HanoiTest({
  onComplete, isPending, hasPractice, variant, candidateName,
}: HanoiProps) {
  const [fase, setFase]     = useState<Fase>('instrucciones')
  const [boardKey, setBoardKey] = useState(0)
  const resultRef           = useRef<HanoiResult | null>(null)

  const cfg             = CONFIG[variant]
  const variantLabel    = variant === 'medio' ? 'Versión Media' : 'Versión Difícil'
  const variantShort    = variant === 'medio' ? 'Media' : 'Difícil'
  const practicaTowers  = variant === 'dificil' ? 3 : 4
  const firstName       = candidateName?.split(' ')[0] ?? ''

  function handlePracticaDone() {
    setFase('practica_done')
  }

  function handleRealDone(movimientos: number, faltas: number, tiempoTotal: number) {
    const { rendimiento } = calcularScore(variant, movimientos, faltas, tiempoTotal)
    resultRef.current = { movimientos, faltas, tiempoTotal, rendimiento }
    setFase('resultado')
  }

  function startPractica() {
    setBoardKey(k => k + 1)
    setFase('practica')
  }

  function startReal() {
    setBoardKey(k => k + 1)
    setFase('real')
  }

  return (
    <>
      <HanoiStyles />

      {/* ── Full-screen: Práctica ─────────────────────────────────────── */}
      {fase === 'practica' && (
        <HanoiBoard
          key={`prac-${boardKey}`}
          towerCount={practicaTowers}
          discCount={3}
          isPractice
          onComplete={handlePracticaDone}
        />
      )}

      {/* ── Full-screen: Real ─────────────────────────────────────────── */}
      {fase === 'real' && (
        <HanoiBoard
          key={`real-${boardKey}`}
          towerCount={cfg.towerCount}
          discCount={cfg.discCount}
          timeLimit={cfg.timeLimit}
          variantShort={variantShort}
          onComplete={handleRealDone}
        />
      )}

      {/* ── Instrucciones ─────────────────────────────────────────────── */}
      {fase === 'instrucciones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'hanoiFadeIn 0.3s ease-out' }}>
          {/* Header */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2
                style={{
                  fontFamily: 'var(--font-fraunces, serif)',
                  fontSize: 'clamp(20px, 5vw, 26px)',
                  fontWeight: 300,
                  color: 'var(--navy)',
                  letterSpacing: '-0.03em',
                  margin: 0,
                  lineHeight: 1.1,
                }}
              >
                Torre de Hanói
              </h2>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: 'oklch(0.97 0.005 85)',
                  background: 'var(--brand)',
                  padding: '3px 10px',
                  borderRadius: '100px',
                  flexShrink: 0,
                }}
              >
                {variantLabel}
              </span>
            </div>
            <p style={{ fontSize: '14px', color: 'oklch(0.50 0.03 265)', margin: 0, lineHeight: 1.6 }}>
              Tienes{' '}
              <strong style={{ color: 'var(--navy)', fontWeight: 600 }}>{cfg.discCount} discos</strong>{' '}
              apilados en la primera torre, del más grande (abajo) al más pequeño (arriba).
            </p>
          </div>

          {/* Reglas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--navy)', margin: 0 }}>
              Tu objetivo es mover todos los discos a la última torre:
            </p>
            {[
              'Solo puedes mover un disco a la vez (el superior de cualquier torre).',
              'No puedes colocar un disco grande sobre uno más pequeño.',
            ].map((rule, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'rgb(216 31 15 / 0.12)',
                    color: 'var(--gold)',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '1px',
                  }}
                >
                  ✓
                </span>
                <p style={{ fontSize: '13px', color: 'oklch(0.48 0.03 265)', margin: 0, lineHeight: 1.55 }}>
                  {rule}
                </p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <StatsPill towerCount={cfg.towerCount} discCount={cfg.discCount} timeLimit={cfg.timeLimit} />

          {/* CTA */}
          <PrimaryButton onClick={() => hasPractice ? startPractica() : startReal()}>
            {hasPractice ? 'Comenzar práctica →' : 'Comenzar →'}
          </PrimaryButton>
        </div>
      )}

      {/* ── Práctica completada ───────────────────────────────────────── */}
      {fase === 'practica_done' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '22px',
            padding: '12px 0',
            animation: 'hanoiFadeIn 0.3s ease-out',
          }}
        >
          <CheckCircle />
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2
              style={{
                fontFamily: 'var(--font-fraunces, serif)',
                fontSize: 'clamp(19px, 5vw, 23px)',
                fontWeight: 300,
                color: 'var(--navy)',
                letterSpacing: '-0.03em',
                margin: 0,
              }}
            >
              ¡Práctica completada!
            </h2>
            <p style={{ fontSize: '13px', color: 'oklch(0.52 0.03 265)', margin: 0, lineHeight: 1.6 }}>
              Ahora comenzará el test real.
            </p>
          </div>
          <StatsPill towerCount={cfg.towerCount} discCount={cfg.discCount} timeLimit={cfg.timeLimit} />
          <PrimaryButton onClick={startReal}>
            Comenzar test real →
          </PrimaryButton>
        </div>
      )}

      {/* ── Resultado ─────────────────────────────────────────────────── */}
      {fase === 'resultado' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '22px',
            padding: '12px 0',
            animation: 'hanoiFadeIn 0.3s ease-out',
          }}
        >
          <CheckCircle />
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h2
              style={{
                fontFamily: 'var(--font-fraunces, serif)',
                fontSize: 'clamp(19px, 5vw, 23px)',
                fontWeight: 300,
                color: 'var(--navy)',
                letterSpacing: '-0.03em',
                margin: 0,
              }}
            >
              {firstName ? `¡Gracias, ${firstName}!` : '¡Bien hecho!'}
            </h2>
            <p
              style={{
                fontSize: '13px',
                color: 'oklch(0.52 0.03 265)',
                margin: 0,
                lineHeight: 1.6,
                maxWidth: '280px',
              }}
            >
              Has completado esta etapa de la evaluación.
            </p>
          </div>
          <PrimaryButton
            onClick={() => onComplete(resultRef.current!)}
            disabled={isPending}
            isPending={isPending}
          >
            {isPending ? 'Guardando...' : 'Continuar →'}
          </PrimaryButton>
        </div>
      )}
    </>
  )
}
