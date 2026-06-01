import itemsData from './data/items.json' with { type: 'json' }
import type {
  CognitivoCategoria,
  CognitivoItem,
  CognitivoRespuesta,
  CognitivoResult,
} from '@/types/database'

const ITEMS = itemsData as CognitivoItem[]
const itemById = new Map(ITEMS.map((it) => [it.id, it]))

function esCorrecta(item: CognitivoItem, respuesta: unknown): boolean {
  if (respuesta === null || respuesta === undefined || respuesta === '') return false

  switch (item.tipo) {
    case 'multiple_5':
    case 'multiple_3': {
      const r = typeof respuesta === 'string' ? parseInt(respuesta, 10) : respuesta
      return typeof r === 'number' && r === item.respuesta_correcta
    }
    case 'si_no': {
      const r = String(respuesta).trim().toUpperCase()
      return r === item.respuesta_correcta
    }
    case 'numerica': {
      const r = typeof respuesta === 'number' ? respuesta : parseFloat(String(respuesta).replace(/[$.\s]/g, '').replace(',', '.'))
      if (Number.isNaN(r)) return false
      const tol = item.tolerancia ?? 0
      return Math.abs(r - item.respuesta_correcta) <= tol
    }
    case 'texto_corto': {
      const norm = (s: string) => s.trim().toLowerCase()
      const r = norm(String(respuesta))
      if (r === norm(item.respuesta_correcta)) return true
      if (item.respuestas_aceptadas) {
        return item.respuestas_aceptadas.some((a) => norm(a) === r)
      }
      return false
    }
    case 'silogismo': {
      const r = String(respuesta).trim().toLowerCase()
      return r === item.respuesta_correcta
    }
    case 'visual': {
      // Respuesta numérica directa (e.g., contar elementos)
      if (typeof item.respuesta_correcta === 'number') {
        const r = typeof respuesta === 'number' ? respuesta : parseInt(String(respuesta), 10)
        return !Number.isNaN(r) && r === item.respuesta_correcta
      }
      // Respuesta CSV (single o multi). Normaliza: split, trim, sort numérico, join.
      const norm = (s: string) =>
        s
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean)
          .sort((a, b) => Number(a) - Number(b))
          .join(',')
      return norm(String(respuesta)) === norm(String(item.respuesta_correcta))
    }
  }
}

function categoriaFor(puntaje: number): CognitivoResult['resultado']['categoria'] {
  if (puntaje <= 14) return 'Bajo'
  if (puntaje <= 22) return 'Promedio'
  if (puntaje <= 32) return 'Alto'
  return 'Muy alto'
}

export function scoreCognitivo(
  respuestas: CognitivoRespuesta[]
): CognitivoResult['resultado'] {
  let puntaje = 0
  let respondidas = 0
  const por_categoria: Record<CognitivoCategoria, { correctas: number; total: number }> = {
    verbal:   { correctas: 0, total: 0 },
    numerico: { correctas: 0, total: 0 },
    logico:   { correctas: 0, total: 0 },
    espacial: { correctas: 0, total: 0 },
    atencion: { correctas: 0, total: 0 },
  }

  for (const item of ITEMS) {
    por_categoria[item.categoria].total++
  }

  for (const resp of respuestas) {
    const item = itemById.get(resp.item)
    if (!item) continue
    if (resp.respuesta !== null && resp.respuesta !== '') respondidas++
    if (esCorrecta(item, resp.respuesta)) {
      puntaje++
      por_categoria[item.categoria].correctas++
    }
  }

  return {
    puntaje,
    categoria: categoriaFor(puntaje),
    por_categoria,
    items_respondidos: respondidas,
  }
}

// ─── Self-tests (solo via `node lib/cognitivo/score.ts`) ────────────────────

export function runCognitivoSelfTests(): boolean {
  let ok = true

  // Caso 1: vacío
  const empty: CognitivoRespuesta[] = ITEMS.map((it) => ({ item: it.id, respuesta: null }))
  const r1 = scoreCognitivo(empty)
  console.assert(r1.puntaje === 0, `Vacío: esperaba 0, obtuve ${r1.puntaje}`)
  console.assert(r1.items_respondidos === 0, `Respondidas vacío: ${r1.items_respondidos}`)
  ok = ok && r1.puntaje === 0

  // Caso 2: todas correctas
  const allCorrect: CognitivoRespuesta[] = ITEMS.map((it) => {
    let resp: number | string
    switch (it.tipo) {
      case 'multiple_5':
      case 'multiple_3':
      case 'numerica':
      case 'visual':
        resp = it.respuesta_correcta as number | string
        break
      case 'si_no':
      case 'silogismo':
      case 'texto_corto':
        resp = it.respuesta_correcta
        break
    }
    return { item: it.id, respuesta: resp }
  })
  const r2 = scoreCognitivo(allCorrect)
  console.assert(r2.puntaje === ITEMS.length, `Todas: esperaba ${ITEMS.length}, obtuve ${r2.puntaje}`)
  ok = ok && r2.puntaje === ITEMS.length

  // Caso 3: todas incorrectas (respuesta deliberadamente mala)
  const allWrong: CognitivoRespuesta[] = ITEMS.map((it) => {
    let resp: number | string
    switch (it.tipo) {
      case 'multiple_5': resp = it.respuesta_correcta === 1 ? 2 : 1; break
      case 'multiple_3': resp = it.respuesta_correcta === 1 ? 2 : 1; break
      case 'si_no':      resp = it.respuesta_correcta === 'SI' ? 'NO' : 'SI'; break
      case 'numerica':   resp = it.respuesta_correcta + 999; break
      case 'texto_corto':resp = '___xxx___'; break
      case 'silogismo':  resp = it.respuesta_correcta === 'verdadero' ? 'falso' : 'verdadero'; break
      case 'visual':     resp = '___xxx___'; break
    }
    return { item: it.id, respuesta: resp }
  })
  const r3 = scoreCognitivo(allWrong)
  console.assert(r3.puntaje === 0, `Todas mal: esperaba 0, obtuve ${r3.puntaje}`)
  ok = ok && r3.puntaje === 0

  // Caso 4: categorización de puntajes
  console.assert(categoriaFor(10) === 'Bajo', `cat 10 = ${categoriaFor(10)}`)
  console.assert(categoriaFor(20) === 'Promedio', `cat 20 = ${categoriaFor(20)}`)
  console.assert(categoriaFor(30) === 'Alto', `cat 30 = ${categoriaFor(30)}`)
  console.assert(categoriaFor(40) === 'Muy alto', `cat 40 = ${categoriaFor(40)}`)

  console.log(ok ? 'Cognitivo self-tests: OK' : 'Cognitivo self-tests: FALLARON')
  return ok
}

const invokedDirectly =
  typeof process !== 'undefined' &&
  typeof process.argv?.[1] === 'string' &&
  process.argv[1].replace(/\\/g, '/').endsWith('lib/cognitivo/score.ts')

if (invokedDirectly) {
  const passed = runCognitivoSelfTests()
  if (typeof process !== 'undefined') process.exitCode = passed ? 0 : 1
}
