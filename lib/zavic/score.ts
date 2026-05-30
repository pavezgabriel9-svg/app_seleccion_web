import itemsData from './data/items.json' with { type: 'json' }
import type {
  ZAVICAxis,
  ZAVICAxisValores,
  ZAVICAxisIntereses,
  ZAVICRespuesta,
  ZAVICResult,
  ZAVICSeccion,
} from '@/types/database'

interface Frase {
  pos: number
  letra: string
  texto: string
  eje: ZAVICAxis
}
interface Item {
  item: number
  seccion: ZAVICSeccion
  frases: Frase[]
}

const ITEMS = itemsData as Item[]
const itemByNum = new Map(ITEMS.map((it) => [it.item, it]))

const EMPTY_VALORES = (): Record<ZAVICAxisValores, number> => ({
  MORAL: 0, LEGALIDAD: 0, INDIFERENCIA: 0, CORRUPCION: 0,
})
const EMPTY_INTERESES = (): Record<ZAVICAxisIntereses, number> => ({
  ECONOMICO: 0, POLITICO: 0, SOCIAL: 0, RELIGIOSO: 0,
})

export function scoreZAVIC(respuestas: ZAVICRespuesta[]): ZAVICResult['resultado'] {
  const valores = EMPTY_VALORES()
  const intereses = EMPTY_INTERESES()

  for (const resp of respuestas) {
    const item = itemByNum.get(resp.item)
    if (!item) continue
    for (const frase of item.frases) {
      const rank = resp.rankings[frase.pos - 1]
      if (rank === null || rank === undefined) continue
      if (item.seccion === 'valores') {
        valores[frase.eje as ZAVICAxisValores] += rank
      } else {
        intereses[frase.eje as ZAVICAxisIntereses] += rank
      }
    }
  }

  return { valores, intereses }
}

// ─── Self-tests (solo via `node lib/zavic/score.ts`) ────────────────────────

export function runZAVICSelfTests(): boolean {
  let ok = true

  // Caso 1: respuestas vacías → todo en 0
  const empty: ZAVICRespuesta[] = ITEMS.map((it) => ({
    item: it.item,
    rankings: [null, null, null, null],
  }))
  const rE = scoreZAVIC(empty)
  const allZero =
    Object.values(rE.valores).every((v) => v === 0) &&
    Object.values(rE.intereses).every((v) => v === 0)
  console.assert(allZero, `Vacío: esperaba todos 0, obtuve ${JSON.stringify(rE)}`)
  ok = ok && allZero

  // Caso 2: respuesta completa fija → ranking 1 al primer eje, 2 al segundo, etc.
  // Para cada ítem ponemos 1 a la frase con letra A, 2 a B, 3 a C, 4 a D.
  const fixed: ZAVICRespuesta[] = ITEMS.map((it) => ({
    item: it.item,
    rankings: it.frases.map((f) =>
      f.letra === 'A' ? 1 : f.letra === 'B' ? 2 : f.letra === 'C' ? 3 : 4
    ),
  }))
  const rF = scoreZAVIC(fixed)
  const sumaV = Object.values(rF.valores).reduce((a, b) => a + b, 0)
  const sumaI = Object.values(rF.intereses).reduce((a, b) => a + b, 0)
  console.assert(sumaV === 100, `Suma VALORES esperaba 100, obtuve ${sumaV}`)
  console.assert(sumaI === 100, `Suma INTERESES esperaba 100, obtuve ${sumaI}`)
  ok = ok && sumaV === 100 && sumaI === 100

  // Caso 3: candidate "todo 1 a MORAL en VALORES" (y 4 a CORRUPCION) → MORAL=10, CORRUPCION=40
  const maxMoral: ZAVICRespuesta[] = ITEMS.map((it) => {
    if (it.seccion !== 'valores') return { item: it.item, rankings: [null, null, null, null] }
    // rank 1 a frase MORAL, 2 a LEGALIDAD, 3 a INDIFERENCIA, 4 a CORRUPCION
    const r: (number | null)[] = [null, null, null, null]
    for (const f of it.frases) {
      const v = f.eje === 'MORAL' ? 1 : f.eje === 'LEGALIDAD' ? 2 : f.eje === 'INDIFERENCIA' ? 3 : 4
      r[f.pos - 1] = v
    }
    return { item: it.item, rankings: r }
  })
  const rM = scoreZAVIC(maxMoral)
  console.assert(rM.valores.MORAL === 10, `MORAL esperaba 10, obtuve ${rM.valores.MORAL}`)
  console.assert(rM.valores.CORRUPCION === 40, `CORRUPCION esperaba 40, obtuve ${rM.valores.CORRUPCION}`)
  console.assert(rM.valores.LEGALIDAD === 20, `LEGALIDAD esperaba 20, obtuve ${rM.valores.LEGALIDAD}`)
  console.assert(rM.valores.INDIFERENCIA === 30, `INDIFERENCIA esperaba 30, obtuve ${rM.valores.INDIFERENCIA}`)
  ok =
    ok &&
    rM.valores.MORAL === 10 &&
    rM.valores.LEGALIDAD === 20 &&
    rM.valores.INDIFERENCIA === 30 &&
    rM.valores.CORRUPCION === 40

  console.log(ok ? 'ZAVIC self-tests: OK' : 'ZAVIC self-tests: FALLARON')
  return ok
}

const invokedDirectly =
  typeof process !== 'undefined' &&
  typeof process.argv?.[1] === 'string' &&
  process.argv[1].replace(/\\/g, '/').endsWith('lib/zavic/score.ts')

if (invokedDirectly) {
  const passed = runZAVICSelfTests()
  if (typeof process !== 'undefined') process.exitCode = passed ? 0 : 1
}
