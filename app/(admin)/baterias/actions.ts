'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/roles'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ─── Types ────────────────────────────────────────────────────────────────────

export type BatteryActionState = { error: string } | null

export type EvaluationActionState =
  | { token: string }
  | { error: string }
  | null

// ─── Create Battery ───────────────────────────────────────────────────────────

const CreateBatterySchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
})

export async function createBatteryAction(
  _prevState: BatteryActionState,
  formData: FormData
): Promise<BatteryActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const parsed = CreateBatterySchema.safeParse({ name: formData.get('name') })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const testIds = formData.getAll('testIds') as string[]
  if (testIds.length === 0) return { error: 'Selecciona al menos una prueba' }

  // Create battery
  const { data: battery, error: batteryError } = await supabase
    .from('batteries')
    .insert({ name: parsed.data.name, admin_id: user.id })
    .select('id')
    .single()

  if (batteryError || !battery) return { error: 'Error al crear la batería' }

  // Create battery_tests — position determined by DOM checkbox order
  const batteryTests = testIds.map((testId, index) => ({
    battery_id: battery.id,
    test_id: testId,
    position: index,
  }))

  const { error: testsError } = await supabase
    .from('battery_tests')
    .insert(batteryTests)

  if (testsError) {
    // Rollback battery on partial failure
    await supabase.from('batteries').delete().eq('id', battery.id)
    return { error: 'Error al agregar las pruebas a la batería' }
  }

  redirect(`/baterias/${battery.id}`)
}

// ─── Delete Battery ───────────────────────────────────────────────────────────

export async function deleteBatteryAction(
  batteryId: string,
  _formData: FormData
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase
    .from('batteries')
    .delete()
    .eq('id', batteryId)
    .eq('admin_id', user.id)

  revalidatePath('/baterias')
  redirect('/baterias')
}

// ─── Create Evaluation Session ────────────────────────────────────────────────

export async function createEvaluationAction(
  batteryId: string,
  _prevState: EvaluationActionState,
  _formData: FormData
): Promise<EvaluationActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  // Verificar que la batería existe y el usuario tiene acceso (RLS la filtra)
  const { data: battery } = await supabase
    .from('batteries')
    .select('id')
    .eq('id', batteryId)
    .single()

  if (!battery) return { error: 'Batería no encontrada' }

  // Fetch tests ordered by position to build snapshot
  const { data: batteryTests } = await supabase
    .from('battery_tests')
    .select('position, tests(id, name, path, has_practice)')
    .eq('battery_id', batteryId)
    .order('position', { ascending: true })

  const testsSnapshot = (batteryTests ?? []).map((bt) => bt.tests)

  const { data: session, error } = await supabase
    .from('evaluation_sessions')
    .insert({
      battery_id: batteryId,
      admin_id: user.id,
      creator_role: getUserRole(user),
      tests_snapshot: testsSnapshot as never,
      status: 'pending',
    })
    .select('token')
    .single()

  if (error || !session) return { error: 'Error al crear la evaluación' }

  revalidatePath(`/baterias/${batteryId}`)
  return { token: session.token as string }
}
