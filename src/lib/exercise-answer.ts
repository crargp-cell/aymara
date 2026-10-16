/*
  Lógica pura del juego «adivina la imagen» (image_guess): cómo se compara lo que
  escribe el alumno con las palabras aceptadas y cuánto se desenfoca la imagen
  según los fallos. Sin dependencias: la usan el servidor (que decide) y el
  cliente (que sólo dibuja las casillas).
*/

export const INTENTOS_POR_DEFECTO = 5;
const MIN_INTENTOS = 2;
const MAX_INTENTOS = 8;

/** Intentos permitidos según `Exercise.config` (`{ maxIntentos }`). */
export function intentosDe(config: unknown): number {
  const v = (config as { maxIntentos?: unknown } | null)?.maxIntentos;
  return typeof v === "number" && Number.isFinite(v) ? Math.min(Math.max(Math.round(v), MIN_INTENTOS), MAX_INTENTOS) : INTENTOS_POR_DEFECTO;
}

/** Minúsculas, espacios colapsados y un solo tipo de apóstrofo (en aymara p’iqi y p'iqi son la misma palabra). */
export function normalizarRespuesta(s: string): string {
  return s
    .normalize("NFC")
    .toLowerCase()
    .replace(/[’‘´`ʼʻ′]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Quita las tildes y diéresis de las vocales (ä, ï, ü, á…) pero conserva la ñ. */
export function sinTildes(s: string): string {
  return s
    .normalize("NFD")
    .replace(/([^̀-ͯ])([̀-ͯ]+)/g, (_m, base: string, marcas: string) => (/^[nN]$/.test(base) && marcas.includes("̃") ? base + "̃" : base))
    .normalize("NFC");
}

/** ¿Coincide lo escrito con alguna de las respuestas aceptadas, con o sin tildes? */
export function coincideRespuesta(entrada: string, aceptadas: string[]): boolean {
  const e = normalizarRespuesta(entrada);
  if (!e) return false;
  return aceptadas.some((a) => {
    const n = normalizarRespuesta(a);
    return n === e || sinTildes(n) === sinTildes(e);
  });
}

/** Desenfoque (sigma, px sobre una imagen de 480 de ancho) tras `fallos` fallos; 0 = nítida. */
export function sigmaDesenfoque(fallos: number, maxIntentos: number): number {
  if (fallos >= maxIntentos) return 0;
  const restante = 1 - Math.max(fallos, 0) / maxIntentos;
  const sigma = 14 * restante * restante;
  return sigma < 0.4 ? 0.4 : Math.round(sigma * 10) / 10;
}

/** Casillas de la palabra: una por letra, los espacios se conservan. */
export function casillas(palabra: string): { letra: boolean }[] {
  return [...palabra.trim()].map((c) => ({ letra: c !== " " }));
}
