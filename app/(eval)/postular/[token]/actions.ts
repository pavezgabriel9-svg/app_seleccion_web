'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { validarDocumento } from '@/lib/documento'
import type { TestSnapshot } from '@/types/database'

// ─── Ingreso a una convocatoria (link compartido con lista blanca) ────────────
//
// Ver docs/plans/2026-09-23-convocatorias-link-compartido.md — "Flujo del
// candidato". Los 3 casos posibles:
//   1. RUT no habilitado           → mensaje opaco, no crea ninguna fila.
//   2. RUT habilitado con sesión   → completed: mensaje; in_progress: al hub.
//   3. RUT habilitado sin sesión   → crea la sesión y la reclama.
//
// El mensaje de rechazo es deliberadamente el mismo para "convocatoria
// inválida" y para "RUT no habilitado": no debe permitir distinguir si el
// link es válido ni revelar quién está en la lista.

const MENSAJE_RECHAZO =
  'Tu RUT no está habilitado para esta evaluación. Contacta a quien te envió el enlace.'

const MENSAJE_YA_RENDIDA =
  'Ya completaste esta evaluación. Si crees que esto es un error, contacta a quien te envió el enlace.'

const MENSAJE_ERROR_GENERICO =
  'Ocurrió un error al procesar tu ingreso. Intenta nuevamente.'

function cookieNameFor(sessionId: string) {
  return `cv_${sessionId}`
}

async function setSessionCookie(sessionId: string, sessionToken: string) {
  const cookieStore = await cookies()
  cookieStore.set(cookieNameFor(sessionId), sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 días
  })
}

export async function ingresarConvocatoriaAction(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const convocatoriaToken = formData.get('token') as string
  const nombre = (formData.get('nombre') as string)?.trim()

  if (!nombre || nombre.length < 2)
    return { error: 'Por favor ingresa tu nombre completo' }

  // Reutiliza exactamente la misma validación de documento que el flujo
  // individual — no se duplica la lógica de RUT/DNI.
  const documento = validarDocumento(formData.get('rut') as string | null)
  if (!documento.ok) return { error: documento.error }

  const supabase = createServiceClient()

  const { data: convocatoria } = await supabase
    .from('convocatorias')
    .select('id, activa, expira_at, battery_id, tests_snapshot, admin_id, creator_role')
    .eq('token', convocatoriaToken)
    .single()

  if (!convocatoria) return { error: MENSAJE_RECHAZO }

  const vigente =
    convocatoria.activa &&
    (!convocatoria.expira_at || new Date(convocatoria.expira_at) > new Date())

  if (!vigente) return { error: MENSAJE_RECHAZO }

  const { data: habilitado } = await supabase
    .from('convocatoria_habilitados')
    .select('id, session_id')
    .eq('convocatoria_id', convocatoria.id)
    .eq('rut', documento.valor)
    .maybeSingle()

  if (!habilitado) return { error: MENSAJE_RECHAZO }

  // ── Caso 2: ya tiene una sesión asignada ────────────────────────────────
  if (habilitado.session_id) {
    const { data: session } = await supabase
      .from('evaluation_sessions')
      .select('id, token, status')
      .eq('id', habilitado.session_id)
      .single()

    if (!session) return { error: MENSAJE_RECHAZO }
    if (session.status === 'completed') return { error: MENSAJE_YA_RENDIDA }

    await setSessionCookie(session.id, session.token as string)
    redirect(`/eval/${session.token}/hub`)
  }

  // ── Caso 3: sin sesión aún — crear una y reclamar el habilitado ─────────
  const snapshot = (convocatoria.tests_snapshot ?? []) as TestSnapshot[]
  if (!snapshot.length) return { error: MENSAJE_RECHAZO }

  const { data: newSession, error: sessionError } = await supabase
    .from('evaluation_sessions')
    .insert({
      battery_id: convocatoria.battery_id,
      admin_id: convocatoria.admin_id,
      creator_role: convocatoria.creator_role,
      tests_snapshot: snapshot as never,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      convocatoria_id: convocatoria.id,
    })
    .select('id, token')
    .single()

  if (sessionError || !newSession) return { error: MENSAJE_ERROR_GENERICO }

  const { error: candidateError } = await supabase
    .from('candidates')
    .insert({ session_id: newSession.id, nombre, rut: documento.valor })

  if (candidateError) {
    // No dejar sesiones huérfanas sin candidato.
    await supabase.from('evaluation_sessions').delete().eq('id', newSession.id)
    return { error: MENSAJE_ERROR_GENERICO }
  }

  // Candado de concurrencia: mismo patrón que startEvaluationAction — el
  // UPDATE solo tiene efecto si nadie más reclamó este habilitado primero.
  const { data: claimed } = await supabase
    .from('convocatoria_habilitados')
    .update({ session_id: newSession.id, ingresado_at: new Date().toISOString() })
    .eq('id', habilitado.id)
    .is('session_id', null)
    .select('id')

  if (!claimed?.length) {
    // Perdimos la carrera: descartar la sesión que acabamos de crear (el
    // candidato asociado cae con ella por ON DELETE CASCADE) y redirigir a
    // la sesión que sí quedó registrada.
    await supabase.from('evaluation_sessions').delete().eq('id', newSession.id)

    const { data: winner } = await supabase
      .from('convocatoria_habilitados')
      .select('session_id')
      .eq('id', habilitado.id)
      .single()

    if (!winner?.session_id) return { error: MENSAJE_RECHAZO }

    const { data: winnerSession } = await supabase
      .from('evaluation_sessions')
      .select('id, token')
      .eq('id', winner.session_id)
      .single()

    if (!winnerSession) return { error: MENSAJE_RECHAZO }

    await setSessionCookie(winnerSession.id, winnerSession.token as string)
    redirect(`/eval/${winnerSession.token}/hub`)
  }

  await setSessionCookie(newSession.id, newSession.token as string)
  redirect(`/eval/${newSession.token}/hub`)
}
