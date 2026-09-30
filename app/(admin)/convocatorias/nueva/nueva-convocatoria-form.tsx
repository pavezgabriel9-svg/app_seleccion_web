'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { crearConvocatoriaAction } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface Battery {
  id: string
  name: string
}

interface Props {
  batteries: Battery[]
}

const fieldClassName =
  'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={disabled || pending}
      style={{ background: 'var(--navy)', color: 'var(--cream)' }}
      className="w-full sm:w-auto gap-2"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Creando convocatoria…
        </>
      ) : (
        'Crear convocatoria'
      )}
    </Button>
  )
}

export function NuevaConvocatoriaForm({ batteries }: Props) {
  const [state, formAction] = useActionState(crearConvocatoriaAction, null)

  return (
    <form action={formAction} className="space-y-8">
      {/* Datos generales */}
      <div className="bg-white border border-border/50 rounded-xl p-6 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="nombre" className="text-sm font-medium text-navy">
            Nombre de la convocatoria
          </Label>
          <Input
            id="nombre"
            name="nombre"
            placeholder="Ej: Operarios planta — sept 2026"
            required
            className="h-11 text-base"
            style={{ borderColor: 'oklch(0.20 0.06 268 / 0.20)' }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cargo" className="text-sm font-medium text-navy">
            Cargo <span className="text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <Input
            id="cargo"
            name="cargo"
            placeholder="Ej: Operario de producción"
            className="h-11 text-base"
            style={{ borderColor: 'oklch(0.20 0.06 268 / 0.20)' }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="batteryId" className="text-sm font-medium text-navy">
            Batería de pruebas
          </Label>
          {batteries.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No tienes baterías creadas todavía. Crea una primero en{' '}
              <Link href="/baterias/nueva" className="underline">
                Baterías
              </Link>
              .
            </p>
          ) : (
            <select id="batteryId" name="batteryId" required defaultValue="" className={fieldClassName}>
              <option value="" disabled>
                Selecciona una batería
              </option>
              {batteries.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="expiraDias" className="text-sm font-medium text-navy">
            Expira en (días)
          </Label>
          <Input
            id="expiraDias"
            name="expiraDias"
            type="number"
            min={0}
            max={365}
            defaultValue={14}
            required
            className="h-11 text-base max-w-[140px]"
            style={{ borderColor: 'oklch(0.20 0.06 268 / 0.20)' }}
          />
          <p className="text-xs text-muted-foreground">
            0 = sin expiración. Cerrar la convocatoria antes de tiempo queda para más
            adelante; por ahora la expiración es el único control.
          </p>
        </div>
      </div>

      {/* RUT habilitados */}
      <div className="bg-white border border-border/50 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border/30">
          <h2 className="text-sm font-semibold text-navy">RUT habilitados</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Un documento por línea (RUT chileno o DNI). Solo quienes estén en esta
            lista podrán ingresar por el enlace.
          </p>
        </div>
        <div className="p-6">
          <textarea
            name="ruts"
            required
            rows={8}
            placeholder={'12.345.678-9\n9.876.543-2\n45678912'}
            className={`${fieldClassName} font-mono resize-y`}
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {state.error}
        </p>
      )}

      <SubmitButton disabled={batteries.length === 0} />
    </form>
  )
}
