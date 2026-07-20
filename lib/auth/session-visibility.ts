import type { User } from '@supabase/supabase-js'
import { getUserRole } from './roles'

/**
 * Fuente única de verdad para "quién puede ver qué evaluación".
 *
 * Jerarquía:
 *   - super_admin → ve todas las evaluaciones
 *   - admin       → las suyas + todas las creadas por cuentas con rol 'user'
 *   - user        → solo las suyas
 *
 * Se aplica sobre cualquier query a `evaluation_sessions`. Debe mantenerse en
 * sincronía con la política RLS `sessions_select` (supabase/migrations/002_*).
 * RLS es la segunda línea de defensa a nivel de base de datos; esta función es
 * la primera, a nivel de aplicación.
 */

// Contrato estructural mínimo del query builder de Supabase que necesitamos.
// Evita acoplar el helper a los tipos genéricos internos de PostgREST.
interface SessionQuery {
  eq(column: string, value: string): this
  or(filters: string): this
}

export function applySessionVisibility<Q extends SessionQuery>(
  query: Q,
  user: User
): Q {
  const role = getUserRole(user)

  // super_admin: sin filtro adicional, ve todo.
  if (role === 'super_admin') return query

  // admin: sus propias evaluaciones O cualquiera creada por un 'user'.
  if (role === 'admin') {
    return query.or(`admin_id.eq.${user.id},creator_role.eq.user`)
  }

  // user (y cualquier rol por defecto): solo las suyas.
  return query.eq('admin_id', user.id)
}
