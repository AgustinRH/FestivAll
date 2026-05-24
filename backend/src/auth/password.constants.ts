export const BCRYPT_ROUNDS = 12;

export const STRONG_PASSWORD_MESSAGE =
  'La contraseña debe tener al menos 10 caracteres, una mayúscula, una minúscula y un número';

export function isStrongPassword(value: unknown): boolean {
  if (typeof value !== 'string' || value.length < 10) return false;
  return /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value);
}
