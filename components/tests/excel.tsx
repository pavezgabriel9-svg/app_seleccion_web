'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ExcelOpcion, ExcelResult, TestComponentProps } from '@/types/database'
// Solo preguntas.json (SIN respuestas). La pauta y la corrección viven en lib/excel/score.ts
// (server-only) y se aplican en completeTestAction: este componente nunca las importa.
import preguntasData from '@/lib/excel/data/preguntas.json' with { type: 'json' }

interface Pregunta {
  id: number
  area: number
  enunciado: string
  alternativas: { id: ExcelOpcion; texto: string }[]
}
interface Area {
  id: number
  nombre: string
  items: number[]
}
interface PreguntasData {
  titulo: string
  subtitulo: string
  tiempo_minutos: number
  instrucciones: string[]
  areas: Area[]
  preguntas: Pregunta[]
}

const DATA = preguntasData as unknown as PreguntasData
const PREGUNTAS = DATA.preguntas
const TOTAL = PREGUNTAS.length
const TIEMPO_S = DATA.tiempo_minutos * 60
const NOMBRE_AREA = new Map(DATA.areas.map((a) => [a.id, a.nombre]))
const ORIGINALES: ExcelOpcion[] = ['a', 'b', 'c', 'd']
/** Rótulos visibles: se re-rotulan a–d en el orden mostrado. */
const ROTULOS = ['a', 'b', 'c', 'd'] as const

type Fase = 'cargando' | 'instrucciones' | 'preguntas' | 'revision' | 'envio'
type Respuestas = (ExcelOpcion | null)[]

interface ExcelTestProps extends TestComponentProps {
  sessionId: string
}

// ─── Mezcla estable por candidato (semilla derivada de sessionId) ────────────

function hashSemilla(texto: string): number {
  // xmur3 (una sola salida de 32 bits)
  let h = 1779033703 ^ texto.length
  for (let i = 0; i < texto.length; i++) {
    h = Math.imul(h ^ texto.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^ (h >>> 16)) >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Orden de las alternativas (letras ORIGINALES) por ítem. Mismo sessionId → mismo orden. */
function ordenesPara(sessionId: string): Record<number, ExcelOpcion[]> {
  const rnd = mulberry32(hashSemilla(`excel:${sessionId}`))
  const ordenes: Record<number, ExcelOpcion[]> = {}
  for (const p of PREGUNTAS) {
    const orden = p.alternativas.map((a) => a.id)
    for (let i = orden.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1))
      ;[orden[i], orden[j]] = [orden[j], orden[i]]
    }
    ordenes[p.id] = orden
  }
  return ordenes
}

// ─── Borrador en localStorage (clave `excel:<sessionId>`) ─────────────────────
// r: 21 caracteres con la letra ORIGINAL ('-' = sin responder).
// s: instante de inicio (epoch ms): recargar no reinicia el cronómetro.

interface Borrador {
  s: number
  r: string
  i: number
  tab: number
  oof: number
}

function leerBorrador(sessionId: string): Borrador | null {
  try {
    const raw = window.localStorage.getItem(`excel:${sessionId}`)
    if (!raw) return null
    const b = JSON.parse(raw) as Partial<Borrador>
    if (typeof b.r !== 'string' || b.r.length !== TOTAL) return null
    if (!Number.isFinite(b.s) || (b.s as number) <= 0) return null
    return {
      s: b.s as number,
      r: b.r,
      i: Number.isInteger(b.i) ? Math.min(Math.max(b.i as number, 0), TOTAL - 1) : 0,
      tab: Number.isFinite(b.tab) ? (b.tab as number) : 0,
      oof: Number.isFinite(b.oof) ? (b.oof as number) : 0,
    }
  } catch {
    return null
  }
}

function guardarBorrador(sessionId: string, b: Borrador) {
  try {
    window.localStorage.setItem(`excel:${sessionId}`, JSON.stringify(b))
  } catch {
    /* sin almacenamiento disponible: la prueba sigue funcionando sin borrador */
  }
}

function borrarBorrador(sessionId: string) {
  try {
    window.localStorage.removeItem(`excel:${sessionId}`)
  } catch {
    /* noop */
  }
}

function serializar(r: Respuestas): string {
  return r.map((x) => x ?? '-').join('')
}

function deserializar(s: string): Respuestas {
  return Array.from(s).map((ch) => (ORIGINALES as string[]).includes(ch) ? (ch as ExcelOpcion) : null)
}

function formatearTiempo(s: number): string {
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toString().padStart(2, '0')}`
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ExcelTest({ onComplete, isPending, sessionId }: ExcelTestProps) {
  const [fase, setFase] = useState<Fase>('cargando')
  const [index, setIndex] = useState(0)
  const [respuestas, setRespuestas] = useState<Respuestas>(() => Array(TOTAL).fill(null))
  const [restante, setRestante] = useState(TIEMPO_S)
  const [recuperado, setRecuperado] = useState(0)
  const [confirmando, setConfirmando] = useState(false)
  // Si se entra a una pregunta desde la revisión, "Revisar" vuelve a la revisión.
  const [desdeRevision, setDesdeRevision] = useState(false)

  const ordenes = useMemo(() => ordenesPara(sessionId), [sessionId])

  const inicioRef = useRef<number | null>(null)
  const respuestasRef = useRef<Respuestas>(respuestas)
  const tabSwitchCountRef = useRef(0)
  const outOfFocusDurationRef = useRef(0)
  const lastHiddenAtRef = useRef<number | null>(null)
  const resultRef = useRef<ExcelResult | null>(null)
  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const respondidas = respuestas.filter((r) => r !== null).length
  const sinResponder = TOTAL - respondidas

  // Integridad: igual que ZAVIC/IPV (visibilitychange)
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

  const fijarRespuestas = useCallback((next: Respuestas) => {
    respuestasRef.current = next
    setRespuestas(next)
  }, [])

  /** Cierra la prueba (tiempo agotado o envío manual) y la envía. El cliente NO corrige. */
  const finalizar = useCallback(
    (tiempoAgotado: boolean) => {
      if (resultRef.current) return
      const ahora = Date.now()
      if (lastHiddenAtRef.current !== null) {
        outOfFocusDurationRef.current += Math.round((ahora - lastHiddenAtRef.current) / 1000)
        lastHiddenAtRef.current = null
      }
      const actuales = respuestasRef.current
      const lista = PREGUNTAS.map((p, i) => ({ item: p.id, respuesta: actuales[i] }))
      resultRef.current = {
        tipo: 'excel',
        respuestas: lista,
        orden_alternativas: ordenes,
        // sin `resultado`: lo calcula el servidor en completeTestAction
        metadata: {
          duracion_total_s: Math.round((ahora - (inicioRef.current ?? ahora)) / 1000),
          tiempo_agotado: tiempoAgotado,
          items_sin_responder: lista.filter((r) => r.respuesta === null).length,
          tab_switch_count: tabSwitchCountRef.current,
          out_of_focus_duration: outOfFocusDurationRef.current,
        },
        version: '1.0',
      }
      borrarBorrador(sessionId)
      setConfirmando(false)
      setFase('envio')
      onCompleteRef.current(resultRef.current)
    },
    [ordenes, sessionId]
  )

  // Recuperar borrador (solo en el cliente, tras montar). El cronómetro sigue desde el inicio guardado.
  useEffect(() => {
    const b = leerBorrador(sessionId)
    if (!b) {
      setFase('instrucciones')
      return
    }
    const recuperadas = deserializar(b.r)
    inicioRef.current = b.s
    tabSwitchCountRef.current = b.tab
    outOfFocusDurationRef.current = b.oof
    fijarRespuestas(recuperadas)
    setIndex(b.i)
    setRecuperado(recuperadas.filter((r) => r !== null).length)
    const transcurrido = Math.floor((Date.now() - b.s) / 1000)
    if (transcurrido >= TIEMPO_S) {
      setRestante(0)
      finalizar(true)
      return
    }
    setRestante(TIEMPO_S - transcurrido)
    setFase('preguntas')
  }, [sessionId, fijarRespuestas, finalizar])

  // Cronómetro: se calcula contra el instante de inicio (no se atrasa si el navegador frena el intervalo)
  const corriendo = fase === 'preguntas' || fase === 'revision'
  useEffect(() => {
    if (!corriendo) return
    const id = setInterval(() => {
      if (inicioRef.current === null) return
      const quedan = TIEMPO_S - Math.floor((Date.now() - inicioRef.current) / 1000)
      if (quedan <= 0) {
        clearInterval(id)
        setRestante(0)
        finalizar(true)
      } else {
        setRestante(quedan)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [corriendo, finalizar])

  // Guardar borrador en cada cambio mientras se responde
  useEffect(() => {
    if (!corriendo || inicioRef.current === null || resultRef.current) return
    guardarBorrador(sessionId, {
      s: inicioRef.current,
      r: serializar(respuestas),
      i: index,
      tab: tabSwitchCountRef.current,
      oof: outOfFocusDurationRef.current,
    })
  }, [respuestas, index, corriendo, sessionId])

  function comenzar() {
    inicioRef.current = Date.now()
    setRestante(TIEMPO_S)
    guardarBorrador(sessionId, {
      s: inicioRef.current,
      r: serializar(respuestasRef.current),
      i: 0,
      tab: tabSwitchCountRef.current,
      oof: outOfFocusDurationRef.current,
    })
    setIndex(0)
    setFase('preguntas')
  }

  function responder(letraOriginal: ExcelOpcion) {
    const next = [...respuestasRef.current]
    next[index] = letraOriginal
    fijarRespuestas(next)
  }

  function retroceder() {
    setIndex((i) => Math.max(i - 1, 0))
  }

  function avanzar() {
    if (index === TOTAL - 1 || desdeRevision) {
      setDesdeRevision(false)
      setFase('revision')
    } else {
      setIndex((i) => Math.min(i + 1, TOTAL - 1))
    }
  }

  function irAPregunta(i: number) {
    setIndex(i)
    setDesdeRevision(true)
    setConfirmando(false)
    setFase('preguntas')
  }

  function reintentarEnvio() {
    if (resultRef.current) onCompleteRef.current(resultRef.current)
  }

  // Atajos de teclado: A–D (o 1–4) eligen según el orden mostrado; flechas navegan
  const pregunta = PREGUNTAS[index]
  const orden = ordenes[pregunta.id]
  useEffect(() => {
    if (fase !== 'preguntas') return
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      const pos = ROTULOS.indexOf(k as (typeof ROTULOS)[number])
      const posNum = ['1', '2', '3', '4'].indexOf(k)
      const p = pos !== -1 ? pos : posNum
      if (p !== -1 && orden[p]) {
        e.preventDefault()
        responder(orden[p])
      } else if (k === 'arrowleft' && index > 0) {
        retroceder()
      } else if (k === 'arrowright') {
        avanzar()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // responder/retroceder/avanzar dependen del estado capturado abajo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase, index, desdeRevision, orden])

  // Cronómetro visible (alerta visual en el último minuto)
  const ultimoMinuto = restante <= 60
  const cronometro = (
    <span
      className={`font-mono text-sm font-semibold tabular-nums whitespace-nowrap ${ultimoMinuto ? 'animate-pulse' : ''}`}
      style={{
        color: ultimoMinuto ? '#CC2200' : restante <= TIEMPO_S * 0.3 ? 'oklch(0.72 0.12 68)' : 'var(--navy)',
        transition: 'color 0.4s ease',
      }}
      role="timer"
      aria-label={`Tiempo restante ${formatearTiempo(restante)}`}
    >
      {formatearTiempo(restante)}
    </span>
  )

  const avisoUltimoMinuto = ultimoMinuto && (
    <div
      className="rounded-xl px-4 py-3 text-xs leading-relaxed"
      style={{ background: 'rgb(204 34 0 / 0.08)', border: '1px solid rgb(204 34 0 / 0.28)', color: 'var(--navy)' }}
      role="alert"
    >
      Queda menos de un minuto. Al terminar el tiempo tus respuestas se enviarán automáticamente.
    </div>
  )

  // ── Cargando (lee el borrador tras montar) ───────────────────────────────────
  if (fase === 'cargando') {
    return (
      <div className="flex justify-center py-10">
        <span
          className="w-4 h-4 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--navy)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  // ── Instrucciones ────────────────────────────────────────────────────────────
  if (fase === 'instrucciones') {
    return (
      <div className="space-y-7">
        <div className="space-y-2">
          <h2
            className="text-2xl font-light"
            style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)', letterSpacing: '-0.02em' }}
          >
            {DATA.titulo}
          </h2>
          <p className="text-sm text-muted-foreground">{DATA.subtitulo}</p>
        </div>

        <div className="rounded-xl p-5 space-y-3" style={{ background: 'oklch(0.96 0.005 80)' }}>
          {[
            ...DATA.instrucciones,
            `Dispones de ${DATA.tiempo_minutos} minutos. Al terminar el tiempo, tus respuestas se enviarán automáticamente.`,
            'Puedes volver a las preguntas anteriores y cambiar una respuesta antes de enviar.',
          ].map((t) => (
            <div key={t} className="flex items-start gap-2.5">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--gold)' }} />
              <span className="text-[13px] leading-relaxed" style={{ color: 'var(--navy)', opacity: 0.8 }}>
                {t}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={comenzar}
          className="px-8 py-3 rounded-lg text-sm font-medium whitespace-nowrap"
          style={{ background: 'var(--brand)', color: 'white' }}
        >
          Comenzar →
        </button>
      </div>
    )
  }

  // ── Envío (sin puntaje para el candidato) ────────────────────────────────────
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
            onClick={reintentarEnvio}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-medium whitespace-nowrap"
            style={{ background: 'var(--brand)', color: 'white' }}
          >
            Continuar →
          </button>
        )}
      </div>
    )
  }

  // ── Revisión ─────────────────────────────────────────────────────────────────
  if (fase === 'revision') {
    const completo = sinResponder === 0
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h2
            className="text-2xl font-light"
            style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)', letterSpacing: '-0.02em' }}
          >
            Revisión
          </h2>
          {cronometro}
        </div>

        {avisoUltimoMinuto}

        <p className="text-sm leading-relaxed text-muted-foreground">
          {completo
            ? `Respondiste las ${TOTAL} preguntas. Si quieres cambiar alguna respuesta, selecciona su número; si no, envía tus respuestas.`
            : `Te ${sinResponder === 1 ? 'falta' : 'faltan'} ${sinResponder} ${sinResponder === 1 ? 'pregunta' : 'preguntas'} por responder (marcadas en rojo). Puedes enviar igual, pero una pregunta sin responder no suma puntos.`}
        </p>

        <div className="grid grid-cols-6 sm:grid-cols-7 gap-2">
          {respuestas.map((r, i) => {
            const pendiente = r === null
            return (
              <button
                key={i}
                onClick={() => irAPregunta(i)}
                aria-label={`Pregunta ${i + 1}${pendiente ? ', sin responder' : ', respondida'}`}
                className="rounded-lg py-2 text-xs font-medium transition-colors"
                style={{
                  fontFamily: 'var(--font-geist-mono, monospace)',
                  background: pendiente ? 'rgb(216 31 15 / 0.14)' : 'oklch(0.96 0.005 80)',
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

        {confirmando && !completo && (
          <div
            className="rounded-xl px-4 py-3 text-sm leading-relaxed space-y-3"
            style={{ background: 'rgb(216 31 15 / 0.06)', border: '1px solid rgb(216 31 15 / 0.24)', color: 'var(--navy)' }}
          >
            <p>
              Aún {sinResponder === 1 ? 'tienes 1 pregunta' : `tienes ${sinResponder} preguntas`} sin responder. Si envías ahora,{' '}
              {sinResponder === 1 ? 'no sumará' : 'no sumarán'} puntos. ¿Quieres enviar de todos modos?
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => finalizar(false)}
                disabled={isPending}
                className="px-5 py-2 rounded-lg text-sm font-medium whitespace-nowrap disabled:opacity-40"
                style={{ background: 'var(--brand)', color: 'white' }}
              >
                Sí, enviar
              </button>
              <button
                onClick={() => setConfirmando(false)}
                className="px-5 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
                style={{ background: 'oklch(0.96 0.005 80)', color: 'var(--navy)' }}
              >
                Seguir respondiendo
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
          <button
            onClick={() => {
              setDesdeRevision(false)
              setConfirmando(false)
              setIndex(TOTAL - 1)
              setFase('preguntas')
            }}
            className="px-5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap shrink-0"
            style={{ background: 'oklch(0.96 0.005 80)', color: 'var(--navy)' }}
          >
            ← Volver
          </button>
          <button
            onClick={() => (completo ? finalizar(false) : setConfirmando(true))}
            disabled={isPending}
            className="px-8 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 disabled:opacity-40"
            style={{ background: 'var(--brand)', color: 'white' }}
          >
            Enviar respuestas
          </button>
        </div>
      </div>
    )
  }

  // ── Preguntas — una por pantalla ─────────────────────────────────────────────
  const progreso = (respondidas / TOTAL) * 100
  const actual = respuestas[index]
  const area = NOMBRE_AREA.get(pregunta.area) ?? ''
  const textoDe = new Map(pregunta.alternativas.map((a) => [a.id, a.texto]))

  return (
    <div className="space-y-6">
      {recuperado > 0 && index === 0 && respondidas === recuperado && (
        <div
          className="rounded-xl px-4 py-3 text-xs leading-relaxed"
          style={{ background: 'rgb(216 31 15 / 0.08)', border: '1px solid rgb(216 31 15 / 0.24)', color: 'var(--navy)' }}
        >
          Recuperamos tu avance: ya respondiste {recuperado} de {TOTAL} preguntas. El tiempo siguió corriendo.
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium" style={{ color: 'var(--navy)' }}>
            Pregunta {index + 1}
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
              {index + 1} / {TOTAL}
            </span>
            {cronometro}
          </div>
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
            style={{ width: `${progreso}%`, background: 'var(--brand)' }}
          />
        </div>
      </div>

      {avisoUltimoMinuto}

      {/* Texto no seleccionable y sin copiar / menú contextual: disuasivo para pegar las preguntas en una IA */}
      <div
        className="space-y-6 select-none"
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="space-y-2">
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: 'var(--navy)', opacity: 0.6 }}
          >
            {area}
          </p>
          <div
            className="rounded-xl px-5 py-4"
            style={{ background: 'oklch(0.97 0.012 80)', borderLeft: '3px solid var(--gold)' }}
          >
            <p
              className="text-[15px] leading-relaxed"
              style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}
            >
              {pregunta.enunciado}
            </p>
          </div>
        </div>

        <div className="space-y-2" role="radiogroup" aria-label={`Alternativas de la pregunta ${pregunta.id}`}>
          {orden.map((original, pos) => {
            const seleccionada = actual === original
            return (
              <button
                key={original}
                role="radio"
                aria-checked={seleccionada}
                onClick={() => responder(original)}
                className="w-full text-left flex items-start gap-3 rounded-xl px-4 py-3.5 transition-all"
                style={{
                  background: seleccionada ? 'rgb(216 31 15 / 0.05)' : 'oklch(0.97 0.005 80)',
                  border: '1px solid',
                  borderColor: seleccionada ? 'var(--brand)' : 'oklch(0.92 0.005 80)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!seleccionada) e.currentTarget.style.borderColor = 'rgb(216 31 15 / 0.5)'
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
                    background: seleccionada ? 'var(--brand)' : 'white',
                    color: seleccionada ? 'var(--cream)' : 'oklch(0.65 0.03 265)',
                    border: '1px solid',
                    borderColor: seleccionada ? 'var(--brand)' : 'oklch(0.88 0.005 80)',
                    fontFamily: 'var(--font-geist-mono, monospace)',
                    fontSize: '14px',
                  }}
                >
                  {ROTULOS[pos]}
                </span>
                <span className="text-sm leading-relaxed pt-1" style={{ color: 'var(--navy)' }}>
                  {textoDe.get(original)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 gap-3">
        <button
          onClick={retroceder}
          disabled={index === 0}
          className="px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-40 whitespace-nowrap shrink-0"
          style={{ background: 'oklch(0.96 0.005 80)', color: 'var(--navy)' }}
        >
          ← Anterior
        </button>
        <button
          onClick={avanzar}
          className="px-5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap shrink-0"
          style={
            actual !== null
              ? { background: 'var(--brand)', color: 'white' }
              : { background: 'oklch(0.96 0.005 80)', color: 'var(--navy)' }
          }
        >
          {index === TOTAL - 1 || desdeRevision ? 'Revisar →' : 'Siguiente →'}
        </button>
      </div>
    </div>
  )
}
