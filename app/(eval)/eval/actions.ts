'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { validarDocumento } from '@/lib/documento'
import type { ExcelResult, IPVResult, TestResultData, TestSnapshot } from '@/types/database'
import { scoreIPV } from '@/lib/ipv/score'
import { scoreExcel } from '@/lib/excel/score'

// ─── Start Evaluation ─────────────────────────────────────────────────────────

export async function startEvaluationAction(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const token = formData.get('token') as string
  const nombre = (formData.get('nombre') as string)?.trim()

  if (!nombre || nombre.length < 2)
    return { error: 'Por favor ingresa tu nombre completo' }

  // Acepta RUT chileno (con dígito verificador) o DNI peruano / documento numérico.
  const documento = validarDocumento(formData.get('rut') as string | null)
  if (!documento.ok) return { error: documento.error }

  const supabase = createServiceClient()

  // Verificar que la sesión existe y tiene tests configurados
  const { data: session } = await supabase
    .from('evaluation_sessions')
    .select('id, status, tests_snapshot')
    .eq('token', token)
    .single()

  if (!session) return { error: 'Esta evaluación no existe o el enlace es inválido' }
  if (session.status === 'completed') return { error: 'Esta evaluación ya fue completada' }
  if (session.status === 'in_progress') redirect(`/eval/${token}/hub`)

  const snapshot = session.tests_snapshot as TestSnapshot[]
  if (!snapshot?.length)
    return { error: 'Esta evaluación no tiene pruebas configuradas' }

  // UPDATE atómico con condición: solo tiene efecto si status sigue siendo 'pending'.
  // Elimina la race condition entre el SELECT anterior y este UPDATE.
  const { data: updated } = await supabase
    .from('evaluation_sessions')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', session.id)
    .eq('status', 'pending')
    .select('id')

  if (!updated?.length)
    return { error: 'Esta evaluación ya fue iniciada por otra solicitud' }

  const { error: candidateError } = await supabase
    .from('candidates')
    .insert({ session_id: session.id, nombre, rut: documento.valor })

  if (candidateError)
    return { error: 'Error al registrar tus datos. Intenta nuevamente.' }

  redirect(`/eval/${token}/hub`)
}

// ─── Complete Test ────────────────────────────────────────────────────────────

export async function completeTestAction(
  sessionId: string,
  testId: string,
  token: string,
  results: TestResultData
): Promise<{ redirect: string }> {
  const supabase = createServiceClient()

  const { data: session } = await supabase
    .from('evaluation_sessions')
    .select('status, tests_snapshot')
    .eq('id', sessionId)
    .single()

  if (!session || session.status !== 'in_progress') {
    return { redirect: `/eval/${token}` }
  }

  const snapshot = session.tests_snapshot as TestSnapshot[]

  // Verify the submitted test belongs to this session's snapshot
  const testInSnapshot = snapshot.find(t => t.id === testId)
  if (!testInSnapshot) {
    return { redirect: `/eval/${token}/hub` }
  }

  // Prevent double-submission: check if this test was already saved
  const { count: existingCount } = await supabase
    .from('test_results')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('test_id', testId)

  if ((existingCount ?? 0) > 0) {
    return { redirect: `/eval/${token}/hub` }
  }

  // IPV: el puntaje se recalcula en el servidor a partir de las respuestas;
  // no se confía en el `resultado` que envía el navegador.
  let resultsToSave: TestResultData = results
  if (testId === 'ipv') {
    const ipv = results as Partial<IPVResult>
    const respuestas = Array.isArray(ipv.respuestas) ? ipv.respuestas : []
    resultsToSave = { ...ipv, tipo: 'ipv', respuestas, resultado: scoreIPV(respuestas) } as IPVResult
  }

  // Excel: la pauta solo existe en el servidor. Se sanean las respuestas y se calcula
  // `resultado` acá; el navegador nunca lo envía ni se confía en uno que traiga.
  if (testId === 'excel') {
    const excel = results as Partial<ExcelResult>
    const respuestas = (Array.isArray(excel.respuestas) ? excel.respuestas : [])
      .filter((r) => r && typeof r === 'object')
      .map((r) => ({ item: r.item, respuesta: r.respuesta ?? null }))
    resultsToSave = {
      ...excel,
      tipo: 'excel',
      respuestas,
      resultado: scoreExcel(respuestas),
    } as ExcelResult
  }

  // Save result
  await supabase.from('test_results').insert({
    session_id: sessionId,
    test_id: testId,
    results: resultsToSave as never,
  })

  // Check if all tests are now completed
  const { count: totalCompleted } = await supabase
    .from('test_results')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  if ((totalCompleted ?? 0) >= snapshot.length) {
    await supabase
      .from('evaluation_sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', sessionId)
  }

  return { redirect: `/eval/${token}/hub` }
}
