'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/auth/roles'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { validarDocumento } from '@/lib/documento'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConvocatoriaActionState = { error: string } | null

// ─── Create Convocatoria ──────────────────────────────────────────────────────

const CreateConvocatoriaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(150, 'El nombre no puede superar los 150 caracteres'),
  cargo: z
    .string()
    .trim()
    .max(150, 'El cargo no puede superar los 150 caracteres')
    .optional(),
  batteryId: z.string().trim().min(1, 'Selecciona una batería'),
  expiraDias: z.coerce
    .number()
    .int('Debe ser un número entero')
    .min(0, 'Debe ser 0 o más días')
    .max(365, 'Máximo 365 días'),
})

/**
 * Parseo mínimo para Fase 1: una línea = un documento. Reutiliza
 * validarDocumento() — no se duplica la validación de RUT/DNI. El parseo
 * tolerante a "Nombre, RUT, teléfono" queda para la Fase 2 (vista previa).
 */
function parseRuts(raw: string): { validos: string[]; invalidos: string[] } {
  const lineas = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const validos = new Map<string, true>()
  const invalidos: string[] = []

  for (const linea of lineas) {
    const doc = validarDocumento(linea)
    if (doc.ok) validos.set(doc.valor, true)
    else invalidos.push(linea)
  }

  return { validos: [...validos.keys()], invalidos }
}

export async function crearConvocatoriaAction(
  _prevState: ConvocatoriaActionState,
  formData: FormData
): Promise<ConvocatoriaActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const parsed = CreateConvocatoriaSchema.safeParse({
    nombre: formData.get('nombre'),
    cargo: (formData.get('cargo') as string)?.trim() || undefined,
    batteryId: formData.get('batteryId'),
    expiraDias: (formData.get('expiraDias') as string) || '14',
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const rutsRaw = (formData.get('ruts') as string) ?? ''
  const { validos, invalidos } = parseRuts(rutsRaw)

  if (invalidos.length > 0) {
    const muestra = invalidos.slice(0, 5).join(', ')
    return {
      error: `${invalidos.length} documento${invalidos.length !== 1 ? 's' : ''} inválido${
        invalidos.length !== 1 ? 's' : ''
      }: ${muestra}${invalidos.length > 5 ? '…' : ''}. Corrígelos y vuelve a intentar.`,
    }
  }
  if (validos.length === 0) return { error: 'Ingresa al menos un RUT habilitado' }

  // Verificar que la batería existe y el usuario tiene acceso (RLS la filtra)
  const { data: battery } = await supabase
    .from('batteries')
    .select('id')
    .eq('id', parsed.data.batteryId)
    .single()

  if (!battery) return { error: 'Batería no encontrada' }

  // Snapshot de tests al momento de crear la convocatoria — mismo principio
  // que evaluation_sessions.tests_snapshot, un nivel más arriba.
  const { data: batteryTests } = await supabase
    .from('battery_tests')
    .select('position, tests(id, name, path, has_practice)')
    .eq('battery_id', parsed.data.batteryId)
    .order('position', { ascending: true })

  const testsSnapshot = (batteryTests ?? []).map((bt) => bt.tests)
  if (testsSnapshot.length === 0)
    return { error: 'Esta batería no tiene pruebas configuradas' }

  const expiraAt =
    parsed.data.expiraDias > 0
      ? new Date(Date.now() + parsed.data.expiraDias * 24 * 60 * 60 * 1000).toISOString()
      : null

  const { data: convocatoria, error } = await supabase
    .from('convocatorias')
    .insert({
      nombre: parsed.data.nombre,
      cargo: parsed.data.cargo ?? null,
      battery_id: parsed.data.batteryId,
      tests_snapshot: testsSnapshot as never,
      admin_id: user.id,
      creator_role: getUserRole(user),
      expira_at: expiraAt,
    })
    .select('id')
    .single()

  if (error || !convocatoria) return { error: 'Error al crear la convocatoria' }

  const { error: habilitadosError } = await supabase
    .from('convocatoria_habilitados')
    .insert(validos.map((rut) => ({ convocatoria_id: convocatoria.id, rut })))

  if (habilitadosError) {
    // Rollback de la convocatoria si no se pudo cargar la lista blanca.
    await supabase.from('convocatorias').delete().eq('id', convocatoria.id)
    return { error: 'Error al registrar los RUT habilitados' }
  }

  revalidatePath('/convocatorias')
  redirect('/convocatorias')
}
// ─── Cerrar / reabrir convocatoria ────────────────────────────────────────────
//
// "Dar de baja" una convocatoria = activa = false. Bloquea nuevos ingresos por
// /postular/[token] (mensaje opaco, igual que cualquier otro rechazo) pero NO
// borra la convocatoria ni la lista de habilitados, y no interrumpe a quien ya
// está rindiendo: su evaluation_session sigue in_progress y su link personal
// /eval/[token] sigue vivo hasta que termine. Es una baja lógica, reversible.
// No se ofrece borrado físico: perdería el historial de quién fue habilitado
// y quién alcanzó a rendir, que es justo lo que separa a este modelo de un
// simple "borrar y listo".

export async function cerrarConvocatoriaAction(
  convocatoriaId: string,
  _formData: FormData
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase
    .from('convocatorias')
    .update({ activa: false })
    .eq('id', convocatoriaId)

  revalidatePath('/convocatorias')
}

export async function reabrirConvocatoriaAction(
  convocatoriaId: string,
  _formData: FormData
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase
    .from('convocatorias')
    .update({ activa: true })
    .eq('id', convocatoriaId)

  revalidatePath('/convocatorias')
}
// ─── Agregar RUT a una convocatoria existente ────────────────────────────────
//
// Operativa real: los analistas van sumando postulantes a medida que pasan
// los días, o corrigen un RUT que se les quedó fuera de la lista inicial. No
// crea una convocatoria nueva ni cambia el link — solo amplía la lista blanca
// de la que ya existe. Duplicados (RUT ya habilitado en esta convocatoria) se
// omiten en silencio, sin error, para poder pegar una lista que se solape con
// la anterior sin tener que filtrarla a mano primero.

export type AgregarHabilitadosState = { error?: string; success?: string } | null

export async function agregarHabilitadosAction(
  convocatoriaId: string,
  _prevState: AgregarHabilitadosState,
  formData: FormData
): Promise<AgregarHabilitadosState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const rutsRaw = (formData.get('ruts') as string) ?? ''
  const { validos, invalidos } = parseRuts(rutsRaw)

  if (invalidos.length > 0) {
    const muestra = invalidos.slice(0, 5).join(', ')
    return {
      error: `${invalidos.length} documento${invalidos.length !== 1 ? 's' : ''} inválido${
        invalidos.length !== 1 ? 's' : ''
      }: ${muestra}${invalidos.length > 5 ? '…' : ''}. Corrígelos y vuelve a intentar.`,
    }
  }
  if (validos.length === 0) return { error: 'Ingresa al menos un RUT' }

  // RLS filtra el acceso: si la convocatoria no es visible para este usuario,
  // esto no devuelve nada y cortamos acá con el mismo mensaje genérico.
  const { data: convocatoria } = await supabase
    .from('convocatorias')
    .select('id')
    .eq('id', convocatoriaId)
    .single()
  if (!convocatoria) return { error: 'Convocatoria no encontrada' }

  const { data: existentes } = await supabase
    .from('convocatoria_habilitados')
    .select('rut')
    .eq('convocatoria_id', convocatoriaId)
    .in('rut', validos)

  const yaExisten = new Set((existentes ?? []).map((e) => e.rut))
  const nuevos = validos.filter((rut) => !yaExisten.has(rut))

  if (nuevos.length === 0) {
    return { error: 'Ese RUT ya estaba habilitado en esta convocatoria' }
  }

  const { error } = await supabase
    .from('convocatoria_habilitados')
    .insert(nuevos.map((rut) => ({ convocatoria_id: convocatoriaId, rut })))

  if (error) return { error: 'Error al agregar los RUT. Intenta nuevamente.' }

  revalidatePath('/convocatorias')

  const omitidos = validos.length - nuevos.length
  return {
    success: `${nuevos.length} RUT agregado${nuevos.length !== 1 ? 's' : ''}${
      omitidos > 0
        ? ` (${omitidos} ya estaba${omitidos !== 1 ? 'n' : ''} habilitado${omitidos !== 1 ? 's' : ''})`
        : ''
    }.`,
  }
}
