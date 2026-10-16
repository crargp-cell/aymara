/*
  Puntaje del examen de unir palabras. Lo usan el servidor (que es quien lo
  guarda) y el juego (que lo muestra en el modo prueba del maestro), así que
  no debe importar nada de Prisma.
*/

/** Cada grupo mal elegido descuenta esta cantidad de palabras acertadas: adivinar al azar no sale a cuenta. */
export const PENALTY_PER_ERROR = 1;

export function wordMatchPct(total: number, correct: number, errors: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.max(0, correct - errors * PENALTY_PER_ERROR) / total) * 100);
}

export type PoolWord = { id: number; text: string; category: string };

/**
 * Quita las palabras que el alumno no podría acertar con justicia: la misma
 * palabra escrita en dos categorías distintas (la carta sería idéntica) o
 * repetida en la misma (una sola carta basta).
 */
export function sinAmbiguas(words: PoolWord[]): PoolWord[] {
  const categoriasPorTexto = new Map<string, Set<string>>();
  for (const w of words) {
    const k = w.text.trim().toLowerCase();
    categoriasPorTexto.set(k, (categoriasPorTexto.get(k) ?? new Set()).add(w.category));
  }
  const vistas = new Set<string>();
  return words.filter((w) => {
    const k = w.text.trim().toLowerCase();
    if ((categoriasPorTexto.get(k)?.size ?? 0) > 1 || vistas.has(k)) return false;
    vistas.add(k);
    return true;
  });
}


/** Cartas que el alumno elige cada vez: si son de la misma categoría se colocan, si no es un error. */
export const GRUPO = 4;

/**
 * Deja cada categoría con un número de palabras múltiplo de GRUPO (las que sobran
 * se descartan, siempre las últimas por id) y elimina las categorías con menos de
 * GRUPO: así todas las cartas se pueden colocar en grupos completos.
 */
export function enGruposCompletos(words: PoolWord[]): PoolWord[] {
  const porCategoria = new Map<string, PoolWord[]>();
  for (const w of words) porCategoria.set(w.category, [...(porCategoria.get(w.category) ?? []), w]);
  const quedan = new Set<number>();
  for (const lista of porCategoria.values()) {
    lista.slice(0, lista.length - (lista.length % GRUPO)).forEach((w) => quedan.add(w.id));
  }
  return words.filter((w) => quedan.has(w.id));
}
