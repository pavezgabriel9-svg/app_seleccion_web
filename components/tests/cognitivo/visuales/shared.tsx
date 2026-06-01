'use client'

import type { ReactNode } from 'react'

export const STROKE = 'var(--navy)'
export const STROKE_HI = 'var(--gold)'
export const FILL = 'oklch(0.96 0.008 80)'
export const FILL_SEL = 'oklch(0.72 0.12 68 / 0.18)'

export function PuzzleBox({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div
      className="rounded-lg p-3 flex flex-col items-center gap-1.5"
      style={{ background: 'oklch(0.97 0.005 80)', border: '1px solid oklch(0.90 0.005 80)' }}
    >
      {children}
      {label && (
        <span className="text-[10px] font-mono" style={{ color: 'oklch(0.55 0.03 265)' }}>
          {label}
        </span>
      )}
    </div>
  )
}

export function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] text-center" style={{ color: 'oklch(0.55 0.03 265)' }}>
      {children}
    </p>
  )
}

export function OptionButton({
  number, selected, disabled, onClick, children,
}: {
  number: number
  selected: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={() => !disabled && onClick()}
      disabled={disabled}
      className="rounded-lg py-2 px-1 flex flex-col items-center gap-1 transition-all"
      style={{
        background: selected ? 'oklch(0.30 0.04 268 / 0.06)' : 'oklch(0.97 0.005 80)',
        border: '1px solid',
        borderColor: selected ? 'var(--navy)' : 'oklch(0.92 0.005 80)',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
      <span className="text-[10px] font-mono" style={{ color: 'var(--navy)' }}>
        {number}
      </span>
    </button>
  )
}

/** Toggle un número en un CSV con un tope máximo. Devuelve nuevo CSV ordenado. */
export function toggleInCSV(currentValue: string | null, n: number, max: number): string {
  const set = new Set(
    currentValue
      ? currentValue.split(',').map((x) => parseInt(x.trim(), 10)).filter((x) => !Number.isNaN(x))
      : []
  )
  if (set.has(n)) {
    set.delete(n)
  } else if (set.size < max) {
    set.add(n)
  }
  return Array.from(set).sort((a, b) => a - b).join(',')
}

export function csvToSet(value: string | number | null): Set<number> {
  if (value === null || value === undefined || value === '') return new Set()
  return new Set(
    String(value)
      .split(',')
      .map((x) => parseInt(x.trim(), 10))
      .filter((x) => !Number.isNaN(x))
  )
}
