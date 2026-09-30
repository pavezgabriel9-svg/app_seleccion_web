import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { isAdminOrAbove } from '@/lib/auth/roles'
import { NuevaConvocatoriaForm } from './nueva-convocatoria-form'

export const metadata: Metadata = { title: 'Nueva convocatoria' }

export default async function NuevaConvocatoriaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const superAdmin = isAdminOrAbove(user)
  let query = supabase.from('batteries').select('id, name').order('name', { ascending: true })
  if (!superAdmin) {
    query = query.eq('admin_id', user.id)
  }
  const { data: batteries } = await query

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/convocatorias" className="hover:text-navy transition-colors">
          Convocatorias
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground/70">Nueva convocatoria</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-4xl font-light text-navy gold-line">Nueva convocatoria</h1>
        <p className="text-sm text-muted-foreground mt-4">
          Un solo enlace para varios postulantes del mismo cargo, limitado a los RUT
          que habilites a continuación.
        </p>
      </div>

      {/* Form */}
      <NuevaConvocatoriaForm batteries={batteries ?? []} />
    </div>
  )
}
