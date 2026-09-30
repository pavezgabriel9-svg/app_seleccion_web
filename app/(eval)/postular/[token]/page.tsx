import { createServiceClient } from '@/lib/supabase/server'
import type { TestSnapshot } from '@/types/database'
import { IntakeForm } from '../../eval/[token]/intake-form'
import { ingresarConvocatoriaAction } from './actions'

interface Props {
  params: Promise<{ token: string }>
}

export default async function PostularPage({ params }: Props) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: convocatoria } = await supabase
    .from('convocatorias')
    .select('activa, expira_at, tests_snapshot')
    .eq('token', token)
    .single()

  const vigente =
    !!convocatoria &&
    convocatoria.activa &&
    (!convocatoria.expira_at || new Date(convocatoria.expira_at) > new Date())

  if (!vigente) {
    return (
      <PostularMessage
        icon="✕"
        title="Enlace no disponible"
        message="Este enlace no existe, fue cerrado o expiró. Contacta a quien te lo envió."
      />
    )
  }

  const snapshot = (convocatoria.tests_snapshot ?? []) as TestSnapshot[]

  return (
    <div className="max-w-xl mx-auto">
      <IntakeForm token={token} totalTests={snapshot.length} action={ingresarConvocatoriaAction} />
    </div>
  )
}

// ─── Local helpers ─────────────────────────────────────────────────────────────

function PostularMessage({
  icon,
  title,
  message,
}: {
  icon: string
  title: string
  message: string
}) {
  return (
    <div className="max-w-xl mx-auto text-center space-y-5 py-16">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mx-auto text-lg"
        style={{
          background: 'oklch(0.58 0.22 27 / 0.08)',
          color: 'oklch(0.58 0.22 27)',
        }}
      >
        {icon}
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-light text-navy">{title}</h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
          {message}
        </p>
      </div>
    </div>
  )
}
