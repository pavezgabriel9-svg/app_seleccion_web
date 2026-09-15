/**
 * Validación del documento de identidad del candidato.
 *
 * Soporta:
 *   · RUT chileno  → 12.345.678-9 · 12345678-9 · 12345678K  (con dígito verificador)
 *   · DNI peruano  → 45678912                                (8 dígitos, sin DV)
 *   · Otros documentos numéricos de 7 a 12 dígitos
 *
 * Regla de detección: si el texto ingresado trae guión o termina en K, el
 * candidato está declarando un RUT chileno y se exige el checksum módulo 11.
 * En cualquier otro caso basta con que sean dígitos dentro del largo permitido.
 *
 * El valor se almacena normalizado (sin puntos ni guión, en mayúsculas) en
 * `candidates.rut`, de modo que la búsqueda en el panel de resultados funcione
 * sin importar cómo lo escribió el candidato.
 */

export type TipoDocumento = 'rut' | 'dni' | 'otro'

export type ResultadoDocumento =
  | { ok: true; valor: string; tipo: TipoDocumento }
  | { ok: false; error: string }

const LARGO_MIN = 7
const LARGO_MAX = 12

const ERROR_FORMATO =
  'Documento inválido. Ingresa tu RUT (12.345.678-9) o tu DNI (45678912).'

/** Quita puntos, guiones y espacios; devuelve en mayúsculas. */
export function normalizarDocumento(raw: string): string {
  return raw.replace(/[.\-\s]/g, '').toUpperCase().trim()
}

/** Dígito verificador módulo 11 para un cuerpo de RUT chileno. */
function digitoVerificador(cuerpo: string): string {
  let suma = 0
  let multiplicador = 2

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * multiplicador
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1
  }

  const resto = 11 - (suma % 11)
  return resto === 11 ? '0' : resto === 10 ? 'K' : String(resto)
}

/** true si el texto ya normalizado es un RUT chileno con DV correcto. */
export function esRutChileno(limpio: string): boolean {
  if (!/^\d{7,8}[\dK]$/.test(limpio)) return false
  return limpio.slice(-1) === digitoVerificador(limpio.slice(0, -1))
}

/** Formatea un RUT normalizado como 12.345.678-9 (solo para mostrar). */
export function formatearRut(limpio: string): string {
  if (!/^\d{7,8}[\dK]$/.test(limpio)) return limpio
  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${cuerpo}-${limpio.slice(-1)}`
}

export function validarDocumento(raw: string | null | undefined): ResultadoDocumento {
  const original = (raw ?? '').trim()
  if (!original) return { ok: false, error: 'Ingresa tu documento de identidad' }

  const limpio = normalizarDocumento(original)

  // Solo dígitos, con una K opcional al final (dígito verificador chileno).
  if (
    !/^\d+K?$/.test(limpio) ||
    limpio.length < LARGO_MIN ||
    limpio.length > LARGO_MAX
  ) {
    return { ok: false, error: ERROR_FORMATO }
  }

  // Con guión o con K ⇒ RUT chileno: exigimos el dígito verificador.
  if (original.includes('-') || limpio.endsWith('K')) {
    if (!esRutChileno(limpio)) {
      return { ok: false, error: 'RUT inválido: el dígito verificador no corresponde.' }
    }
    return { ok: true, valor: limpio, tipo: 'rut' }
  }

  // Solo dígitos: DNI peruano (8) u otro documento numérico.
  const tipo: TipoDocumento = esRutChileno(limpio)
    ? 'rut'
    : limpio.length === 8
      ? 'dni'
      : 'otro'

  return { ok: true, valor: limpio, tipo }
}
