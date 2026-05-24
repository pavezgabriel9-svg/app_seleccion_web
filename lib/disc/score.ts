import groupsData from './data/groups.json' with { type: 'json' }
import rangesData from './data/segment-ranges.json' with { type: 'json' }
import lookupData from './data/pattern-lookup.json' with { type: 'json' }
import type { DISCAxis, DISCRespuesta, DISCResult } from '@/types/database'

interface Palabra {
  pos: number
  texto: string
  mas: string
  menos: string
}
interface Grupo {
  grupo: number
  palabras: Palabra[]
}
interface Range {
  segmento: number
  min?: number
  max?: number
}

const groups = groupsData as Grupo[]
const ranges = rangesData as Record<DISCAxis, Range[]>
const lookup = lookupData as Record<string, string>

const groupByNum = new Map(groups.map((g) => [g.grupo, g]))

function segmentFor(axis: DISCAxis, neto: number): number {
  for (const r of ranges[axis]) {
    const okMin = r.min === undefined || neto >= r.min
    const okMax = r.max === undefined || neto <= r.max
    if (okMin && okMax) return r.segmento
  }
  return 4
}

export function scoreDISC(respuestas: DISCRespuesta[]): DISCResult['resultado'] {
  const conteos = {
    d_mas: 0, d_menos: 0,
    i_mas: 0, i_menos: 0,
    s_mas: 0, s_menos: 0,
    c_mas: 0, c_menos: 0,
    n_mas: 0, n_menos: 0,
  }

  for (const resp of respuestas) {
    const grupo = groupByNum.get(resp.grupo)
    if (!grupo) continue

    if (resp.mas !== null) {
      const palabra = grupo.palabras.find((p) => p.pos === resp.mas)
      if (palabra) {
        const key = `${palabra.mas.toLowerCase()}_mas` as keyof typeof conteos
        conteos[key]++
      }
    }
    if (resp.menos !== null) {
      const palabra = grupo.palabras.find((p) => p.pos === resp.menos)
      if (palabra) {
        const key = `${palabra.menos.toLowerCase()}_menos` as keyof typeof conteos
        conteos[key]++
      }
    }
  }

  const netos = {
    d: conteos.d_mas - conteos.d_menos,
    i: conteos.i_mas - conteos.i_menos,
    s: conteos.s_mas - conteos.s_menos,
    c: conteos.c_mas - conteos.c_menos,
  }

  const segmentos = {
    d: segmentFor('D', netos.d),
    i: segmentFor('I', netos.i),
    s: segmentFor('S', netos.s),
    c: segmentFor('C', netos.c),
  }

  const codigo = `${segmentos.d}${segmentos.i}${segmentos.s}${segmentos.c}`
  const patron = lookup[codigo] ?? 'Desconcertante'

  return { conteos, netos, segmentos, codigo, patron }
}

// ─── Self-tests (solo se ejecutan vía `node lib/disc/score.ts`) ───────────────

export function runDISCSelfTests(): boolean {
  let ok = true

  // Caso D fuerte: MÁS en la palabra D de cada grupo, MENOS en la palabra I.
  const dStrong: DISCRespuesta[] = groups.map((g) => {
    const masPos = (g.palabras.find((p) => p.mas === 'D') ?? g.palabras[0]).pos
    const iWord = g.palabras.find((p) => p.menos === 'I')
    const fallback = g.palabras.find((p) => p.pos !== masPos)!.pos
    const menosPos = iWord && iWord.pos !== masPos ? iWord.pos : fallback
    return { grupo: g.grupo, mas: masPos, menos: menosPos }
  })
  const rD = scoreDISC(dStrong)
  console.assert(rD.codigo === '7154', `D fuerte: esperaba código 7154, obtuve ${rD.codigo}`)
  console.assert(rD.patron === 'Realizador', `D fuerte: esperaba Realizador, obtuve ${rD.patron}`)
  ok = ok && rD.codigo === '7154' && rD.patron === 'Realizador'

  // Caso vacío: sin respuestas → netos 0 → segmentos 4,4,5,4 → "4454".
  const empty: DISCRespuesta[] = groups.map((g) => ({ grupo: g.grupo, mas: null, menos: null }))
  const rE = scoreDISC(empty)
  console.assert(rE.codigo === '4454', `Vacío: esperaba código 4454, obtuve ${rE.codigo}`)
  console.assert(rE.patron === 'Desconcertante', `Vacío: esperaba Desconcertante, obtuve ${rE.patron}`)
  ok = ok && rE.codigo === '4454' && rE.patron === 'Desconcertante'

  console.log(ok ? 'DISC self-tests: OK' : 'DISC self-tests: FALLARON')
  return ok
}

const invokedDirectly =
  typeof process !== 'undefined' &&
  typeof process.argv?.[1] === 'string' &&
  process.argv[1].replace(/\\/g, '/').endsWith('lib/disc/score.ts')

if (invokedDirectly) {
  const passed = runDISCSelfTests()
  if (typeof process !== 'undefined') process.exitCode = passed ? 0 : 1
}
