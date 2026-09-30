'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  token: string
}

export function CopyLinkButton({ token }: Props) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    const url = `${window.location.origin}/postular/${token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={copy}
      className="h-8 gap-1.5 text-xs transition-all duration-200"
      style={
        copied
          ? { borderColor: '#2D9E6B', color: '#2D9E6B', background: '#2D9E6B0D' }
          : undefined
      }
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5" />
          Copiado
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          Copiar enlace
        </>
      )}
    </Button>
  )
}
