import { Metadata } from 'next'
import ForgotPasswordForm from './forgot-password-form'

export const metadata: Metadata = {
  title: 'Recuperar contraseña',
}

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>
}) {
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
            Recuperar contraseña
          </h2>
          <p className="text-sm text-muted-foreground">
            Si el envío de correos está habilitado, recibirás un enlace para crear una
            nueva contraseña. Si no llega en unos minutos, contacta a tu administrador
            para que te genere un enlace de recuperación.
          </p>
        </div>

        <ForgotPasswordForm searchParams={searchParams} />
      </div>
    </div>
  )
}
