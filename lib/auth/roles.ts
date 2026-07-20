import type { User } from '@supabase/supabase-js'
import type { UserRole } from '@/types/database'

export type { UserRole }

export function getUserRole(user: User): UserRole {
  return (user.app_metadata?.role as UserRole) ?? 'user'
}

export function isAdminOrAbove(user: User): boolean {
  const role = getUserRole(user)
  return role === 'admin' || role === 'super_admin'
}

export function isSuperAdmin(user: User): boolean {
  return getUserRole(user) === 'super_admin'
}

export function getRoleLabel(role: UserRole): string {
  if (role === 'super_admin') return 'Super Admin'
  if (role === 'admin') return 'Admin'
  return 'User'
}

export function isUserBanned(user: User): boolean {
  if (!user.banned_until) return false
  return new Date(user.banned_until) > new Date()
}

/** Devuelve true si actorRole puede banear a un usuario con targetRole */
export function canBanTarget(actorRole: UserRole, targetRole: UserRole): boolean {
  if (targetRole === 'super_admin') return false
  if (actorRole === 'super_admin') return true
  if (actorRole === 'admin') return targetRole === 'user'
  return false
}
