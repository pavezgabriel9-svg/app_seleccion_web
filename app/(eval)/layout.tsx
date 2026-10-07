import type { ReactNode } from 'react'
import Image from 'next/image'

export default function EvalLayout({ children }: { children: ReactNode }) {
  return (
    <div data-theme="evaluation" className="relative min-h-screen bg-background">
      {/* Marca de agua decorativa (no captura clics) */}
      <div aria-hidden="true" className="eval-watermark" />

      <header className="relative z-10 px-6 py-5 border-b border-border/40">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          {/* logo_cramer.png es el cuadrado rojo de CramerLogo.png ya recortado (200x200):
              así next/image sirve una versión nítida y no hay que recortar con CSS */}
          <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-[3px]">
            <Image
              src="/logo_cramer.png"
              alt="Cramer"
              fill
              sizes="44px"
              quality={95}
              priority
              className="object-cover"
            />
          </span>
          <span className="font-display text-base font-light tracking-wide text-navy">
            Evaluación
          </span>
        </div>
      </header>
      <main className="relative z-10 px-6 py-16">
        {children}
      </main>
    </div>
  )
}
