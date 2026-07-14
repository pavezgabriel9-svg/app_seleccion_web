import { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getUserRole, getRoleLabel, isUserBanned, canBanTarget, type UserRole } from '@/lib/auth/roles'
import { CreateAdminForm } from './create-admin-form'
import { ToggleBanButton } from './toggle-ban-button'
import { RecoveryLinkButton } from './recovery-link-button'
import { Users, ShieldCheck, Clock } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Usuarios' }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatLastSeen(iso: string | null | undefined) {
  if (!iso) return 'Nunca'
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 30) return `Hace ${days} días`
  return formatDate(iso)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoleBadge({ user }: { user: User }) {
  const role = getUserRole(user)
  const label = getRoleLabel(role)

  const styles: Record<UserRole, React.CSSProperties> = {
    super_admin: { background: 'oklch(0.72 0.12 68 / 0.15)', color: 'var(--gold)' },
    admin:       { background: 'oklch(0.20 0.06 268 / 0.10)', color: 'var(--navy)' },
    user:        { background: 'oklch(0.60 0.04 268 / 0.08)', color: 'oklch(0.45 0.05 268)' },
  }

  return (
    <span
      className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-sm"
      style={styles[role]}
    >
      {label}
    </span>
  )
}

function StatusDot({ banned }: { banned: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: banned ? 'oklch(0.58 0.22 27)' : '#2D9E6B' }}
      />
      <span className="text-xs text-muted-foreground">
        {banned ? 'Desactivado' : 'Activo'}
      </span>
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function UsuariosPage() {
  // Obtener el rol del actor para controlar visibilidad de acciones
  const supabase = await createClient()
  const { data: { user: actor } } = await supabase.auth.getUser()
  if (!actor) redirect('/login')

  const actorRole = getUserRole(actor)

  const service = createServiceClient()
  const { data } = await service.auth.admin.listUsers({ perPage: 200 })
  const users = data.users.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  const total = users.length
  const active = users.filter((u) => !isUserBanned(u)).length

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-light text-navy gold-line">Usuarios</h1>
        <p className="text-sm text-muted-foreground mt-4">
          {total} usuario{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''} ·{' '}
          {active} activo{active !== 1 ? 's' : ''}.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Users,       label: 'Total',    value: total },
          { icon: ShieldCheck, label: 'Activos',  value: active },
          { icon: Clock,       label: 'Inactivos', value: total - active },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="bg-white border border-border/50 rounded-xl p-5 flex items-center gap-4"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'oklch(0.20 0.06 268 / 0.06)' }}
            >
              <Icon className="w-4 h-4 text-navy" />
            </div>
            <div>
              <p className="text-2xl font-light text-navy">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabla de usuarios */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-border/50 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border/30">
              <h2 className="text-sm font-semibold text-navy">Todos los usuarios</h2>
            </div>
            {users.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-muted-foreground">No hay usuarios registrados.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {users.map((user) => {
                  const banned = isUserBanned(user)
                  const targetRole = getUserRole(user)
                  const showBanButton = canBanTarget(actorRole, targetRole)

                  return (
                    <div
                      key={user.id}
                      className="px-5 py-4 flex items-center gap-4"
                      style={{ opacity: banned ? 0.6 : 1 }}
                    >
                      {/* Avatar */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                        style={{ background: 'var(--navy)', color: 'var(--gold)' }}
                      >
                        {user.email?.slice(0, 2).toUpperCase() ?? '??'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{user.email}</p>
                          <RoleBadge user={user} />
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <StatusDot banned={banned} />
                          <span className="text-xs text-muted-foreground">
                            Último acceso: {formatLastSeen(user.last_sign_in_at)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Desde {formatDate(user.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {showBanButton && !banned && (
                          <RecoveryLinkButton userId={user.id} />
                        )}
                        {showBanButton && (
                          <ToggleBanButton
                            userId={user.id}
                            isBanned={banned}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Formulario de creación */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-border/50 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border/30">
              <h2 className="text-sm font-semibold text-navy">Nuevo usuario</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                El usuario podrá ingresar de inmediato.
              </p>
            </div>
            <div className="p-5">
              <CreateAdminForm actorRole={actorRole} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
