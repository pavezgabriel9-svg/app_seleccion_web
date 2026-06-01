'use client'

import { useState, useRef, useEffect } from 'react'
import type { TestComponentProps, ZAVICRespuesta, ZAVICResult } from '@/types/database'
import itemsData from '@/lib/zavic/data/items.json' with { type: 'json' }
import situacionesData from '@/lib/zavic/data/situaciones.json' with { type: 'json' }
import { scoreZAVIC } from '@/lib/zavic/score'

interface Frase {
  pos: number
  letra: string
  texto: string
  eje: string
}
interface Item {
  item: number
  seccion: 'valores' | 'intereses'
  frases: Frase[]
}

const ITEMS = itemsData as Item[]
const TOTAL = ITEMS.length
const SITUACIONES = situacionesData as Record<string, string>

type Fase = 'instrucciones' | 'test' | 'resultado'

export default function ZAVICTest({ onComplete, isPending }: TestComponentProps) {
  const [fase, setFase] = useState<Fase>('instrucciones')
  const [index, setIndex] = useState(0)
  const [rankings, setRankings] = useState<(number | null)[][]>(
    () => ITEMS.map(() => [null, null, null, null])
  )

  const resultRef = useRef<ZAVICResult | null>(null)
  const mountTimeRef = useRef(Date.now())
  const firstInteractionTimeRef = useRef<number | null>(null)
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

  const actual = rankings[index]
  const item = ITEMS[index]
  const used = new Set(actual.filter((r): r is number => r !== null))
  const completo = used.size === 4 && [1, 2, 3, 4].every((n) => used.has(n))
  const esUltimo = index === TOTAL - 1

  function clickFrase(pos: number) {
    if (firstInteractionTimeRef.current === null) firstInteractionTimeRef.current = Date.now()
    setRankings((prev) => {
      const next = prev.map((r) => [...r])
      const cur = next[index][pos - 1]
      if (cur !== null) {
        next[index][pos - 1] = null
      } else {
        const local = new Set(next[index].filter((r): r is number => r !== null))
        let assign = 4
        for (let r = 1; r <= 4; r++) if (!local.has(r)) { assign = r; break }
        next[index][pos - 1] = assign
      }
      return next
    })
  }

  function limpiarItem() {
    setRankings((prev) => {
      const next = prev.map((r) => [...r])
      next[index] = [null, null, null, null]
      return next
    })
  }

  function avanzar() {
    if (!completo) return
    if (esUltimo) finalizar()
    else setIndex((i) => Math.min(i + 1, TOTAL - 1))
  }

  function retroceder() {
    setIndex((i) => Math.max(i - 1, 0))
  }

  function finalizar() {
    const now = Date.now()
    if (lastHiddenAtRef.current !== null) {
      outOfFocusDurationRef.current += Math.round((now - lastHiddenAtRef.current) / 1000)
      lastHiddenAtRef.current = null
    }
    const respuestas: ZAVICRespuesta[] = ITEMS.map((it, i) => ({
      item: it.item,
      rankings: rankings[i],
    }))
    const itemsSinResponder = respuestas.filter((r) => r.rankings.some((x) => x === null)).length

    resultRef.current = {
      respuestas,
      resultado: scoreZAVIC(respuestas),
      metadata: {
        duracion_total_s: Math.round((now - mountTimeRef.current) / 1000),
        items_sin_responder: itemsSinResponder,
        tab_switch_count: tabSwitchCountRef.current,
        out_of_focus_duration: outOfFocusDurationRef.current,
      },
      version: '1.0',
    }
    setFase('resultado')
  }

  // ── Instrucciones ────────────────────────────────────────────────────────
  if (fase === 'instrucciones') {
    return (
      <div className="space-y-7">
        <div className="space-y-4">
          <h2
            className="text-2xl font-light"
            style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)', letterSpacing: '-0.02em' }}
          >
            Test ZAVIC
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Verás 20 situaciones, cada una con 4 alternativas. En cada situación debes
            ordenar las 4 alternativas según qué tanto te representan, asignando
            <strong style={{ color: 'var(--navy)' }}> 1 a la más representativa</strong> y{' '}
            <strong style={{ color: 'var(--navy)' }}>4 a la menos representativa</strong>.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Haz clic en cada alternativa en el orden de tu preferencia: la primera que
            elijas recibirá un 1, la segunda un 2, y así sucesivamente. Si te equivocas,
            puedes hacer clic de nuevo para quitar el número, o usar el botón
            &quot;Limpiar&quot;.
          </p>
        </div>

        <div className="rounded-xl p-5 space-y-2" style={{ background: 'oklch(0.96 0.005 80)' }}>
          {[
            '20 situaciones con 4 alternativas cada una.',
            'Sin tiempo límite.',
            'Cada número (1, 2, 3, 4) se usa una sola vez por situación.',
          ].map((t) => (
            <div key={t} className="flex items-start gap-2.5">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--gold)' }} />
              <span className="text-[13px]" style={{ color: 'var(--navy)', opacity: 0.8 }}>
                {t}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={() => setFase('test')}
          className="px-8 py-3 rounded-lg text-sm font-medium"
          style={{ background: 'var(--navy)', color: 'var(--cream)' }}
        >
          Comenzar →
        </button>
      </div>
    )
  }

  // ── Resultado (sin puntaje para el candidato) ──────────────────────────────
  if (fase === 'resultado') {
    const r = resultRef.current!
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
          <p className="text-sm text-muted-foreground">Has completado esta etapa de la evaluación.</p>
        </div>
        <button
          onClick={() => onComplete(r)}
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

  // ── Test — un ítem por pantalla, click secuencial ─────────────────────────
  const progreso = ((index + 1) / TOTAL) * 100
  const nextRank = (() => {
    for (let r = 1; r <= 4; r++) if (!used.has(r)) return r
    return null
  })()

  return (
    <div className="space-y-6">
      {/* Progreso */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: 'var(--navy)' }}>
            Situación {index + 1} de {TOTAL}
          </span>
          <span className="text-xs text-muted-foreground font-mono">{Math.round(progreso)}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'oklch(0.92 0.005 80)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progreso}%`, background: 'var(--navy)' }}
          />
        </div>
      </div>

      {/* Situación (enunciado del ítem) — solo si está cargada */}
      {SITUACIONES[String(item.item)] && (
        <div
          className="rounded-xl px-5 py-4"
          style={{
            background: 'oklch(0.97 0.012 80)',
            borderLeft: '3px solid var(--gold)',
          }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-1.5"
            style={{ color: 'var(--navy)', opacity: 0.6 }}
          >
            Situación
          </p>
          <p
            className="text-[15px] leading-relaxed"
            style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}
          >
            {SITUACIONES[String(item.item)]}
          </p>
        </div>
      )}

      {/* Hint del siguiente número */}
      <div
        className="text-xs px-3 py-2 rounded-lg"
        style={{ background: 'oklch(0.96 0.005 80)', color: 'var(--navy)', opacity: 0.85 }}
      >
        {completo
          ? 'Listo. Puedes ajustar tu respuesta o continuar.'
          : nextRank === 1
          ? 'Haz clic en la alternativa que MÁS te representa.'
          : nextRank === 4
          ? 'Haz clic en la alternativa que MENOS te representa.'
          : `Haz clic en la alternativa que ocupa el lugar ${nextRank}.`}
      </div>

      {/* Frases */}
      <div className="space-y-2">
        {item.frases.map((f) => {
          const rank = actual[f.pos - 1]
          const isRanked = rank !== null
          return (
            <button
              key={f.pos}
              onClick={() => clickFrase(f.pos)}
              className="w-full text-left flex items-start gap-3 rounded-xl px-4 py-3.5 transition-all"
              style={{
                background: isRanked ? 'oklch(0.30 0.04 268 / 0.05)' : 'oklch(0.97 0.005 80)',
                border: '1px solid',
                borderColor: isRanked ? 'var(--navy)' : 'oklch(0.92 0.005 80)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!isRanked) e.currentTarget.style.borderColor = 'oklch(0.72 0.12 68 / 0.5)'
              }}
              onMouseLeave={(e) => {
                if (!isRanked) e.currentTarget.style.borderColor = 'oklch(0.92 0.005 80)'
              }}
            >
              <span
                className="shrink-0 inline-flex items-center justify-center font-semibold transition-all"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: isRanked ? 'var(--navy)' : 'white',
                  color: isRanked ? 'var(--cream)' : 'oklch(0.65 0.03 265)',
                  border: '1px solid',
                  borderColor: isRanked ? 'var(--navy)' : 'oklch(0.88 0.005 80)',
                  fontFamily: 'var(--font-geist-mono, monospace)',
                  fontSize: '14px',
                }}
              >
                {rank ?? ''}
              </span>
              <span className="text-sm leading-relaxed pt-1" style={{ color: 'var(--navy)' }}>
                {f.texto}
              </span>
            </button>
          )
        })}
      </div>

      {/* Acción secundaria: limpiar */}
      <div className="flex justify-end">
        <button
          onClick={limpiarItem}
          disabled={used.size === 0}
          className="text-xs px-3 py-1.5 rounded-md disabled:opacity-40"
          style={{ color: 'oklch(0.55 0.03 265)' }}
        >
          Limpiar esta situación
        </button>
      </div>

      {/* Navegación */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={retroceder}
          disabled={index === 0}
          className="px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40"
          style={{ background: 'oklch(0.96 0.005 80)', color: 'var(--navy)' }}
        >
          ← Anterior
        </button>
        <button
          onClick={avanzar}
          disabled={!completo}
          className="px-8 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40"
          style={{ background: 'var(--navy)', color: 'var(--cream)' }}
        >
          {esUltimo ? 'Finalizar' : 'Siguiente →'}
        </button>
      </div>
    </div>
  )
}
