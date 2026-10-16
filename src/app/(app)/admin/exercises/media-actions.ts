"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { assertMaestroOwnsParalelo } from "@/lib/rbac";
import { guardarImagenEjercicio, importarBibliotecaEjercicio } from "@/lib/exercise-media";
import { listarBiblioteca, type RecursoBiblioteca } from "@/lib/recursos";

/*
  Acciones del selector de imágenes de los ejercicios. Cada una comprueba que el
  maestro sea dueño del paralelo: el id llega del cliente.
*/

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const NO_PERMISO = { ok: false, error: "No tienes permiso sobre este paralelo." } as const;

async function autorizar(paraleloId: number) {
  if (!Number.isInteger(paraleloId)) return false;
  const user = await requireRole(["maestro", "admin"]);
  return assertMaestroOwnsParalelo(user.role, user.id, paraleloId);
}

export type ImagenEjercicio = { id: number; nombre: string; sizeBytes: number };

/** Imágenes ya cargadas en el paralelo (sin repetidos) y la biblioteca de la aplicación. */
export async function listarImagenesAction(paraleloId: number): Promise<Resultado<{ propias: ImagenEjercicio[]; biblioteca: RecursoBiblioteca[] }>> {
  if (!(await autorizar(paraleloId))) return NO_PERMISO;
  const filas = await prisma.exerciseMedia.findMany({
    where: { paralelo_id: paraleloId },
    orderBy: { id: "desc" },
    take: 300,
    select: { id: true, nombre: true, size_bytes: true },
  });
  const vistos = new Set<string>();
  const propias = filas
    .filter((f) => { const k = `${f.nombre}|${f.size_bytes}`; if (vistos.has(k)) return false; vistos.add(k); return true; })
    .map((f) => ({ id: f.id, nombre: f.nombre, sizeBytes: f.size_bytes }));
  return { ok: true, propias, biblioteca: await listarBiblioteca() };
}

export async function subirImagenAction(formData: FormData): Promise<Resultado<{ id: number }>> {
  const paraleloId = Number(formData.get("paralelo_id"));
  if (!(await autorizar(paraleloId))) return NO_PERMISO;
  const id = await guardarImagenEjercicio(paraleloId, formData.get("file"));
  if (id === null) return { ok: false, error: "No se recibió ninguna imagen." };
  if (typeof id === "object") return { ok: false, error: id.error };
  return { ok: true, id };
}

export async function usarBibliotecaAction(paraleloId: number, grupo: string, archivo: string): Promise<Resultado<{ id: number }>> {
  if (!(await autorizar(paraleloId))) return NO_PERMISO;
  const id = await importarBibliotecaEjercicio(paraleloId, String(grupo), String(archivo));
  if (id === null) return { ok: false, error: "Ese recurso no existe en la biblioteca." };
  return { ok: true, id };
}

/**
 * Crea, a partir de las láminas del alfabeto, un ejercicio «adivina la imagen» y uno
 * «arrastra la tarjeta» por cada palabra. Las imágenes se usan sin el rótulo del pie
 * (que trae la respuesta escrita). No repite lo que ya existe: se puede pulsar otra vez.
 */
export async function generarDesdeAlfabetoAction(paraleloId: number, lessonId: number | null): Promise<Resultado<{ creados: number; omitidos: number }>> {
  if (!(await autorizar(paraleloId))) return NO_PERMISO;
  const user = await requireRole(["maestro", "admin"]);

  if (lessonId) {
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { paralelo_id: true } });
    if (lesson?.paralelo_id !== paraleloId) return { ok: false, error: "La lección no es de este paralelo." };
  }

  const palabras = (await listarBiblioteca()).filter((b) => b.grupo === "alfabeto" && !/^aparato/i.test(b.archivo));
  const imagenes: { palabra: string; mediaId: number }[] = [];
  for (const b of palabras) {
    const mediaId = await importarBibliotecaEjercicio(paraleloId, b.grupo, b.archivo, { sinRotulo: true });
    if (mediaId) imagenes.push({ palabra: b.nombre, mediaId });
  }
  if (imagenes.length < 4) return { ok: false, error: "No hay suficientes imágenes en la biblioteca del alfabeto." };

  let ordenSiguiente = lessonId ? ((await prisma.lessonExercise.aggregate({ where: { lesson_id: lessonId }, _max: { orden: true } }))._max.orden ?? 0) + 1 : 0;
  const enlazar = async (exerciseId: number) => {
    if (lessonId) await prisma.lessonExercise.create({ data: { lesson_id: lessonId, exercise_id: exerciseId, orden: ordenSiguiente++ } });
  };
  const base = { paralelo_id: paraleloId, dificultad: "medio" as const, created_by: user.id, updated_by: user.id };
  let creados = 0, omitidos = 0;

  for (const [i, img] of imagenes.entries()) {
    // Adivina la imagen
    const yaAdivina = await prisma.exercise.findFirst({ where: { paralelo_id: paraleloId, type: "image_guess", image_id: img.mediaId }, select: { id: true } });
    if (yaAdivina) omitidos++;
    else {
      // Se aceptan las dos formas de escribir el apóstrofo.
      const variantes = [...new Set([img.palabra, img.palabra.replace(/[’‘]/g, "'")])];
      const ex = await prisma.exercise.create({
        data: { ...base, type: "image_guess", question: "¿Qué palabra aymara es?", image_id: img.mediaId, config: { maxIntentos: 5 }, blanks: { create: variantes.map((answer_text) => ({ answer_text })) } },
      });
      await enlazar(ex.id);
      creados++;
    }

    // Arrastra la tarjeta: la imagen correcta y tres distractoras de otras palabras
    const yaArrastra = await prisma.exercise.findFirst({ where: { paralelo_id: paraleloId, type: "drag_card", question: img.palabra }, select: { id: true } });
    if (yaArrastra) omitidos++;
    else {
      const otras = imagenes.filter((_, j) => j !== i);
      const distractoras: typeof otras = [];
      // Distractoras repartidas de forma determinista (siguientes en la lista): reproducible y sin repetir.
      for (let k = 1; distractoras.length < 3 && k <= otras.length; k++) distractoras.push(otras[(i * 3 + k * 7) % otras.length]);
      const unicas = [...new Map(distractoras.map((d) => [d.mediaId, d])).values()].slice(0, 3);
      const ex = await prisma.exercise.create({
        data: {
          ...base, type: "drag_card", question: img.palabra,
          options: { create: [{ image_id: img.mediaId, is_correct: true }, ...unicas.map((d) => ({ image_id: d.mediaId, is_correct: false }))] },
        },
      });
      await enlazar(ex.id);
      creados++;
    }
  }
  return { ok: true, creados, omitidos };
}
