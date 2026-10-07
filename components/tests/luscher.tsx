'use client'

import { useState, useRef } from 'react'
import type { ReactNode } from 'react'
import Image from 'next/image'
import type { TestComponentProps, LuscherResult } from '@/types/database'

// ─── Constantes hoistadas ─────────────────────────────────────────────────────

const GRISES = [
  { id: 3, color: 'rgb(219,216,195)', border: false },
  { id: 4, color: 'rgb(255,255,255)', border: true  },
  { id: 0, color: 'rgb(197,188,171)', border: false },
  { id: 2, color: 'rgb(34,34,35)',    border: false },
  { id: 1, color: 'rgb(156,148,137)', border: false },
] as const

const COLORES = [
  { id: 5, color: 'rgb(153,0,102)'  },
  { id: 1, color: 'rgb(0,51,102)'   },
  { id: 0, color: 'rgb(128,128,128)'},
  { id: 3, color: 'rgb(204,51,51)'  },
  { id: 4, color: 'rgb(255,204,0)'  },
  { id: 7, color: 'rgb(0,0,0)'      },
  { id: 6, color: 'rgb(102,51,0)'   },
  { id: 2, color: 'rgb(0,102,102)'  },
] as const

// Display order matches original: 4,5,3,0,6,2,1
const FORMAS = [
  { id: 4 }, { id: 5 }, { id: 3 },
  { id: 0 }, { id: 6 }, { id: 2 }, { id: 1 },
] as const

const STEP_LABELS  = ['Grises', 'Colores I', 'Formas', 'Colores II'] as const
const STEP_COUNTS  = [GRISES.length, COLORES.length, FORMAS.length, COLORES.length]

// ─── Imagen por ID de forma ───────────────────────────────────────────────────
// Los archivos viven en /public (0.png … 6.png), por lo que el id de la forma
// mapea directo al nombre del archivo.

const FORMA_ALT: Record<number, string> = {
  0: 'Hexágono',
  1: 'Círculo',
  2: 'Cuadrado concéntrico',
  3: 'Triángulo',
  4: 'Círculo inscrito en cuadrado',
  5: 'Estrella de cuatro puntas',
  6: 'Figura ondulada',
}

function FormaShape({ id }: { id: number }) {
  return (
    <Image
      src={`/${id}.png`}
      alt={FORMA_ALT[id] ?? `Forma ${id}`}
      width={56}
      height={56}
      draggable={false}
      style={{ width: 52, height: 52, objectFit: 'contain', userSelect: 'none' }}
    />
  )
}

// ─── Layout en filas ──────────────────────────────────────────────────────────

/** Parte un arreglo en filas de `size` elementos (la última puede ser menor). */
function chunk<T>(arr: readonly T[], size: number): T[][] {
  const filas: T[][] = []
  for (let i = 0; i < arr.length; i += size) filas.push(arr.slice(i, i + size))
  return filas
}

/** Fila centrada de ítems; hace wrap solo si la pantalla es muy angosta. */
function ItemRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-center gap-3 sm:gap-4">{children}</div>
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function LuscherTest({ onComplete, isPending }: TestComponentProps) {
  const [step, setStep]             = useState(0)
  const [clickedIds, setClickedIds] = useState<number[]>([])
  const [showNext, setShowNext]     = useState(false)

  // Resultados acumulados en ref (rerender-use-ref-transient-values)
  const resultsRef = useRef({ grises: [] as number[], colores1: [] as number[], formas: [] as number[], colores2: [] as number[] })

  function handleItemClick(id: number) {
    if (clickedIds.includes(id)) return
    const newClicked = [...clickedIds, id]
    setClickedIds(newClicked)

    const keys = ['grises', 'colores1', 'formas', 'colores2'] as const
    resultsRef.current[keys[step]] = newClicked

    if (newClicked.length === STEP_COUNTS[step]) setShowNext(true)
  }

  function handleNext() {
    if (step < 3) {
      setStep(s => s + 1)
      setClickedIds([])
      setShowNext(false)
    } else {
      onComplete(resultsRef.current as LuscherResult)
    }
  }

  const remaining = STEP_COUNTS[step] - clickedIds.length
  const isLast    = step === 3

  // ── Helpers de render por tipo de ítem ──────────────────────────────────────

  function colorBox(id: number, color: string, size: number, hasBorder: boolean) {
    const clicked = clickedIds.includes(id)
    return (
      <button key={id} onClick={() => handleItemClick(id)} disabled={clicked}
        className="rounded-lg transition-all duration-200"
        style={{
          width: `${size}px`, height: `${size * 0.67}px`,
          background: color,
          border: hasBorder ? '1px solid oklch(0.80 0.01 80)' : '1px solid transparent',
          opacity: clicked ? 0.12 : 1,
          transform: clicked ? 'scale(0.85)' : 'scale(1)',
          cursor: clicked ? 'default' : 'pointer',
        }} />
    )
  }

  function formaBox(id: number) {
    const clicked = clickedIds.includes(id)
    const order   = clicked ? clickedIds.indexOf(id) + 1 : null
    return (
      <button key={id} onClick={() => handleItemClick(id)} disabled={clicked}
        className="flex items-center justify-center rounded-xl transition-all duration-200"
        style={{
          width: '80px', height: '80px',
          background: clicked ? 'oklch(0.96 0.005 80)' : 'white',
          border: `2px solid ${clicked ? 'oklch(0.88 0.01 80)' : 'oklch(0.85 0.01 80)'}`,
          opacity: clicked ? 0.3 : 1,
          transform: clicked ? 'scale(0.88)' : 'scale(1)',
          cursor: clicked ? 'default' : 'pointer',
        }}>
        {!clicked && <FormaShape id={id} />}
        {clicked && <span className="text-xs font-medium text-muted-foreground">{order}</span>}
      </button>
    )
  }

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-1.5">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="rounded-full transition-all duration-300"
                style={{
                  width: i === step ? '20px' : '6px',
                  height: '6px',
                  background: i === step ? 'var(--gold)' : i < step ? 'oklch(0.20 0.06 268 / 0.35)' : 'oklch(0.88 0.01 80)',
                }} />
              {i < STEP_LABELS.length - 1 && (
                <div className="w-3 h-px" style={{ background: 'oklch(0.88 0.01 80)' }} />
              )}
            </div>
          ))}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-light" style={{ color: 'var(--navy)', fontFamily: 'var(--font-fraunces, serif)' }}>
            Lüscher — {STEP_LABELS[step]}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Selecciona del más al menos preferido
          </p>
        </div>
      </div>

      {/* Items — branch per step para tipos correctos.
          Grises: 5 en una fila · Colores I/II: 4 + 4 · Formas: 4 + 3 */}
      <div className="flex flex-col items-center gap-3 sm:gap-4 py-4">
        {step === 0 && chunk(GRISES, 5).map((fila, i) => (
          <ItemRow key={i}>{fila.map(item => colorBox(item.id, item.color, 72, item.border))}</ItemRow>
        ))}
        {(step === 1 || step === 3) && chunk(COLORES, 4).map((fila, i) => (
          <ItemRow key={i}>{fila.map(item => colorBox(item.id, item.color, 64, false))}</ItemRow>
        ))}
        {step === 2 && chunk(FORMAS, 4).map((fila, i) => (
          <ItemRow key={i}>{fila.map(item => formaBox(item.id))}</ItemRow>
        ))}
      </div>

      {/* Contador */}
      {!showNext && (
        <p className="text-center text-xs text-muted-foreground">
          {remaining} {remaining === 1 ? 'elemento restante' : 'elementos restantes'}
        </p>
      )}

      {/* Avanzar */}
      {showNext && (
        <div className="flex justify-center">
          <button onClick={handleNext} disabled={isPending}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-medium disabled:opacity-60"
            style={{ background: 'var(--brand)', color: 'white' }}>
            {isPending
              ? <><span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />Guardando...</>
              : isLast ? 'Finalizar Lüscher →' : `Continuar a ${STEP_LABELS[step + 1]} →`}
          </button>
        </div>
      )}
    </div>
  )
}
