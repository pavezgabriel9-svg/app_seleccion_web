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

function invertLegacyRank(rank: number | null): number | null {
  return rank === null ? null : 5 - rank
}

/**
 * Devuelve siempre puntajes en la convención canónica:
 * 4 = mayor preferencia, 1 = menor preferencia y puntaje alto = mayor presencia.
 *
 * Los resultados v1 se recalculan desde sus respuestas para no depender de
 * supuestos sobre ítems incompletos. Si un registro histórico no contiene el
 * detalle, se usa la equivalencia de una aplicación completa:
 * puntaje_v2 = 50 - puntaje_v1.
 */
export function normalizeZAVICResult(data: ZAVICResult): ZAVICResult['resultado'] {
  if (data.version === '2.0') return data.resultado

  if (Array.isArray(data.respuestas) && data.respuestas.length > 0) {
    const normalizedResponses = data.respuestas.map((respuesta) => ({
      item: respuesta.item,
      rankings: respuesta.rankings.map(invertLegacyRank),
    }))
    return scoreZAVIC(normalizedResponses)
  }

  return {
    valores: {
      MORAL: 50 - data.resultado.valores.MORAL,
      LEGALIDAD: 50 - data.resultado.valores.LEGALIDAD,
      INDIFERENCIA: 50 - data.resultado.valores.INDIFERENCIA,
      CORRUPCION: 50 - data.resultado.valores.CORRUPCION,
    },
    intereses: {
      ECONOMICO: 50 - data.resultado.intereses.ECONOMICO,
      POLITICO: 50 - data.resultado.intereses.POLITICO,
      SOCIAL: 50 - data.resultado.intereses.SOCIAL,
      RELIGIOSO: 50 - data.resultado.intereses.RELIGIOSO,
    },
  }
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

  // Caso 2: respuesta completa fija → puntaje 4 a A, 3 a B, 2 a C y 1 a D.
  const fixed: ZAVICRespuesta[] = ITEMS.map((it) => ({
    item: it.item,
    rankings: it.frases.map((f) =>
      f.letra === 'A' ? 4 : f.letra === 'B' ? 3 : f.letra === 'C' ? 2 : 1
    ),
  }))
  const rF = scoreZAVIC(fixed)
  const sumaV = Object.values(rF.valores).reduce((a, b) => a + b, 0)
  const sumaI = Object.values(rF.intereses).reduce((a, b) => a + b, 0)
  console.assert(sumaV === 100, `Suma VALORES esperaba 100, obtuve ${sumaV}`)
  console.assert(sumaI === 100, `Suma INTERESES esperaba 100, obtuve ${sumaI}`)
  ok = ok && sumaV === 100 && sumaI === 100

  // Caso 3: preferencia máxima sostenida por MORAL → MORAL=40, CORRUPCIÓN=10.
  const maxMoral: ZAVICRespuesta[] = ITEMS.map((it) => {
    if (it.seccion !== 'valores') return { item: it.item, rankings: [null, null, null, null] }
    const r: (number | null)[] = [null, null, null, null]
    for (const f of it.frases) {
      const v = f.eje === 'MORAL' ? 4 : f.eje === 'LEGALIDAD' ? 3 : f.eje === 'INDIFERENCIA' ? 2 : 1
      r[f.pos - 1] = v
    }
    return { item: it.item, rankings: r }
  })
  const rM = scoreZAVIC(maxMoral)
  console.assert(rM.valores.MORAL === 40, `MORAL esperaba 40, obtuvo ${rM.valores.MORAL}`)
  console.assert(rM.valores.CORRUPCION === 10, `CORRUPCIÓN esperaba 10, obtuvo ${rM.valores.CORRUPCION}`)
  console.assert(rM.valores.LEGALIDAD === 30, `LEGALIDAD esperaba 30, obtuvo ${rM.valores.LEGALIDAD}`)
  console.assert(rM.valores.INDIFERENCIA === 20, `INDIFERENCIA esperaba 20, obtuvo ${rM.valores.INDIFERENCIA}`)
  ok =
    ok &&
    rM.valores.MORAL === 40 &&
    rM.valores.LEGALIDAD === 30 &&
    rM.valores.INDIFERENCIA === 20 &&
    rM.valores.CORRUPCION === 10

  // Caso 4: el mismo patrón guardado como v1 se normaliza al resultado v2.
  const legacyResponses: ZAVICRespuesta[] = fixed.map((respuesta) => ({
    item: respuesta.item,
    rankings: respuesta.rankings.map(invertLegacyRank),
  }))
  const legacyResult: ZAVICResult = {
    respuestas: legacyResponses,
    resultado: scoreZAVIC(legacyResponses),
    metadata: {
      duracion_total_s: 0,
      items_sin_responder: 0,
      tab_switch_count: 0,
      out_of_focus_duration: 0,
    },
    version: '1.0',
  }
  const normalizedLegacy = normalizeZAVICResult(legacyResult)
  const legacyMatchesV2 = JSON.stringify(normalizedLegacy) === JSON.stringify(rF)
  console.assert(legacyMatchesV2, 'Normalización v1 → v2 no conserva el mismo perfil')
  ok = ok && legacyMatchesV2

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
