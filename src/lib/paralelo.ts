import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/session";

const ACTIVE_ENROLLMENT = ["activo", "reincorporado"] as const;

export type ParaleloResumen = {
  id: number;
  nombre: string;
  grado: string;
  gestion: string;
  gestion_id: number;
  es_actual: boolean;
  profesor_id: number | null;
};

function toResumen(p: {
  id: number;
  nombre: string;
  profesor_id: number | null;
  grado: { nombre: string };
  gestion: { nombre: string; id: number; es_actual: boolean };
}): ParaleloResumen {
  return {
    id: p.id,
    nombre: `${p.grado.nombre} "${p.nombre}"`,
    grado: p.grado.nombre,
    gestion: p.gestion.nombre,
    gestion_id: p.gestion.id,
    es_actual: p.gestion.es_actual,
    profesor_id: p.profesor_id,
  };
}

const INCLUDE = { grado: true, gestion: true } as const;

/** El paralelo en el que el alumno está inscrito en la gestión ACTUAL. */
export async function getParaleloActivoAlumno(alumnoId: number): Promise<ParaleloResumen | null> {
  const insc = await prisma.inscripcion.findFirst({
    where: {
      alumno_id: alumnoId,
      estado: { in: [...ACTIVE_ENROLLMENT] },
      paralelo: { gestion: { es_actual: true } },
    },
    include: { paralelo: { include: INCLUDE } },
    orderBy: { fecha_inscripcion: "desc" },
  });
  return insc ? toResumen(insc.paralelo) : null;
}

/** Todo el historial de inscripciones del alumno (para reportes — Negocio.md §25). */
export async function getHistorialInscripciones(alumnoId: number) {
  return prisma.inscripcion.findMany({
    where: { alumno_id: alumnoId },
    include: { paralelo: { include: INCLUDE } },
    orderBy: [{ fecha_inscripcion: "desc" }],
  });
}

// La gestión ACTUAL va siempre primero (es donde se trabaja); después las demás
// de la más reciente a la más antigua.
const ORDEN_PARALELOS = [
  { gestion: { es_actual: "desc" } },
  { gestion_id: "desc" },
  { grado: { nivel: "asc" } },
  { nombre: "asc" },
] as const;

/** Paralelos que un maestro tiene asignados (por asignación vigente o titularidad). */
export async function getParalelosDeMaestro(maestroId: number): Promise<ParaleloResumen[]> {
  const rows = await prisma.paralelo.findMany({
    where: {
      estado: "activo",
      OR: [{ profesor_id: maestroId }, { asignaciones: { some: { profesor_id: maestroId, activo: true } } }],
    },
    include: INCLUDE,
    orderBy: [...ORDEN_PARALELOS],
  });
  return rows.map(toResumen);
}

export async function getTodosLosParalelos(): Promise<ParaleloResumen[]> {
  const rows = await prisma.paralelo.findMany({
    include: INCLUDE,
    orderBy: [...ORDEN_PARALELOS],
  });
  return rows.map(toResumen);
}

/** Paralelos que el usuario puede VER según su rol. */
export async function getParalelosVisibles(role: Role, userId: number): Promise<ParaleloResumen[]> {
  if (role === "admin") return getTodosLosParalelos();
  if (role === "maestro") return getParalelosDeMaestro(userId);
  const activo = await getParaleloActivoAlumno(userId);
  return activo ? [activo] : [];
}

const COOKIE = "paralelo_id";

/**
 * El paralelo "en foco" para maestro/admin: cookie validada contra el conjunto
 * de paralelos que el usuario puede ver. Si no hay una elección válida devuelve
 * `actual: null` — el docente debe elegir explícitamente con qué paralelo va a
 * trabajar antes de que se cargue el contenido (el contenido pertenece a un
 * paralelo concreto, Negocio.md §31).
 *
 * Para un alumno siempre devuelve su paralelo de inscripción activa.
 */
export async function getParaleloSeleccionado(
  role: Role,
  userId: number,
): Promise<{ actual: ParaleloResumen | null; opciones: ParaleloResumen[] }> {
  const opciones = await getParalelosVisibles(role, userId);
  if (role === "estudiante") return { actual: opciones[0] ?? null, opciones };
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  const wanted = raw ? Number(raw) : NaN;
  const actual = opciones.find((p) => p.id === wanted) ?? null;
  return { actual, opciones };
}

export const PARALELO_COOKIE = COOKIE;
