'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isAdminOrAbove, isSuperAdmin, getUserRole, canBanTarget } from '@/lib/auth/roles'
import { passwordSchema } from '@/lib/auth/password'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'

/**
 * Base URL de la app para armar el enlace de recuperación.
 *
 * Priorizamos el host real del request (donde el admin está generando el enlace):
 * en local será localhost:3000 y en producción el dominio actual. Esto evita que
 * un NEXT_PUBLIC_APP_URL apuntando a un deployment viejo de Vercel genere enlaces
 * rotos (DEPLOYMENT_NOT_FOUND). Solo caemos a la env var si no hay host disponible.
 */
async function getAppOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  if (host) {
    const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
    return `${proto}://${host}`
  }
  return (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
}

// ─── Auth guards ───────────────────────────────────────────────────────────────

async function requireAdminOrAbove() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminOrAbove(user)) {
    throw new Error('Sin permisos')
  }
  return user
}

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isSuperAdmin(user)) {
    throw new Error('Sin permisos')
  }
  return user
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateAdminState = { error: string } | { success: string } | null

// ─── Create User ──────────────────────────────────────────────────────────────

const CreateAdminSchema = z.object({
  email: z.string().email('Ingresa un email válido'),
  password: passwordSchema,
  role: z.enum(['user', 'admin']),
})

export async function createAdminAction(
  _prevState: CreateAdminState,
  formData: FormData
): Promise<CreateAdminState> {
  let actor: Awaited<ReturnType<typeof requireAdminOrAbove>>
  try {
    actor = await requireAdminOrAbove()
  } catch {
    return { error: 'Sin permisos para realizar esta acción' }
  }

  const parsed = CreateAdminSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  // Solo super_admin puede crear admins
  const actorRole = getUserRole(actor)
  if (parsed.data.role === 'admin' && actorRole !== 'super_admin') {
    return { error: 'Solo un Super Admin puede crear administradores' }
  }

  const service = createServiceClient()

  // Verificar que el email no esté ya registrado
  const { data: existing } = await service.auth.admin.listUsers({ perPage: 200 })
  const emailExists = existing.users.some(
    (u) => u.email?.toLowerCase() === parsed.data.email.toLowerCase()
  )
  if (emailExists) {
    return { error: 'Ya existe un usuario con ese email' }
  }

  const { error } = await service.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    app_metadata: { role: parsed.data.role },
  })

  if (error) return { error: error.message }

  revalidatePath('/usuarios')
  return { success: `Usuario ${parsed.data.email} creado como ${parsed.data.role === 'admin' ? 'Admin' : 'User'}` }
}

// ─── Toggle Ban ───────────────────────────────────────────────────────────────

export async function toggleBanAction(userId: string, ban: boolean): Promise<void> {
  // Obtener actor y validar que sea admin o superior
  const supabase = await createClient()
  const { data: { user: actor } } = await supabase.auth.getUser()
  if (!actor || !isAdminOrAbove(actor)) return

  const actorRole = getUserRole(actor)
  const service = createServiceClient()

  // Obtener el rol del usuario objetivo
  const { data: targetData } = await service.auth.admin.getUserById(userId)
  if (!targetData?.user) return

  const targetRole = getUserRole(targetData.user)

  // Validar jerarquía: solo se puede banear a un nivel inferior
  if (!canBanTarget(actorRole, targetRole)) return

  await service.auth.admin.updateUserById(userId, {
    ban_duration: ban ? '876000h' : 'none',
  })

  revalidatePath('/usuarios')
}

// ─── Generate Recovery Link ───────────────────────────────────────────────────

export type GenerateRecoveryLinkResult =
  | { error: string }
  | { link: string; email: string }

/**
 * Genera un enlace de recuperación de contraseña sin enviar email.
 * Útil cuando el SMTP no puede entregar (ej: Resend sin dominio verificado)
 * y el admin necesita compartir el link manualmente con el usuario.
 */
export async function generateRecoveryLinkAction(
  userId: string
): Promise<GenerateRecoveryLinkResult> {
  let actor: Awaited<ReturnType<typeof requireAdminOrAbove>>
  try {
    actor = await requireAdminOrAbove()
  } catch {
    return { error: 'Sin permisos para realizar esta acción' }
  }

  const service = createServiceClient()

  const { data: target } = await service.auth.admin.getUserById(userId)
  if (!target?.user?.email) {
    return { error: 'Usuario no encontrado' }
  }

  // Un enlace de recuperación permite fijar una contraseña nueva y así
  // apoderarse de la cuenta. Aplicamos la misma jerarquía que el ban:
  // solo se puede generar para uno mismo o para un rol estrictamente inferior.
  // Sin esto, un admin podría resetear la clave de un super_admin y usurparlo.
  const actorRole = getUserRole(actor)
  const targetRole = getUserRole(target.user)
  const isSelf = actor.id === target.user.id
  if (!isSelf && !canBanTarget(actorRole, targetRole)) {
    return { error: 'No tienes permisos para recuperar la contraseña de este usuario' }
  }

  const { data, error } = await service.auth.admin.generateLink({
    type: 'recovery',
    email: target.user.email,
  })

  if (error || !data?.properties?.hashed_token) {
    return { error: error?.message ?? 'No se pudo generar el enlace' }
  }

  // Enlace directo a nuestra ruta /auth/confirm, que usa verifyOtp(token_hash)
  // en el servidor. No pasa por el redirect de Supabase ni requiere code_verifier,
  // por lo que funciona aunque el enlace se haya generado server-side.
  const origin = await getAppOrigin()
  const link =
    `${origin}/auth/confirm` +
    `?token_hash=${encodeURIComponent(data.properties.hashed_token)}` +
    `&type=recovery&next=/reset-password`

  return {
    link,
    email: target.user.email,
  }
}
