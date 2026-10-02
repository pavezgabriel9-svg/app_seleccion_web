'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { IPVOpcion, IPVResult, TestComponentProps } from '@/types/database'
import itemsData from '@/lib/ipv/data/items.json' with { type: 'json' }
import ejemplosData from '@/lib/ipv/data/ejemplos.json' with { type: 'json' }
import { IPV_TOTAL_ITEMS, opcionesDeItem, scoreIPV } from '@/lib/ipv/score'

interface Item {
  item: number
  enunciado: string
  opciones: Partial<Record<IPVOpcion, string>>
}
interface Ejemplo {
  intro: string
  enunciado: string
  opciones: Record<IPVOpcion, string>
  nota?: string
}

const ITEMS = (itemsData as { items: Item[] }).items
const EJEMPLOS = (ejemplosData as { ejemplos: Ejemplo[] }).ejemplos
const TOTAL = IPV_TOTAL_ITEMS
const LETRAS: IPVOpcion[] = ['a', 'b', 'c']
const AUTO_ADVANCE_MS = 260

type Fase = 'instrucciones' | 'preguntas' | 'revision' | 'envio'
type Respuestas = (IPVOpcion | null)[]

interface IPVTestProps extends TestComponentProps {
  sessionId: string
}

// ─── Borrador en localStorage (clave `ipv:<sessionId>`) ───────────────────────
// Se guarda como string de 87 caracteres ('-' = sin responder) + métricas.

interface Borrador {
  r: string
  i: number
  t: number
  tab: number
  oof: number
}

function leerBorrador(sessionId: string): Borrador | null {
  try {
    const raw = window.localStorage.getItem(`ipv:${sessionId}`)
    if (!raw) return null
    const b = JSON.parse(raw) as Partial<Borrador>
    if (typeof b.r !== 'string' || b.r.length !== TOTAL) return null
    return {
      r: b.r,
      i: Number.isInteger(b.i) ? Math.min(Math.max(b.i as number, 0), TOTAL - 1) : 0,
      t: Number.isFinite(b.t) ? (b.t as number) : 0,
      tab: Number.isFinite(b.tab) ? (b.tab as number) : 0,
      oof: Number.isFinite(b.oof) ? (b.oof as number) : 0,
    }
  } catch {
    return null
  }
}

function guardarBorrador(sessionId: string, b: Borrador) {
  try {
    window.localStorage.setItem(`ipv:${sessionId}`, JSON.stringify(b))
  } catch {
    /* sin almacenamiento disponible: la prueba sigue funcionando sin borrador */
  }
}

function borrarBorrador(sessionId: string) {
  try {
    window.localStorage.removeItem(`ipv:${sessionId}`)
  } catch {
    /* noop */
  }
}

function serializar(r: Respuestas): string {
  return r.map((x) => x ?? '-').join('')
}

function deserializar(s: string): Respuestas {
  return Array.from(s).map((ch) => (ch === 'a' || ch === 'b' || ch === 'c' ? ch : null))
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function IPVTest({ onComplete, isPending, sessionId }: IPVTestProps) {
  const [fase, setFase] = useState<Fase>('instrucciones')
  const [index, setIndex] = useState(0)
  const [respuestas, setRespuestas] = useState<Respuestas>(() => Array(TOTAL).fill(null))
  const [borradorPrevio, setBorradorPrevio] = useState(0)
  // Si se entra a una pregunta desde la revisión, al responder se vuelve a la revisión.
  const [desdeRevision, setDesdeRevision] = useState(false)

  const startTimeRef = useRef<number | null>(null)
  const tiempoPrevioRef = useRef(0)
  const tabSwitchCountRef = useRef(0)
  const outOfFocusDurationRef = useRef(0)
  const lastHiddenAtRef = useRef<number | null>(null)
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resultRef = useRef<IPVResult | null>(null)
  const enviadoRef = useRef(false)

  const respondidas = respuestas.filter((r) => r !== null).length
  const sinResponder = TOTAL - respondidas

  // Integridad: igual que ZAVIC (visibilitychange)
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        tabSwitchCountRef.current++
        lastHiddenAtRef.current = performance.now()
      } else if (lastHiddenAtRef.current !== null) {
        outOfFocusDurationRef.current += Math.round(
          (performance.now() - lastHiddenAtRef.current) / 1000
        )
        lastHiddenAtRef.current = null
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // Recuperar borrador (solo en el cliente, tras montar)
  useEffect(() => {
    const b = leerBorrador(sessionId)
    if (!b) return
    const recuperadas = deserializar(b.r)
    if (recuperadas.every((r) => r === null)) return
    tiempoPrevioRef.current = b.t
    tabSwitchCountRef.current = b.tab
    outOfFocusDurationRef.current = b.oof
    setRespuestas(recuperadas)
    setIndex(b.i)
    setBorradorPrevio(recuperadas.filter((r) => r !== null).length)
  }, [sessionId])

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
    }
  }, [])

  const duracionActual = useCallback(() => {
    const ahora = performance.now()
    return tiempoPrevioRef.current + Math.round((ahora - (startTimeRef.current ?? ahora)) / 1000)
  }, [])

  // Guardar borrador en cada cambio mientras se responde
  useEffect(() => {
    if (fase !== 'preguntas' && fase !== 'revision') return
    guardarBorrador(sessionId, {
      r: serializar(respuestas),
      i: index,
      t: duracionActual(),
      tab: tabSwitchCountRef.current,
      oof: outOfFocusDurationRef.current,
    })
  }, [respuestas, index, fase, sessionId, duracionActual])

  function cancelarAvance() {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }
  }

  function comenzar() {
    startTimeRef.current = performance.now()
    const primeraPendiente = respuestas.findIndex((r) => r === null)
    if (borradorPrevio > 0 && primeraPendiente === -1) {
      setFase('revision')
      return
    }
    if (primeraPendiente !== -1) setIndex(borradorPrevio > 0 ? primeraPendiente : 0)
    setFase('preguntas')
  }

  function responder(opcion: IPVOpcion) {
    const idx = index
    setRespuestas((prev) => {
      const next = [...prev]
      next[idx] = opcion
      return next
    })
    cancelarAvance()
    advanceTimerRef.current = setTimeout(() => {
      advanceTimerRef.current = null
      if (desdeRevision || idx === TOTAL - 1) {
        setDesdeRevision(false)
        setFase('revision')
      } else {
        // Se compara con idx para que un doble clic no salte dos preguntas
        setIndex((cur) => (cur === idx ? idx + 1 : cur))
      }
    }, AUTO_ADVANCE_MS)
  }

  function retroceder() {
    cancelarAvance()
    setIndex((i) => Math.max(i - 1, 0))
  }

  function avanzarManual() {
    cancelarAvance()
    if (index === TOTAL - 1) setFase('revision')
    else setIndex((i) => Math.min(i + 1, TOTAL - 1))
  }

  function irAPregunta(i: number) {
    cancelarAvance()
    setIndex(i)
    setDesdeRevision(true)
    setFase('preguntas')
  }

  function enviar() {
    if (enviadoRef.current && resultRef.current) {
      // Reintento tras un fallo de guardado
      onComplete(resultRef.current)
      return
    }
    if (sinResponder > 0) return
    const now = performance.now()
    if (lastHiddenAtRef.current !== null) {
      outOfFocusDurationRef.current += Math.round((now - lastHiddenAtRef.current) / 1000)
      lastHiddenAtRef.current = null
    }
    const lista = ITEMS.map((it, i) => ({ item: it.item, respuesta: respuestas[i] }))
    resultRef.current = {
      tipo: 'ipv',
      respuestas: lista,
      resultado: scoreIPV(lista),
      metadata: {
        duracion_total_s: tiempoPrevioRef.current + Math.round((now - (startTimeRef.current ?? now)) / 1000),
        items_sin_responder: lista.filter((r) => r.respuesta === null).length,
        tab_switch_count: tabSwitchCountRef.current,
        out_of_focus_duration: outOfFocusDurationRef.current,
      },
      version: '1.0',
    }
    enviadoRef.current = true
    borrarBorrador(sessionId)
    setFase('envio')
    onComplete(resultRef.current)
  }

  // Atajos de teclado: A/B/C (o 1/2/3) responden; flechas navegan
  const item = ITEMS[index]
  const opcionesValidas = opcionesDeItem(item.item)
  useEffect(() => {
    if (fase !== 'preguntas') return
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      const map: Record<string, IPVOpcion> = { a: 'a', b: 'b', c: 'c', '1': 'a', '2': 'b', '3': 'c' }
      const op = map[k]
      if (op && opcionesValidas.includes(op)) {
        e.preventDefault()
        responder(op)
      } else if (k === 'arrowleft' && index > 0) {
        retroceder()
      } else if (k === 'arrowright' && respuestas[index] !== null) {
        avanzarManual()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // responder/retroceder/avanzarManual dependen del estado capturado abajo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, index, respuestas, desdeRevision])

  // ── Instrucciones ────────────────────────────────────────────────────────
  if (fase === 'instrucciones') {
    return (
      <div className="space-y-7">
        <div className="space-y-4">
          <h2
            className="text-2xl font-light"
            style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)', letterSpacing: '-0.02em' }}
          >
            Inventario de Personalidad para Vendedores
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            A continuación encontrarás {TOTAL} situaciones y preguntas, cada una con varias
            respuestas posibles. Elige <strong style={{ color: 'var(--navy)' }}>una sola alternativa</strong>{' '}
            por pregunta: la que, de manera espontánea, te parezca preferible.
          </p>
        </div>

        <div className="space-y-4">
          {EJEMPLOS.map((ej, n) => (
            <div key={n} className="space-y-2">
              <p className="text-sm leading-relaxed text-muted-foreground">{ej.intro}</p>
              <div
                className="rounded-xl px-4 py-4 space-y-3"
                style={{ background: 'oklch(0.97 0.012 80)', borderLeft: '3px solid var(--gold)' }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--navy)', opacity: 0.6 }}
                >
                  Ejemplo {n + 1} · no puntúa
                </p>
                <p
                  className="text-[15px] leading-relaxed"
                  style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}
                >
                  {ej.enunciado}
                </p>
                <ul className="space-y-1.5">
                  {LETRAS.map((l) => (
                    <li key={l} className="flex items-start gap-2.5 text-[13px]" style={{ color: 'var(--navy)', opacity: 0.85 }}>
                      <span className="font-semibold uppercase shrink-0" style={{ fontFamily: 'var(--font-geist-mono, monospace)' }}>
                        {l}.
                      </span>
                      <span>{ej.opciones[l]}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {ej.nota && <p className="text-sm leading-relaxed text-muted-foreground">{ej.nota}</p>}
            </div>
          ))}
        </div>

        <div className="rounded-xl p-5 space-y-2" style={{ background: 'oklch(0.96 0.005 80)' }}>
          {[
            'No hay respuestas buenas ni malas: cada persona piensa y actúa según su carácter y sus intereses.',
            'Responde lo más espontánea y sinceramente posible, sin reflexionar demasiado.',
            'Elige una sola alternativa por pregunta y responde todas. Si ninguna te convence del todo, elige la que creas mejor.',
            'No hay tiempo límite, pero no te detengas demasiado en cada pregunta.',
            'Al elegir una alternativa pasarás automáticamente a la siguiente; puedes volver atrás para cambiar una respuesta.',
          ].map((t) => (
            <div key={t} className="flex items-start gap-2.5">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--gold)' }} />
              <span className="text-[13px]" style={{ color: 'var(--navy)', opacity: 0.8 }}>
                {t}
              </span>
            </div>
          ))}
        </div>

        {borradorPrevio > 0 && (
          <div
            className="rounded-xl px-4 py-3 text-xs leading-relaxed"
            style={{
              background: 'oklch(0.72 0.12 68 / 0.08)',
              border: '1px solid oklch(0.72 0.12 68 / 0.24)',
              color: 'var(--navy)',
            }}
          >
            Recuperamos tu avance: ya respondiste {borradorPrevio} de {TOTAL} preguntas. Podrás
            continuar donde lo dejaste.
          </div>
        )}

        <button
          onClick={comenzar}
          className="px-8 py-3 rounded-lg text-sm font-medium"
          style={{ background: 'var(--navy)', color: 'var(--cream)' }}
        >
          {borradorPrevio > 0 ? 'Continuar →' : 'Comenzar →'}
        </button>
      </div>
    )
  }

  // ── Envío (sin puntaje para el candidato) ───────────────────────────────────
  if (fase === 'envio') {
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
            {isPending ? 'Guardando tus respuestas…' : 'Has completado esta etapa de la evaluación.'}
          </p>
        </div>
        {isPending ? (
          <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--navy)', borderTopColor: 'transparent' }} />
        ) : (
          <button
            onClick={enviar}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-medium"
            style={{ background: 'var(--navy)', color: 'var(--cream)' }}
          >
            Continuar →
          </button>
        )}
      </div>
    )
  }

  // ── Revisión ───────────────────────────────────────────────────────────────
  if (fase === 'revision') {
    const completo = sinResponder === 0
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2
            className="text-2xl font-light"
            style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)', letterSpacing: '-0.02em' }}
          >
            Revisión
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {completo
              ? `Respondiste las ${TOTAL} preguntas. Si quieres cambiar alguna respuesta, selecciona su número; si no, envía tus respuestas.`
              : `Faltan ${sinResponder} ${sinResponder === 1 ? 'pregunta' : 'preguntas'} por responder. Debes responder todas antes de enviar.`}
          </p>
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
          {respuestas.map((r, i) => {
            const pendiente = r === null
            return (
              <button
                key={i}
                onClick={() => irAPregunta(i)}
                aria-label={`Pregunta ${i + 1}${pendiente ? ', sin responder' : `, respondida ${r.toUpperCase()}`}`}
                className="rounded-lg py-2 text-xs font-medium transition-colors"
                style={{
                  fontFamily: 'var(--font-geist-mono, monospace)',
                  background: pendiente ? 'oklch(0.72 0.12 68 / 0.14)' : 'oklch(0.96 0.005 80)',
                  color: 'var(--navy)',
                  border: '1px solid',
                  borderColor: pendiente ? 'var(--gold)' : 'oklch(0.92 0.005 80)',
                }}
              >
                {i + 1}
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
          <button
            onClick={() => {
              setDesdeRevision(false)
              setIndex(TOTAL - 1)
              setFase('preguntas')
            }}
            className="px-5 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'oklch(0.96 0.005 80)', color: 'var(--navy)' }}
          >
            ← Volver
          </button>
          <button
            onClick={enviar}
            disabled={!completo || isPending}
            className="px-8 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40"
            style={{ background: 'var(--navy)', color: 'var(--cream)' }}
          >
            Enviar respuestas
          </button>
        </div>
      </div>
    )
  }

  // ── Preguntas — una por pantalla ────────────────────────────────────────────
  const progreso = (respondidas / TOTAL) * 100
  const actual = respuestas[index]

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={{ color: 'var(--navy)' }}>
            Pregunta {index + 1}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {index + 1} / {TOTAL}
          </span>
        </div>
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: 'oklch(0.92 0.005 80)' }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={TOTAL}
          aria-valuenow={respondidas}
          aria-label="Preguntas respondidas"
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progreso}%`, background: 'var(--navy)' }}
          />
        </div>
      </div>

      <div
        className="rounded-xl px-5 py-4"
        style={{ background: 'oklch(0.97 0.012 80)', borderLeft: '3px solid var(--gold)' }}
      >
        <p
          className="text-[15px] leading-relaxed"
          style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}
        >
          {item.enunciado}
        </p>
      </div>

      <div className="space-y-2" role="radiogroup" aria-label={`Alternativas de la pregunta ${item.item}`}>
        {opcionesValidas.map((l) => {
          const seleccionada = actual === l
          return (
            <button
              key={l}
              role="radio"
              aria-checked={seleccionada}
              onClick={() => responder(l)}
              className="w-full text-left flex items-start gap-3 rounded-xl px-4 py-3.5 transition-all"
              style={{
                background: seleccionada ? 'oklch(0.30 0.04 268 / 0.05)' : 'oklch(0.97 0.005 80)',
                border: '1px solid',
                borderColor: seleccionada ? 'var(--navy)' : 'oklch(0.92 0.005 80)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                if (!seleccionada) e.currentTarget.style.borderColor = 'oklch(0.72 0.12 68 / 0.5)'
              }}
              onMouseLeave={(e) => {
                if (!seleccionada) e.currentTarget.style.borderColor = 'oklch(0.92 0.005 80)'
              }}
            >
              <span
                className="shrink-0 inline-flex items-center justify-center font-semibold uppercase transition-all"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: seleccionada ? 'var(--navy)' : 'white',
                  color: seleccionada ? 'var(--cream)' : 'oklch(0.65 0.03 265)',
                  border: '1px solid',
                  borderColor: seleccionada ? 'var(--navy)' : 'oklch(0.88 0.005 80)',
                  fontFamily: 'var(--font-geist-mono, monospace)',
                  fontSize: '14px',
                }}
              >
                {l}
              </span>
              <span className="text-sm leading-relaxed pt-1" style={{ color: 'var(--navy)' }}>
                {item.opciones[l]}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={retroceder}
          disabled={index === 0}
          className="px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 whitespace-nowrap shrink-0"
          style={{ background: 'oklch(0.96 0.005 80)', color: 'var(--navy)' }}
        >
          ← Anterior
        </button>
        {actual !== null ? (
          <button
            onClick={avanzarManual}
            className="px-5 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: 'oklch(0.96 0.005 80)', color: 'var(--navy)' }}
          >
            {index === TOTAL - 1 ? 'Revisar →' : 'Siguiente →'}
          </button>
        ) : (
          <span className="text-xs text-muted-foreground text-right">Elige una alternativa</span>
        )}
      </div>
    </div>
  )
}
