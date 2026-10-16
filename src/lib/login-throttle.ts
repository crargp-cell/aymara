/*
  Freno a la fuerza bruta en el inicio de sesión. La política es pura (se prueba
  sin base de datos); auth.ts cuenta los intentos fallidos recientes y la aplica.

  Dos límites a propósito: por usuario *y* dirección (frena a quien prueba
  contraseñas de una cuenta sin dejar que un tercero bloquee a un alumno desde
  otra red) y por dirección sola (frena el barrido de muchos usuarios).
*/

export const VENTANA_MINUTOS = 15;
export const MAX_FALLOS_USUARIO_IP = 5;
export const MAX_FALLOS_IP = 25;

export type FallosRecientes = { usuarioIp: number; ip: number };

export function bloqueado(f: FallosRecientes): boolean {
  return f.usuarioIp >= MAX_FALLOS_USUARIO_IP || f.ip >= MAX_FALLOS_IP;
}

/** Inicio de la ventana de cuenta, para la consulta. */
export const desdeVentana = (ahora = Date.now()) => new Date(ahora - VENTANA_MINUTOS * 60_000);
