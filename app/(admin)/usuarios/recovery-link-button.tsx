'use client'

import { useState, useTransition } from 'react'
import { KeyRound, Copy, Check, X } from 'lucide-react'
import { generateRecoveryLinkAction } from './actions'

interface Props {
  userId: string
}

export function RecoveryLinkButton({ userId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function handleClick() {
    setError(null)
    setLink(null)
    setEmail(null)
    setCopied(false)
    setOpen(true)
    startTransition(async () => {
      const result = await generateRecoveryLinkAction(userId)
      if ('error' in result) {
        setError(result.error)
      } else {
        setLink(result.link)
        setEmail(result.email)
      }
    })
  }

  async function handleCopy() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('No se pudo copiar al portapapeles')
    }
  }

  function close() {
    setOpen(false)
    setLink(null)
    setEmail(null)
    setError(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
        style={{
          borderColor: 'oklch(0.20 0.06 268 / 0.2)',
          color: 'var(--navy)',
          background: 'oklch(0.20 0.06 268 / 0.04)',
        }}
        title="Generar enlace de recuperación de contraseña"
      >
        <KeyRound className="w-3 h-3" />
        Recuperar
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={close}
        >
          <div
            className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-navy">Enlace de recuperación</h3>
                {email && (
                  <p className="text-xs text-muted-foreground mt-0.5">para {email}</p>
                )}
              </div>
              <button
                type="button"
                onClick={close}
                className="text-muted-foreground hover:text-navy"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isPending && (
              <p className="text-sm text-muted-foreground">Generando enlace…</p>
            )}

            {error && (
              <div className="text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            {link && (
              <>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  Comparte este enlace con el usuario por un canal seguro (WhatsApp, Slack, etc.).
                  Al abrirlo podrá definir una nueva contraseña. <strong>El enlace expira en 1 hora.</strong>
                </p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={link}
                    className="flex-1 text-xs px-3 py-2 bg-muted/40 border border-border/60 rounded-md font-mono truncate"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-xs font-medium px-3 py-2 rounded-md flex items-center gap-1.5 flex-shrink-0"
                    style={{ background: 'var(--navy)', color: 'var(--cream)' }}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
