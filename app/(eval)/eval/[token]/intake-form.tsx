'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { startEvaluationAction } from '../actions'

type IntakeActionState = { error: string } | null
type IntakeAction = (
  state: IntakeActionState,
  formData: FormData
) => Promise<IntakeActionState>

interface Props {
  token: string
  totalTests: number
  /**
   * Server action invocada al enviar el formulario. Por defecto usa el flujo
   * de evaluación individual (startEvaluationAction); /postular/[token] pasa
   * ingresarConvocatoriaAction para reutilizar este mismo formulario y la
   * validación de documento sin duplicar nada.
   */
  action?: IntakeAction
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3.5 px-6 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
      style={{ background: 'var(--brand)', color: 'white' }}
    >
      {pending ? (
        <>
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Registrando...
        </>
      ) : (
        'Comenzar evaluación →'
      )}
    </button>
  )
}

export function IntakeForm({ token, totalTests, action: submitAction = startEvaluationAction }: Props) {
  const [state, action] = useActionState(submitAction, null)

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-light text-navy gold-line">
          Bienvenido/a
        </h1>
        <p className="text-sm text-muted-foreground mt-5 leading-relaxed">
          Antes de comenzar, ingresa tus datos. Esta evaluación contiene{' '}
          <span className="font-medium" style={{ color: 'var(--navy)' }}>
            {totalTests} prueba{totalTests !== 1 ? 's' : ''}
          </span>
          .
        </p>
      </div>

      {/* Form */}
      <form action={action} className="space-y-5">
        <input type="hidden" name="token" value={token} />

        <div className="space-y-2">
          <label
            htmlFor="nombre"
            className="block text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: 'var(--navy)' }}
          >
            Nombre completo
          </label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            autoComplete="name"
            autoFocus
            placeholder="Juan Pérez García"
            className="w-full px-4 py-3 rounded-lg border border-border bg-white text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-muted-foreground/50"
            style={{ focusRingColor: 'var(--gold)' } as React.CSSProperties}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="rut"
            className="block text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: 'var(--navy)' }}
          >
            Documento de identidad
          </label>
          <input
            id="rut"
            name="rut"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="12.345.678-9  ·  45678912"
            className="w-full px-4 py-3 rounded-lg border border-border bg-white text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-muted-foreground/50"
          />
          <p className="text-[11px] text-muted-foreground">
            RUT chileno (con o sin puntos y guión) o DNI peruano
          </p>
        </div>

        {state?.error && (
          <div
            className="px-4 py-3 rounded-lg text-sm border"
            style={{
              background: 'oklch(0.58 0.22 27 / 0.07)',
              borderColor: 'oklch(0.58 0.22 27 / 0.25)',
              color: 'oklch(0.45 0.18 27)',
            }}
          >
            {state.error}
          </div>
        )}

        <SubmitButton />
      </form>

      {/* Disclaimer */}
      <p className="text-[11px] text-muted-foreground/60 text-center leading-relaxed border-t border-border pt-8">
        Sus datos son confidenciales y serán utilizados exclusivamente con fines de evaluación psicológica.
      </p>
    </div>
  )
}
