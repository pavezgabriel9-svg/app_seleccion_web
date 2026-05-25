'use client'

import { useState, useRef, useEffect } from 'react'
import type { TestComponentProps, DISCRespuesta, DISCResult } from '@/types/database'
import groupsData from '@/lib/disc/data/groups.json' with { type: 'json' }
import { scoreDISC } from '@/lib/disc/score'

interface Palabra {
  pos: number
  texto: string
  mas: string
  menos: string
}
interface Grupo {
  grupo: number
  palabras: Palabra[]
}

const GROUPS = groupsData as Grupo[]
const TOTAL = GROUPS.length

type Fase = 'instrucciones' | 'test' | 'resultado'

export default function DISCTest({ onComplete, isPending }: TestComponentProps) {
  const [fase, setFase] = useState<Fase>('instrucciones')
  const [index, setIndex] = useState(0)
  const [respuestas, setRespuestas] = useState<DISCRespuesta[]>(
    () => GROUPS.map((g) => ({ grupo: g.grupo, mas: null, menos: null }))
  )

  const resultRef = useRef<DISCResult | null>(null)

  // Telemetría — sin re-renders
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

  const actual = respuestas[index]
  const grupo = GROUPS[index]
  const completo = actual.mas !== null && actual.menos !== null && actual.mas !== actual.menos
  const esUltimo = index === TOTAL - 1

  function marcar(polo: 'mas' | 'menos', pos: number) {
    if (firstInteractionTimeRef.current === null) firstInteractionTimeRef.current = Date.now()
    setRespuestas((prev) => {
      const next = prev.map((r) => ({ ...r }))
      const r = next[index]
      r[polo] = r[polo] === pos ? null : pos
      // No permitir la misma palabra en ambos polos
      if (polo === 'mas' && r.menos === pos) r.menos = null
      if (polo === 'menos' && r.mas === pos) r.mas = null
      return next
    })
  }

  function avanzar() {
    if (!completo) return
    if (esUltimo) {
      finalizar()
    } else {
      setIndex((i) => Math.min(i + 1, TOTAL - 1))
    }
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
    const gruposSinResponder = respuestas.filter(
      (r) => r.mas === null || r.menos === null
    ).length

    resultRef.current = {
      respuestas,
      resultado: scoreDISC(respuestas),
      metadata: {
        duracion_total_s: Math.round((now - mountTimeRef.current) / 1000),
        grupos_sin_responder: gruposSinResponder,
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
            Test DISC
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            En cada uno de los 28 grupos verás 4 palabras. Marca la palabra que MÁS te
            representa y la que MENOS te representa. No puedes elegir la misma palabra para
            ambas.
          </p>
        </div>

        <div
          className="rounded-xl p-5 space-y-2"
          style={{ background: 'oklch(0.96 0.005 80)' }}
        >
          {[
            '28 grupos de palabras.',
            'Sin tiempo límite.',
            'Sin práctica previa.',
          ].map((t) => (
            <div key={t} className="flex items-start gap-2.5">
              <span
                className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: 'var(--gold)' }}
              />
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
          className="w-13 h-13 rounded-full flex items-center justify-center text-xl"
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
          <h2
            className="text-2xl font-light"
            style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}
          >
            ¡Bien hecho!
          </h2>
          <p className="text-sm text-muted-foreground">
            Has completado esta etapa de la evaluación.
          </p>
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

  // ── Test — un grupo por pantalla ───────────────────────────────────────────
  const progreso = ((index + 1) / TOTAL) * 100

  return (
    <div className="space-y-6">
      {/* Progreso */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: 'var(--navy)' }}>
            Grupo {index + 1} de {TOTAL}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {Math.round(progreso)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'oklch(0.92 0.005 80)' }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progreso}%`, background: 'var(--navy)' }}
          />
        </div>
      </div>

      {/* Encabezado de columnas */}
      <div className="grid grid-cols-[1fr_64px_64px] items-center gap-2 px-1">
        <span />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-center" style={{ color: 'var(--navy)', opacity: 0.7 }}>
          Más
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-center" style={{ color: 'var(--navy)', opacity: 0.7 }}>
          Menos
        </span>
      </div>

      {/* Palabras */}
      <div className="space-y-2">
        {grupo.palabras.map((p) => {
          const masSel = actual.mas === p.pos
          const menosSel = actual.menos === p.pos
          return (
            <div
              key={p.pos}
              className="grid grid-cols-[1fr_64px_64px] items-center gap-2 rounded-xl px-4 py-3"
              style={{
                background: masSel
                  ? 'oklch(0.30 0.04 268 / 0.06)'
                  : menosSel
                  ? 'oklch(0.72 0.12 68 / 0.08)'
                  : 'oklch(0.97 0.005 80)',
                border: '1px solid',
                borderColor: masSel
                  ? 'var(--navy)'
                  : menosSel
                  ? 'oklch(0.72 0.12 68 / 0.5)'
                  : 'oklch(0.92 0.005 80)',
                transition: 'background 0.15s ease, border-color 0.15s ease',
              }}
            >
              <span className="text-sm" style={{ color: 'var(--navy)' }}>
                {p.texto}
              </span>
              <div className="flex justify-center">
                <input
                  type="radio"
                  name={`mas-${index}`}
                  checked={masSel}
                  onChange={() => marcar('mas', p.pos)}
                  className="w-4 h-4"
                  style={{ accentColor: 'var(--navy)', cursor: 'pointer' }}
                  aria-label={`${p.texto} — más me representa`}
                />
              </div>
              <div className="flex justify-center">
                <input
                  type="radio"
                  name={`menos-${index}`}
                  checked={menosSel}
                  onChange={() => marcar('menos', p.pos)}
                  className="w-4 h-4"
                  style={{ accentColor: 'var(--gold)', cursor: 'pointer' }}
                  aria-label={`${p.texto} — menos me representa`}
                />
              </div>
            </div>
          )
        })}
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
