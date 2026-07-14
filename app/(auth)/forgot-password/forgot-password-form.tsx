'use client'

import { use } from 'react'
import { useFormStatus } from 'react-dom'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { requestPasswordResetAction } from './actions'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full h-11 text-sm font-medium tracking-wide"
      style={{ background: 'var(--navy)', color: 'var(--cream)' }}
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar enlace'}
    </Button>
  )
}

export default function ForgotPasswordForm({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>
}) {
  const params = use(searchParams)
  const error = params?.error
  const sent = params?.sent === '1'

  if (sent) {
    return (
      <div className="flex flex-col items-start gap-3 text-sm px-4 py-4 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-medium">Revisa tu correo</span>
        </div>
        <p className="text-xs leading-relaxed">
          Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.
          Puede tardar unos minutos. Recuerda revisar la carpeta de spam.
        </p>
        <a
          href="/login"
          className="text-xs underline-offset-4 hover:underline text-emerald-900"
        >
          Volver al inicio de sesión
        </a>
      </div>
    )
  }

  return (
    <form action={requestPasswordResetAction} className="space-y-5">
      {error && (
        <div className="flex items-center gap-2.5 text-sm px-4 py-3 rounded-md bg-destructive/8 text-destructive border border-destructive/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
          Correo electrónico
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="admin@empresa.cl"
          className="h-11 bg-white border-border/60 focus:border-accent focus-visible:ring-accent/30"
        />
      </div>

      <SubmitButton />

      <div className="text-center pt-1">
        <a
          href="/login"
          className="text-xs text-muted-foreground hover:text-navy underline-offset-4 hover:underline transition-colors"
        >
          Volver al inicio de sesión
        </a>
      </div>
    </form>
  )
}
