'use client'

import { useFormStatus } from 'react-dom'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { updatePasswordAction } from './actions'
import { PASSWORD_HINT } from '@/lib/auth/password'
import { AlertCircle, Loader2 } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full h-11 text-sm font-medium tracking-wide"
      style={{ background: 'var(--navy)', color: 'var(--cream)' }}
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar contraseña'}
    </Button>
  )
}

export default function ResetPasswordForm({ error }: { error?: string }) {
  return (
    <form action={updatePasswordAction} className="space-y-5">
      {error && (
        <div className="flex items-center gap-2.5 text-sm px-4 py-3 rounded-md bg-destructive/8 text-destructive border border-destructive/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="password" className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
          Nueva contraseña
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="••••••••"
          className="h-11 bg-white border-border/60 focus:border-accent focus-visible:ring-accent/30"
        />
        <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm" className="text-xs font-medium tracking-wider uppercase text-muted-foreground">
          Confirmar contraseña
        </Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="••••••••"
          className="h-11 bg-white border-border/60 focus:border-accent focus-visible:ring-accent/30"
        />
      </div>

      <SubmitButton />
    </form>
  )
}
