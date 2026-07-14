'use server'

import { createClient } from '@/lib/supabase/server'
import { passwordSchema } from '@/lib/auth/password'
import { redirect } from 'next/navigation'

export async function updatePasswordAction(formData: FormData) {
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  const parsed = passwordSchema.safeParse(password)
  if (!parsed.success) {
    redirect(`/reset-password?error=${encodeURIComponent(parsed.error.issues[0].message)}`)
  }

  if (password !== confirm) {
    redirect('/reset-password?error=Las contraseñas no coinciden.')
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/forgot-password?error=El enlace expiró. Solicita uno nuevo.')
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    console.error('[RESET PASSWORD ERROR]', error.status, error.code, error.message)
    redirect('/reset-password?error=No se pudo actualizar la contraseña. Intenta nuevamente.')
  }

  await supabase.auth.signOut()
  redirect('/login?error=Contraseña actualizada. Inicia sesión con tu nueva contraseña.')
}
