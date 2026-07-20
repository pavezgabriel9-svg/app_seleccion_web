'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, FlaskConical, BarChart3, Users } from 'lucide-react'

const baseNavItems = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/baterias',   label: 'Baterías',   icon: FlaskConical },
  { href: '/resultados', label: 'Resultados', icon: BarChart3 },
]

const superAdminNavItems = [
  { href: '/usuarios', label: 'Usuarios', icon: Users },
]

interface Props {
  role: 'user' | 'admin' | 'super_admin'
}

export default function AdminSidebar({ role }: Props) {
  const pathname = usePathname()
  const isAdminOrAbove = role === 'admin' || role === 'super_admin'
  const isSuperAdmin = role === 'super_admin'
  const navItems = isAdminOrAbove
    ? [...baseNavItems, ...superAdminNavItems]
    : baseNavItems

  return (
    <aside
      className="w-64 shrink-0 hidden md:flex flex-col"
      style={{ background: 'var(--navy)' }}
    >
      {/* Logo */}
      <div className="px-6 pt-8 pb-6">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div
            className="w-7 h-7 rounded-sm transition-transform group-hover:scale-105"
            style={{ background: 'var(--gold)' }}
          />
          <div>
            <p
              className="text-xs font-semibold tracking-widest uppercase leading-none"
              style={{ color: 'var(--gold)' }}
            >
              App Selección
            </p>
            <p
              className="text-[10px] leading-none mt-1 opacity-40"
              style={{ color: 'oklch(0.90 0.01 85)', fontFamily: 'var(--font-sora)' }}
            >
              Panel de administración
            </p>
          </div>
        </Link>
      </div>

      {/* Línea divisora */}
      <div
        className="mx-6 mb-6"
        style={{ height: '1px', background: 'var(--sidebar-border)' }}
      />

      {/* Navegación */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150',
                isActive ? 'font-medium' : 'opacity-50 hover:opacity-80'
              )}
              style={
                isActive
                  ? { background: 'oklch(0.26 0.07 265)', color: 'oklch(0.95 0.005 85)' }
                  : { color: 'oklch(0.90 0.01 85)' }
              }
            >
              <Icon
                className="w-4 h-4 shrink-0"
                style={isActive ? { color: 'var(--gold)' } : {}}
              />
              {label}
              {isActive && (
                <div
                  className="ml-auto w-1 h-4 rounded-full"
                  style={{ background: 'var(--gold)' }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer sidebar */}
      <div className="p-6">
        {isSuperAdmin && (
          <div
            className="mb-3 px-3 py-2 rounded-md text-[10px] font-semibold tracking-wider uppercase"
            style={{ background: 'oklch(0.72 0.12 68 / 0.08)', color: 'var(--gold)' }}
          >
            Acceso completo
          </div>
        )}
        <div
          className="px-3 py-2 rounded-md text-xs opacity-30"
          style={{ color: 'oklch(0.90 0.01 85)' }}
        >
          <p className="font-medium">App Selección</p>
          <p>v{process.env.NEXT_PUBLIC_APP_VERSION} — Web</p>
          <p className="text-[10px]">
            {process.env.NEXT_PUBLIC_APP_COMMIT} · {process.env.NEXT_PUBLIC_APP_BUILD_DATE}
          </p>
        </div>
      </div>
    </aside>
  )
}
