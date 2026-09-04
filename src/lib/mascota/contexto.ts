import { prisma } from "@/lib/prisma";
import { getStudentBoard } from "@/lib/student-board";
import type { ContextoAlumno } from "./guion";

/**
 * Reúne lo que el cóndor necesita saber del alumno.
 *
 * Es de sólo lectura a propósito: el cóndor comenta el progreso, no lo toca.
 * Un profesor mirando la plataforma como alumno recibe el mismo contexto sin
 * que se le guarde nada, igual que en el resto de la sección "Aprender".
 */
export async function contextoDelAlumno(userId: number, nombre: string): Promise<ContextoAlumno> {
  const board = await getStudentBoard(userId);

  const lecciones = board.nodes.filter((n) => n.type === "lesson");
  const siguienteNodo = board.nodes.find((n) => n.unlocked && !n.done) ?? null;

  const [logros, tarjetas, palabras] = await Promise.all([
    prisma.logroAlumno.count({ where: { alumno_id: userId } }),
    prisma.userArCard.count({ where: { alumno_id: userId, revocado: false } }),
    // Sólo entradas con las dos caras: una palabra a medias no se puede enseñar.
    prisma.diccionario.findMany({
      where: {
        estado: "activo",
        aymara: { not: null },
        espanol: { not: null },
        ...(board.paralelo ? { OR: [{ paralelo_id: board.paralelo.id }, { paralelo_id: null }] } : {}),
      },
      select: { aymara: true, espanol: true },
      orderBy: { id: "asc" },
    }),
  ]);

  return {
    nombre,
    paralelo: board.paralelo?.nombre ?? null,
    leccionesHechas: lecciones.filter((n) => n.done).length,
    leccionesTotales: lecciones.length,
    siguiente: siguienteNodo
      ? {
          tipo: siguienteNodo.type,
          titulo: siguienteNodo.title,
          href: siguienteNodo.type === "exam" ? `/exams/${siguienteNodo.id}` : `/lessons/${siguienteNodo.id}`,
        }
      : null,
    logros,
    tarjetas,
    palabras: palabrasEnsenables(palabras),
  };
}

/**
 * Deja sólo las palabras que el cóndor puede enseñar sin mentir.
 *
 * El diccionario cargado tiene entradas que se contradicen: "chh'ajña" aparece
 * con noventa y tantos significados distintos —amarillo, sol, maíz, sal…—,
 * resultado de haber rellenado listas de vocabulario español reutilizando unas
 * pocas formas aymaras. Si el cóndor sacara una de ésas enseñaría una palabra
 * falsa, y mañana otra distinta para la misma.
 *
 * La regla es que si los datos se contradicen sobre una palabra, esa palabra no
 * se enseña. Quedan las 207 que tienen un único significado, que son aymara de
 * verdad. Esto tapa el síntoma en el cóndor; el diccionario en sí sigue
 * necesitando una limpieza aparte.
 */
export function palabrasEnsenables(
  filas: { aymara: string | null; espanol: string | null }[],
): { aymara: string; espanol: string }[] {
  const significados = new Map<string, Set<string>>();
  for (const f of filas) {
    if (!f.aymara || !f.espanol) continue;
    const clave = f.aymara.trim().toLowerCase();
    if (!significados.has(clave)) significados.set(clave, new Set());
    significados.get(clave)!.add(f.espanol.trim().toLowerCase());
  }

  const vistas = new Set<string>();
  const limpias: { aymara: string; espanol: string }[] = [];
  for (const f of filas) {
    if (!f.aymara || !f.espanol) continue;
    const clave = f.aymara.trim().toLowerCase();
    if (vistas.has(clave) || significados.get(clave)!.size !== 1) continue;
    vistas.add(clave);
    limpias.push({ aymara: f.aymara.trim(), espanol: f.espanol.trim() });
  }
  return limpias;
}
