import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Route handler que canjea el `code` del enlace de Supabase (recovery, magic link, etc.)
 * por una sesión real. Debe ser un Route Handler — no un Server Component —
 * porque solo aquí las cookies son escribibles.
 *
 * Tras el intercambio redirige a `?next=` (por defecto `/`).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const errorDescription = searchParams.get('error_description')

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/forgot-password?error=${encodeURIComponent(errorDescription)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/forgot-password?error=Enlace inválido.`
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[AUTH CALLBACK]', error.status, error.code, error.message)
    return NextResponse.redirect(
      `${origin}/forgot-password?error=El enlace no es válido o expiró. Solicita uno nuevo.`
    )
  }

  return NextResponse.redirect(`${origin}${next}`)
}
