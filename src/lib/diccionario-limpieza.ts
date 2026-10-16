/*
  Limpieza del diccionario. Los exámenes y ejercicios arman sus palabras desde
  aquí, así que un duplicado o una categoría escrita de dos maneras se nota
  enseguida (cartas repetidas, categorías partidas).

  La función es pura: recibe filas y dice qué hacer con cada una. El script
  `prisma/limpiar-diccionario.ts` la aplica a la base y el seed la aplica al
  cargar los datos base.
*/

export type FilaDiccionario = { id: number; aymara: string | null; espanol: string | null; categoria: string };

export type PlanLimpieza = {
  /** Categoría final de las filas que se conservan (ya normalizada). */
  categoria: Map<number, string>;
  /** Repetidas exactas: sobran. */
  eliminar: Set<number>;
  /** Entradas sin sentido (la misma palabra aymara «traducida» a muchas cosas sin relación): se ocultan, no se borran. */
  deshabilitar: Set<number>;
};

/** Categorías escritas de más de una manera → la forma que se conserva. */
const CATEGORIAS: Record<string, string> = { animal: "Animales", animales: "Animales" };

/** Cuántos significados distintos hacen sospechosa a una misma palabra aymara sin categoría. */
const UMBRAL_SOSPECHOSA = 6;

const norm = (s: string | null) => (s ?? "").trim().toLowerCase();

export function normalizarCategoria(c: string): string {
  const limpia = c.trim();
  return CATEGORIAS[limpia.toLowerCase()] ?? limpia;
}

export function planLimpieza(filas: FilaDiccionario[]): PlanLimpieza {
  const categoria = new Map<number, string>();
  const eliminar = new Set<number>();
  const deshabilitar = new Set<number>();

  for (const f of filas) categoria.set(f.id, normalizarCategoria(f.categoria));

  // 1. Repetidas: misma palabra y mismo significado. Se queda la que tiene categoría (o la primera).
  const grupos = new Map<string, FilaDiccionario[]>();
  for (const f of filas) {
    const k = `${norm(f.aymara)}|${norm(f.espanol)}`;
    grupos.set(k, [...(grupos.get(k) ?? []), f]);
  }
  for (const grupo of grupos.values()) {
    if (grupo.length < 2) continue;
    const conCategoria = grupo.find((f) => categoria.get(f.id));
    const quedan = conCategoria ?? grupo[0];
    // Si la que queda no tenía categoría pero otra repetida sí, hereda esa.
    if (!categoria.get(quedan.id)) {
      const otra = grupo.map((f) => categoria.get(f.id)).find(Boolean);
      if (otra) categoria.set(quedan.id, otra);
    }
    for (const f of grupo) if (f.id !== quedan.id) eliminar.add(f.id);
  }

  // 2. Una misma palabra aymara con muchos significados sin relación y sin categoría es ruido.
  const significados = new Map<string, Set<string>>();
  for (const f of filas) {
    if (eliminar.has(f.id) || categoria.get(f.id)) continue;
    const k = norm(f.aymara);
    significados.set(k, (significados.get(k) ?? new Set()).add(norm(f.espanol)));
  }
  for (const f of filas) {
    if (eliminar.has(f.id) || categoria.get(f.id)) continue;
    if ((significados.get(norm(f.aymara))?.size ?? 0) >= UMBRAL_SOSPECHOSA) deshabilitar.add(f.id);
  }

  return { categoria, eliminar, deshabilitar };
}
