'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function requestPasswordResetAction(formData: FormData) {
  const email = (formData.get('email') as string | null)?.trim().toLowerCase()

  if (!email) {
    redirect('/forgot-password?error=Ingresa un correo válido.')
  }

  const supabase = await createClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/reset-password`,
  })

  if (error) {
    console.error('[FORGOT PASSWORD ERROR]', error.status, error.code, error.message)
  }

  // Respuesta uniforme: no revelamos si el correo existe.
  redirect('/forgot-password?sent=1')
}
