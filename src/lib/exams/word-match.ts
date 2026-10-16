import { prisma } from "@/lib/prisma";
import { enGruposCompletos, sinAmbiguas, type PoolWord } from "./word-match-score";

export const MIN_POOL = 12;
export const MAX_POOL = 40;

export type { PoolWord };

function safeParseArray(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * Palabras de un examen de unir palabras. El orden es fijo (por id) para que el
 * servidor pueda reconstruir exactamente el mismo conjunto al calificar; la
 * página las mezcla aparte para mostrarlas.
 */
export async function getWordMatchPool(details: { config_type: string; config_value: string }[]): Promise<{ words: PoolWord[]; categories: string[] }> {
  const detail = details.find((d) => d.config_type === "categories");
  const categories = detail ? safeParseArray(detail.config_value) : [];
  const base = { estado: "activo", categoria: { not: "" } } as const;

  let rows = await prisma.diccionario.findMany({
    where: categories.length ? { estado: "activo", categoria: { in: categories } } : base,
    orderBy: { id: "asc" },
    take: MAX_POOL,
  });
  if (rows.length < MIN_POOL) {
    const extra = await prisma.diccionario.findMany({
      where: { ...base, id: { notIn: rows.map((w) => w.id) } },
      orderBy: { id: "asc" },
      take: MAX_POOL - rows.length,
    });
    rows = [...rows, ...extra];
  }
  const words = rows
    .filter((w) => (w.aymara || w.espanol) && w.categoria)
    .map((w) => ({ id: w.id, text: (w.aymara || w.espanol)!, category: w.categoria }));
  return { words: enGruposCompletos(sinAmbiguas(words)), categories };
}

/** Fisher-Yates; se hace aquí y no en el componente para no usar Math.random al renderizar. */
export function mezclar<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
