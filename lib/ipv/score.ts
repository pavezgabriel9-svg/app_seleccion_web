import correccionData from './data/correccion.json' with { type: 'json' }
import interpretacionData from './data/interpretacion.json' with { type: 'json' }
import type {
  IPVEscala,
  IPVEscalaResultado,
  IPVOpcion,
  IPVRespuesta,
  IPVResult,
} from '@/types/database'

// ─── Datos de corrección (copiados tal cual del Excel del equipo) ────────────

interface Clave {
  item: number
  opcion: IPVOpcion
}
interface TramoBaremo {
  pt: number
  pd_min: number
  pd_max: number
}
interface EscalaDef {
  codigo: IPVEscala
  nombre: string
  orden_perfil: number
  tipo: 'directa' | 'compuesta' | 'invertida'
  claves?: Clave[]
  componentes?: IPVEscala[]
  baremo_decatipos: TramoBaremo[]
  pt_no_alcanzables: number[]
}
interface CorreccionData {
  items: number
  opciones_por_item: { default: IPVOpcion[]; excepciones: Record<string, IPVOpcion[]> }
  escalas: EscalaDef[]
}
interface InterpretacionData {
  escalas: Record<string, Record<string, { nivel: string; texto: string }>>
}

const CORRECCION = correccionData as unknown as CorreccionData
const INTERPRETACION = interpretacionData as unknown as InterpretacionData

export const IPV_TOTAL_ITEMS = CORRECCION.items

/** Escalas en el orden de la hoja de perfil (DGV, R, A, I … IX). */
export const IPV_ESCALAS: readonly EscalaDef[] = [...CORRECCION.escalas].sort(
  (a, b) => a.orden_perfil - b.orden_perfil
)
const ESCALA_BY_CODE = new Map(IPV_ESCALAS.map((e) => [e.codigo, e]))

export function getEscalaDef(escala: IPVEscala): EscalaDef {
  return ESCALA_BY_CODE.get(escala)!
}

/** Opciones válidas del ítem (los ítems 14 y 78 solo tienen A y B). */
export function opcionesDeItem(item: number): IPVOpcion[] {
  return CORRECCION.opciones_por_item.excepciones[String(item)] ?? CORRECCION.opciones_por_item.default
}

function esRespuestaValida(item: number, opcion: unknown): opcion is IPVOpcion {
  if (!Number.isInteger(item) || item < 1 || item > IPV_TOTAL_ITEMS) return false
  return typeof opcion === 'string' && (opcionesDeItem(item) as string[]).includes(opcion)
}

// ─── Baremo e interpretación ──────────────────────────────────────────────────

/**
 * PT = decatipo cuyo rango [pd_min, pd_max] contiene la PD (búsqueda por rango,
 * no un LOOKUP). Una PD fuera de todos los rangos —imposible con PD válidas,
 * lo verifican los self-tests— se acota al tramo más cercano.
 */
export function decatipo(escala: IPVEscala, pd: number): number {
  const baremo = getEscalaDef(escala).baremo_decatipos
  const tramo = baremo.find((t) => pd >= t.pd_min && pd <= t.pd_max)
  if (tramo) return tramo.pt
  return pd < baremo[0].pd_min ? baremo[0].pt : baremo[baremo.length - 1].pt
}

export function interpretar(escala: IPVEscala, pt: number): { nivel: string; texto: string } {
  return INTERPRETACION.escalas[escala]?.[String(pt)] ?? { nivel: '', texto: '' }
}

// ─── Corrección ───────────────────────────────────────────────────────────────

function coincidencias(claves: Clave[], marcadas: Map<number, IPVOpcion>): number {
  let n = 0
  for (const c of claves) if (marcadas.get(c.item) === c.opcion) n++
  return n
}

/**
 * Función pura. Ítems fuera de 1–87 u opciones inválidas (p. ej. 'c' en 14/78)
 * cuentan como no respondidos. Ítem sin responder = 0 coincidencias (igual que el Excel).
 */
export function scoreIPV(respuestas: IPVRespuesta[]): IPVResult['resultado'] {
  const marcadas = new Map<number, IPVOpcion>()
  for (const r of Array.isArray(respuestas) ? respuestas : []) {
    if (r && esRespuestaValida(r.item, r.respuesta)) marcadas.set(r.item, r.respuesta)
  }

  const pdPorEscala = {} as Record<IPVEscala, number>

  // 1) Escalas con claves (DGV, I…IX)
  for (const def of IPV_ESCALAS) {
    if (def.tipo === 'compuesta') continue
    const claves = def.claves ?? []
    const aciertos = coincidencias(claves, marcadas)
    pdPorEscala[def.codigo] = def.tipo === 'invertida' ? claves.length - aciertos : aciertos
  }

  // 2) Compuestas (R = I+II+III+IV; A = V+VI+VII+VIII)
  for (const def of IPV_ESCALAS) {
    if (def.tipo !== 'compuesta') continue
    pdPorEscala[def.codigo] = (def.componentes ?? []).reduce((s, c) => s + pdPorEscala[c], 0)
  }

  const escalas = {} as Record<IPVEscala, IPVEscalaResultado>
  for (const def of IPV_ESCALAS) {
    const pd = pdPorEscala[def.codigo]
    const pt = decatipo(def.codigo, pd)
    escalas[def.codigo] = { pd, pt, nivel: interpretar(def.codigo, pt).nivel }
  }

  return { escalas, items_respondidos: marcadas.size }
}

// ─── Self-tests (solo via `node lib/ipv/score.ts`) ──────────────────────────

interface CasoPrueba {
  caso: string
  respuestas: string
  esperado: Record<string, { pd: number; pt: number }>
}

function stringARespuestas(s: string): IPVRespuesta[] {
  return Array.from(s).map((ch, i) => ({
    item: i + 1,
    respuesta: ch === 'a' || ch === 'b' || ch === 'c' ? ch : null,
  }))
}

export async function runIPVSelfTests(): Promise<boolean> {
  let ok = true
  const fallos: string[] = []
  const check = (cond: boolean, msg: string) => {
    if (!cond) {
      ok = false
      fallos.push(msg)
    }
  }
  const directas = IPV_ESCALAS.filter((e) => e.tipo !== 'compuesta')
  const romanas = IPV_ESCALAS.filter((e) => /^(I|II|III|IV|V|VI|VII|VIII|IX)$/.test(e.codigo))

  // 1) Los 6 casos de ipv-casos-prueba.json → PD y PT exactos
  const { default: casosData } = (await import('./data/casos-prueba.json', {
    with: { type: 'json' },
  })) as { default: { casos: CasoPrueba[] } }
  check(casosData.casos.length === 6, `Se esperaban 6 casos y hay ${casosData.casos.length}`)
  for (const caso of casosData.casos) {
    check(caso.respuestas.length === IPV_TOTAL_ITEMS, `${caso.caso}: no tiene 87 respuestas`)
    const { escalas } = scoreIPV(stringARespuestas(caso.respuestas))
    for (const [codigo, esp] of Object.entries(caso.esperado)) {
      const got = escalas[codigo as IPVEscala]
      check(
        !!got && got.pd === esp.pd && got.pt === esp.pt,
        `${caso.caso} / ${codigo}: esperado PD ${esp.pd} PT ${esp.pt}, obtenido ${got ? `PD ${got.pd} PT ${got.pt}` : 'nada'}`
      )
    }
  }

  // 2) Cada ítem 1–87 puntúa en exactamente una escala I–IX (una sola alternativa)
  for (let item = 1; item <= IPV_TOTAL_ITEMS; item++) {
    const hits = romanas.flatMap((e) => (e.claves ?? []).filter((c) => c.item === item).map((c) => ({ e: e.codigo, c })))
    check(hits.length === 1, `Ítem ${item}: puntúa ${hits.length} veces en I–IX (${hits.map((h) => h.e).join(',')})`)
    for (const h of hits) {
      check(
        (opcionesDeItem(item) as string[]).includes(h.c.opcion),
        `Ítem ${item}: la clave ${h.e}/${h.c.opcion} no es una opción válida del ítem`
      )
    }
  }
  const sumaClaves = romanas.reduce((s, e) => s + (e.claves?.length ?? 0), 0)
  check(sumaClaves === IPV_TOTAL_ITEMS, `I–IX suman ${sumaClaves} claves; se esperaban 87`)
  for (const c of getEscalaDef('DGV').claves ?? []) {
    check(c.item >= 1 && c.item <= 18, `DGV: clave fuera de los ítems 1–18 (${c.item})`)
  }

  // 3) PD máximas de las compuestas
  const pdMax: Partial<Record<IPVEscala, number>> = {}
  for (const e of directas) pdMax[e.codigo] = e.claves?.length ?? 0
  for (const e of IPV_ESCALAS.filter((x) => x.tipo === 'compuesta')) {
    pdMax[e.codigo] = (e.componentes ?? []).reduce((s, c) => s + (pdMax[c] ?? 0), 0)
  }
  check(pdMax.R === 41, `R máx esperado 41, obtenido ${pdMax.R}`)
  check(pdMax.A === 38, `A máx esperado 38, obtenido ${pdMax.A}`)

  // 4) Todo vacío: VIII = 8 (invertida); I–VII, IX, DGV y R = 0; A = 8 porque A incluye VIII.
  const vacio = scoreIPV(Array.from({ length: IPV_TOTAL_ITEMS }, (_, i) => ({ item: i + 1, respuesta: null })))
  check(vacio.items_respondidos === 0, 'Vacío: items_respondidos debería ser 0')
  for (const e of IPV_ESCALAS) {
    const esperado = e.codigo === 'VIII' || e.codigo === 'A' ? 8 : 0
    check(vacio.escalas[e.codigo].pd === esperado, `Vacío / ${e.codigo}: PD esperada ${esperado}, obtenida ${vacio.escalas[e.codigo].pd}`)
  }

  // 5) Los baremos cubren sin huecos desde 0 hasta la PD máxima, con decatipos crecientes
  for (const e of IPV_ESCALAS) {
    const b = e.baremo_decatipos
    check(b[0].pd_min === 0, `${e.codigo}: el baremo no parte en PD 0`)
    for (let i = 1; i < b.length; i++) {
      check(b[i].pd_min === b[i - 1].pd_max + 1, `${e.codigo}: hueco/solape entre ${b[i - 1].pd_max} y ${b[i].pd_min}`)
      check(b[i].pt > b[i - 1].pt, `${e.codigo}: decatipos no crecientes en tramo ${i}`)
    }
    check(b[b.length - 1].pd_max >= (pdMax[e.codigo] ?? 0), `${e.codigo}: el baremo no llega a la PD máxima ${pdMax[e.codigo]}`)
    for (let pd = 0; pd <= (pdMax[e.codigo] ?? 0); pd++) {
      const t = b.filter((x) => pd >= x.pd_min && pd <= x.pd_max)
      check(t.length === 1, `${e.codigo}: PD ${pd} cae en ${t.length} tramos`)
      if (t.length === 1) check(interpretar(e.codigo, t[0].pt).texto.length > 0, `${e.codigo}: sin interpretación para PT ${t[0].pt}`)
    }
    // los PT no alcanzables declarados realmente no aparecen en el baremo
    for (const pt of e.pt_no_alcanzables) check(!b.some((x) => x.pt === pt), `${e.codigo}: PT ${pt} figura como no alcanzable pero está en el baremo`)
  }

  // 6) Entradas inválidas cuentan como no respondidas
  const inval = scoreIPV([
    { item: 14, respuesta: 'c' },
    { item: 78, respuesta: 'c' },
    { item: 0, respuesta: 'a' },
    { item: 88, respuesta: 'a' },
    { item: 1, respuesta: 'z' as IPVOpcion },
  ])
  check(inval.items_respondidos === 0, `Entradas inválidas: items_respondidos ${inval.items_respondidos}, esperado 0`)

  if (ok) console.log('IPV self-tests: OK')
  else console.log(`IPV self-tests: FALLARON\n - ${fallos.join('\n - ')}`)
  return ok
}

const invokedDirectly =
  typeof process !== 'undefined' &&
  typeof process.argv?.[1] === 'string' &&
  process.argv[1].replace(/\\/g, '/').endsWith('lib/ipv/score.ts')

if (invokedDirectly) {
  runIPVSelfTests().then((passed) => {
    if (typeof process !== 'undefined') process.exitCode = passed ? 0 : 1
  })
}
