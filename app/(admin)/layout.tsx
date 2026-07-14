import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/sidebar'
import AdminTopbar from '@/components/admin/topbar'
import { getUserRole } from '@/lib/auth/roles'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // No hay middleware: este layout es el único gate de autenticación para
  // las rutas admin. Cada Server Action valida permisos por su cuenta.
  if (!user) redirect('/login')

  const role = getUserRole(user)

  return (
    <div className="min-h-screen flex bg-admin-gradient">
      <AdminSidebar role={role} />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar user={user} role={role} />
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
