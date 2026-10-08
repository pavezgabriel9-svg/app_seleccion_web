import 'server-only'
import pautaData from './data/pauta.json' with { type: 'json' }
import preguntasData from './data/preguntas.json' with { type: 'json' }
import type {
  ExcelNivel,
  ExcelOpcion,
  ExcelRespuesta,
  ExcelResult,
} from '@/types/database'

// ─── Datos ────────────────────────────────────────────────────────────────────
// La pauta SOLO se importa acá. Este módulo lleva `import 'server-only'`: si un
// componente cliente lo importara, el build falla y la pauta no llega al navegador.

interface PautaData {
  version: string
  respuestas: Record<string, ExcelOpcion>
  niveles: { basico_max_pct: number; intermedio_max_pct: number }
}
interface AreaDef {
  id: number
  nombre: string
  items: number[]
}
interface PreguntasData {
  areas: AreaDef[]
  preguntas: { id: number; area: number }[]
}

const PAUTA = pautaData as unknown as PautaData
const PREGUNTAS = preguntasData as unknown as PreguntasData

const OPCIONES: readonly ExcelOpcion[] = ['a', 'b', 'c', 'd']

export const EXCEL_TOTAL_ITEMS = PREGUNTAS.preguntas.length
export const EXCEL_AREAS: readonly AreaDef[] = PREGUNTAS.areas

const AREA_POR_ITEM = new Map(PREGUNTAS.preguntas.map((p) => [p.id, p.area]))
const NOMBRE_AREA = new Map(PREGUNTAS.areas.map((a) => [a.id, a.nombre]))

function esRespuestaValida(item: number, opcion: unknown): opcion is ExcelOpcion {
  if (!Number.isInteger(item) || item < 1 || item > EXCEL_TOTAL_ITEMS) return false
  return typeof opcion === 'string' && (OPCIONES as readonly string[]).includes(opcion)
}

/** Última respuesta válida por ítem; todo lo demás cuenta como no respondido. */
function marcadasDe(respuestas: unknown): Map<number, ExcelOpcion> {
  const marcadas = new Map<number, ExcelOpcion>()
  for (const r of Array.isArray(respuestas) ? (respuestas as ExcelRespuesta[]) : []) {
    if (r && esRespuestaValida(r.item, r.respuesta)) marcadas.set(r.item, r.respuesta as ExcelOpcion)
  }
  return marcadas
}

// ─── Nivel ────────────────────────────────────────────────────────────────────

/**
 * Básico ≤ 60 % · Intermedio > 60 % y ≤ 85 % · Avanzado > 85 %.
 * Se calcula sobre el porcentaje (18/21 = 85,7 % → Avanzado).
 */
export function nivelExcel(porcentaje: number): ExcelNivel {
  if (porcentaje <= PAUTA.niveles.basico_max_pct) return 'Básico'
  if (porcentaje <= PAUTA.niveles.intermedio_max_pct) return 'Intermedio'
  return 'Avanzado'
}

// ─── Corrección ───────────────────────────────────────────────────────────────

type ResultadoExcel = NonNullable<ExcelResult['resultado']>

/** Función pura. Ítems fuera de 1–21 u opciones inválidas cuentan como no respondidos. */
export function scoreExcel(respuestas: ExcelRespuesta[]): ResultadoExcel {
  const marcadas = marcadasDe(respuestas)

  const porArea: Record<string, { correctas: number; total: number }> = {}
  for (const a of PREGUNTAS.areas) porArea[a.nombre] = { correctas: 0, total: a.items.length }

  let puntaje = 0
  for (const [item, opcion] of marcadas) {
    if (PAUTA.respuestas[String(item)] !== opcion) continue
    puntaje++
    porArea[NOMBRE_AREA.get(AREA_POR_ITEM.get(item)!)!].correctas++
  }

  const total = EXCEL_TOTAL_ITEMS
  const pct = (puntaje * 100) / total
  return {
    puntaje,
    total,
    porcentaje: Math.round(pct * 10) / 10,
    nivel: nivelExcel(pct),
    por_area: porArea,
    items_respondidos: marcadas.size,
  }
}

export interface ExcelDetalleItem {
  item: number
  area: string
  respondida: boolean
  /** Letra original del Word marcada por el candidato (null si no respondió). */
  respuesta: ExcelOpcion | null
  /** Letra original correcta según la pauta. */
  correcta: ExcelOpcion
  acierto: boolean
}

/** Detalle por ítem para la tarjeta del analista (solo se llama en el servidor). */
export function detalleExcel(respuestas: ExcelRespuesta[]): ExcelDetalleItem[] {
  const marcadas = marcadasDe(respuestas)
  return PREGUNTAS.preguntas.map((p) => {
    const respuesta = marcadas.get(p.id) ?? null
    const correcta = PAUTA.respuestas[String(p.id)]
    return {
      item: p.id,
      area: NOMBRE_AREA.get(p.area)!,
      respondida: respuesta !== null,
      respuesta,
      correcta,
      acierto: respuesta === correcta,
    }
  })
}

// ─── Self-tests (solo via `node --conditions=react-server lib/excel/score.ts`) ──
// `--conditions=react-server` hace que `server-only` no lance fuera de Next.

function desdePauta(): ExcelRespuesta[] {
  return Array.from({ length: EXCEL_TOTAL_ITEMS }, (_, i) => ({
    item: i + 1,
    respuesta: PAUTA.respuestas[String(i + 1)],
  }))
}

/** Respuestas con exactamente `n` aciertos (los primeros n ítems correctos, el resto en blanco). */
function conAciertos(n: number): ExcelRespuesta[] {
  return desdePauta().map((r) => (r.item <= n ? r : { item: r.item, respuesta: null }))
}

export async function runExcelSelfTests(): Promise<boolean> {
  let ok = true
  const fallos: string[] = []
  const check = (cond: boolean, msg: string) => {
    if (!cond) {
      ok = false
      fallos.push(msg)
    }
  }

  // 1) Pauta completa → 21/21, 100 %, Avanzado, todas las áreas completas
  const perfecto = scoreExcel(desdePauta())
  check(perfecto.puntaje === 21 && perfecto.total === 21, `Pauta completa: puntaje ${perfecto.puntaje}/${perfecto.total}`)
  check(perfecto.porcentaje === 100, `Pauta completa: porcentaje ${perfecto.porcentaje}`)
  check(perfecto.nivel === 'Avanzado', `Pauta completa: nivel ${perfecto.nivel}`)
  check(perfecto.items_respondidos === 21, `Pauta completa: items_respondidos ${perfecto.items_respondidos}`)
  for (const [area, v] of Object.entries(perfecto.por_area)) {
    check(v.correctas === v.total && v.total > 0, `Pauta completa / ${area}: ${v.correctas}/${v.total}`)
  }
  check(Object.keys(perfecto.por_area).length === 6, `Se esperaban 6 áreas, hay ${Object.keys(perfecto.por_area).length}`)

  // 2) Todo vacío → 0, Básico, items_respondidos = 0
  const vacio = scoreExcel(Array.from({ length: 21 }, (_, i) => ({ item: i + 1, respuesta: null })))
  check(vacio.puntaje === 0 && vacio.porcentaje === 0, `Vacío: puntaje ${vacio.puntaje}`)
  check(vacio.nivel === 'Básico', `Vacío: nivel ${vacio.nivel}`)
  check(vacio.items_respondidos === 0, `Vacío: items_respondidos ${vacio.items_respondidos}`)
  check(scoreExcel([]).puntaje === 0, 'Lista vacía: puntaje debería ser 0')

  // 3) Todo "b" → 12/21 (57,1 %), Básico
  const todoB = scoreExcel(Array.from({ length: 21 }, (_, i) => ({ item: i + 1, respuesta: 'b' as ExcelOpcion })))
  check(todoB.puntaje === 12, `Todo b: puntaje ${todoB.puntaje}, esperado 12`)
  check(todoB.porcentaje === 57.1, `Todo b: porcentaje ${todoB.porcentaje}, esperado 57.1`)
  check(todoB.nivel === 'Básico', `Todo b: nivel ${todoB.nivel}`)

  // 4) Bordes de nivel
  const bordes: [number, ExcelNivel][] = [
    [0, 'Básico'], [12, 'Básico'], [13, 'Intermedio'], [17, 'Intermedio'], [18, 'Avanzado'], [21, 'Avanzado'],
  ]
  for (const [n, nivel] of bordes) {
    const r = scoreExcel(conAciertos(n))
    check(r.puntaje === n, `Borde ${n}: puntaje ${r.puntaje}`)
    check(r.nivel === nivel, `Borde ${n}/21 (${r.porcentaje} %): nivel ${r.nivel}, esperado ${nivel}`)
  }
  check(nivelExcel(60) === 'Básico', 'nivelExcel(60) debería ser Básico')
  check(nivelExcel(60.1) === 'Intermedio', 'nivelExcel(60.1) debería ser Intermedio')
  check(nivelExcel(85) === 'Intermedio', 'nivelExcel(85) debería ser Intermedio')
  check(nivelExcel(85.1) === 'Avanzado', 'nivelExcel(85.1) debería ser Avanzado')

  // 5) Cada ítem 1–21 pertenece a exactamente un área y tiene pauta válida
  for (let item = 1; item <= EXCEL_TOTAL_ITEMS; item++) {
    const enAreas = PREGUNTAS.areas.filter((a) => a.items.includes(item))
    check(enAreas.length === 1, `Ítem ${item}: pertenece a ${enAreas.length} áreas`)
    check(OPCIONES.includes(PAUTA.respuestas[String(item)]), `Ítem ${item}: sin pauta válida`)
    check(AREA_POR_ITEM.get(item) === enAreas[0]?.id, `Ítem ${item}: área de la pregunta no coincide con la lista de áreas`)
  }
  check(Object.keys(PAUTA.respuestas).length === EXCEL_TOTAL_ITEMS, 'La pauta no tiene exactamente 21 ítems')
  check(EXCEL_TOTAL_ITEMS === 21, `Se esperaban 21 preguntas, hay ${EXCEL_TOTAL_ITEMS}`)

  // 6) Entradas inválidas cuentan como no respondidas
  const inval = scoreExcel([
    { item: 0, respuesta: 'b' },
    { item: 22, respuesta: 'b' },
    { item: 1, respuesta: 'z' as ExcelOpcion },
    { item: 1.5, respuesta: 'b' },
    null as unknown as ExcelRespuesta,
  ])
  check(inval.items_respondidos === 0 && inval.puntaje === 0, `Entradas inválidas: respondidos ${inval.items_respondidos}, puntaje ${inval.puntaje}`)
  check(scoreExcel(undefined as unknown as ExcelRespuesta[]).puntaje === 0, 'Entrada no-array debería dar 0')

  // 7) detalleExcel coherente con scoreExcel
  const det = detalleExcel(conAciertos(15))
  check(det.length === 21, `detalleExcel: ${det.length} ítems`)
  check(det.filter((d) => d.acierto).length === 15, 'detalleExcel: aciertos ≠ 15')
  check(det.filter((d) => !d.respondida).length === 6, 'detalleExcel: sin responder ≠ 6')

  if (ok) console.log('Excel self-tests: OK')
  else console.log(`Excel self-tests: FALLARON\n - ${fallos.join('\n - ')}`)
  return ok
}

const invokedDirectly =
  typeof process !== 'undefined' &&
  typeof process.argv?.[1] === 'string' &&
  process.argv[1].replace(/\\/g, '/').endsWith('lib/excel/score.ts')

if (invokedDirectly) {
  runExcelSelfTests().then((passed) => {
    if (typeof process !== 'undefined') process.exitCode = passed ? 0 : 1
  })
}
