import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import ResetPasswordForm from './reset-password-form'
import { AlertCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Nueva contraseña',
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // El intercambio del `code` por sesión ocurre en /auth/callback.
  // Aquí solo confirmamos que la sesión exista antes de mostrar el form.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-admin-gradient">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2.5 text-sm px-4 py-3 rounded-md bg-destructive/8 text-destructive border border-destructive/20 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Enlace inválido o expirado.</span>
          </div>
          <a
            href="/forgot-password"
            className="text-sm text-navy underline-offset-4 hover:underline"
          >
            Solicitar un nuevo enlace
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-admin-gradient">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10">
          <div
            className="w-6 h-6 rounded-sm"
            style={{ background: 'var(--gold)' }}
          />
          <span
            className="text-xs font-semibold tracking-widest uppercase text-navy"
            style={{ fontFamily: 'var(--font-sora)' }}
          >
            App Selección
          </span>
        </div>

        <div className="mb-8">
          <h2
            className="text-3xl mb-2"
            style={{
              fontFamily: 'var(--font-fraunces)',
              color: 'var(--navy)',
            }}
          >
            Nueva contraseña
          </h2>
          <p className="text-sm text-muted-foreground">
            Hola <strong>{user.email}</strong>, define una contraseña de al menos 8 caracteres.
          </p>
        </div>

        <ResetPasswordForm error={params.error} />
      </div>
    </div>
  )
}
