import { z } from 'zod'

/**
 * Política de contraseñas única para toda la app.
 * Se usa tanto al crear usuarios (usuarios/actions) como al restablecer
 * la contraseña (reset-password/actions), para evitar que un reset
 * termine con una clave más débil que la exigida al crear la cuenta.
 */
export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula')
  .regex(/[0-9]/, 'Debe incluir al menos un número')

/** Texto de ayuda para mostrar los requisitos en los formularios. */
export const PASSWORD_HINT = 'Mínimo 8 caracteres, con al menos una mayúscula y un número.'
