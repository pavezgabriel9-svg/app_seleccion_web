'use client'

import { useTransition } from 'react'
import { cerrarConvocatoriaAction, reabrirConvocatoriaAction } from './actions'
import { Button } from '@/components/ui/button'
import { Loader2, Lock, Unlock } from 'lucide-react'

interface Props {
  convocatoriaId: string
  convocatoriaNombre: string
  activa: boolean
}

export function CerrarConvocatoriaButton({ convocatoriaId, convocatoriaNombre, activa }: Props) {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (activa) {
      const confirmed = window.confirm(
        `¿Dar de baja la convocatoria "${convocatoriaNombre}"?\n\nEl enlace dejará de aceptar nuevos ingresos. Quien ya esté rindiendo su evaluación puede seguir hasta terminar, y puedes reabrirla cuando quieras.`
      )
      if (!confirmed) return
      startTransition(() => {
        cerrarConvocatoriaAction(convocatoriaId, new FormData())
      })
    } else {
      startTransition(() => {
        reabrirConvocatoriaAction(convocatoriaId, new FormData())
      })
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        disabled={isPending}
        className={
          activa
            ? 'h-8 gap-1.5 text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors'
            : 'h-8 gap-1.5 text-xs text-muted-foreground hover:text-navy hover:bg-accent/50 transition-colors'
        }
      >
        {isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : activa ? (
          <Lock className="w-3.5 h-3.5" />
        ) : (
          <Unlock className="w-3.5 h-3.5" />
        )}
        {isPending ? 'Guardando…' : activa ? 'Dar de baja' : 'Reabrir'}
      </Button>
    </form>
  )
}
