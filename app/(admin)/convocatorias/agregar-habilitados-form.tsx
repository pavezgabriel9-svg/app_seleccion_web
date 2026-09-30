'use client'

import { useActionState, useRef, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { agregarHabilitadosAction } from './actions'
import { Button } from '@/components/ui/button'
import { Loader2, UserPlus } from 'lucide-react'

interface Props {
  convocatoriaId: string
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      size="sm"
      variant="outline"
      disabled={pending}
      className="h-8 gap-1.5 text-xs flex-shrink-0"
    >
      {pending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <UserPlus className="w-3.5 h-3.5" />
      )}
      {pending ? 'Agregando…' : 'Agregar'}
    </Button>
  )
}

export function AgregarHabilitadosForm({ convocatoriaId }: Props) {
  const boundAction = agregarHabilitadosAction.bind(null, convocatoriaId)
  const [state, formAction] = useActionState(boundAction, null)
  const formRef = useRef<HTMLFormElement>(null)

  // Limpia el textarea tras un alta exitosa, sin tocar el resto del formulario.
  useEffect(() => {
    if (state?.success) formRef.current?.reset()
  }, [state])

  return (
    <div className="pt-3 mt-1 border-t border-border/20">
      <p className="text-[11px] font-medium text-muted-foreground mb-2">
        Agregar RUT a esta convocatoria
      </p>
      <form ref={formRef} action={formAction} className="flex flex-col sm:flex-row gap-2 items-start">
        <textarea
          name="ruts"
          rows={2}
          placeholder={'Un RUT por línea\n12.345.678-9'}
          className="flex-1 w-full rounded-md border border-input bg-white px-3 py-2 text-xs font-mono shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] resize-y"
        />
        <SubmitButton />
      </form>
      {state?.error && <p className="text-xs text-red-600 mt-1.5">{state.error}</p>}
      {state?.success && <p className="text-xs text-[#2D9E6B] mt-1.5">{state.success}</p>}
    </div>
  )
}
