"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { assertMaestroOwnsContent, maestroParaleloIds } from "@/lib/rbac";
import { purgeUnusedMedia, saveTopicMedia } from "@/lib/topic-slides";
import { canvasMediaIds, canvasTitle, sanitizeCanvas } from "@/lib/slide-canvas";
import { leerBiblioteca, listarBiblioteca, type RecursoBiblioteca } from "@/lib/recursos";

/*
  Acciones del editor de diapositivas. Las llama el componente de cliente
  <SlideEditor> directamente (no son <form action>), así que devuelven datos en
  vez de redirigir. Cada una vuelve a comprobar que el maestro es dueño del
  paralelo del tema: el id llega del cliente y no se puede fiar de él.
*/

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string; conflicto?: boolean };
const NO_PERMISO = { ok: false, error: "No tienes permiso sobre este tema." } as const;

async function autorizar(topicId: number) {
  if (!Number.isInteger(topicId)) return false;
  const user = await requireRole(["maestro", "admin"]);
  const { ok } = await assertMaestroOwnsContent(user.role, user.id, "topic", topicId);
  return ok;
}

async function topicDe(slideId: number) {
  const slide = await prisma.topicSlide.findUnique({ where: { id: slideId }, select: { topic_id: true } });
  return slide?.topic_id ?? null;
}

// Sólo se invalida la vista del alumno: la del maestro ya tiene el estado en el
// editor, y refrescarla en cada autoguardado sólo gastaría una petición.
const refrescar = (topicId: number) => revalidatePath(`/topics/${topicId}`);

export async function createSlideAction(topicId: number, canvasRaw: unknown): Promise<Resultado<{ id: number; version: string }>> {
  if (!(await autorizar(topicId))) return NO_PERMISO;
  const canvas = sanitizeCanvas(canvasRaw);
  const ultima = await prisma.topicSlide.aggregate({ where: { topic_id: topicId }, _max: { order: true } });
  const row = await prisma.topicSlide.create({
    data: { topic_id: topicId, order: (ultima._max.order ?? -1) + 1, title: canvasTitle(canvas), canvas },
    select: { id: true, updated_at: true },
  });
  refrescar(topicId);
  return { ok: true, id: row.id, version: row.updated_at.toISOString() };
}

/**
 * Guarda una diapositiva. `version` es el `updated_at` que tenía el editor al cargarla
 * (o al guardarla por última vez): si en la base es otro, alguien más la modificó y se
 * devuelve `conflicto` en vez de pisar su trabajo. Con `forzar` se sobrescribe a propósito.
 */
export async function saveSlideAction(slideId: number, canvasRaw: unknown, audioId: number | null, version: string | null = null, forzar = false): Promise<Resultado<{ version: string }>> {
  const actual = await prisma.topicSlide.findUnique({ where: { id: slideId }, select: { topic_id: true, updated_at: true } });
  const topicId = actual?.topic_id ?? null;
  if (!actual || topicId === null || !(await autorizar(topicId))) return NO_PERMISO;
  if (!forzar && version && actual.updated_at.toISOString() !== version) {
    return { ok: false, conflicto: true, error: "Otra persona modificó esta diapositiva mientras la editabas." };
  }

  const canvas = sanitizeCanvas(canvasRaw);
  if (audioId !== null) {
    const audio = await prisma.topicMedia.findFirst({ where: { id: audioId, topic_id: topicId, kind: "audio" }, select: { id: true } });
    if (!audio) return { ok: false, error: "El audio no existe." };
  }
  // El lienzo sólo puede apuntar a medios de este mismo tema y del tipo correcto
  // (imágenes en imágenes y fondo, audios en los botones de sonido).
  const ids = canvasMediaIds(canvas);
  if (ids.length) {
    const validas = await prisma.topicMedia.findMany({ where: { id: { in: ids }, topic_id: topicId }, select: { id: true, kind: true } });
    const tipo = new Map(validas.map((m) => [m.id, m.kind]));
    canvas.elements = canvas.elements.flatMap((e) => {
      if (e.type === "image") return e.mediaId && tipo.get(e.mediaId) === "image" ? [e] : [];
      if (e.type === "sound" && e.mediaId && tipo.get(e.mediaId) !== "audio") {
        const sinAudio = { ...e };
        delete sinAudio.mediaId;
        return [sinAudio];
      }
      return [e];
    });
    if (canvas.bgMediaId && tipo.get(canvas.bgMediaId) !== "image") {
      delete canvas.bgMediaId; delete canvas.bgOverlay; delete canvas.bgOverlayOpacity;
    }
  }

  const antes = await prisma.topicSlide.findUnique({ where: { id: slideId }, select: { canvas: true, audio_id: true } });
  const idsAntes = antes?.canvas ? canvasMediaIds(sanitizeCanvas(antes.canvas)) : [];
  const idsAhora = new Set(canvasMediaIds(canvas));

  const guardada = await prisma.topicSlide.update({
    where: { id: slideId },
    data: { canvas, title: canvasTitle(canvas), audio_id: audioId },
    select: { updated_at: true },
  });
  // Barrer medios cuesta una consulta por diapositiva: sólo si esta guardada soltó alguno.
  const solto = idsAntes.some((id) => !idsAhora.has(id)) || antes?.audio_id !== audioId;
  if (solto) await purgeUnusedMedia(topicId);
  refrescar(topicId);
  return { ok: true, version: guardada.updated_at.toISOString() };
}

export async function deleteSlideAction(slideId: number): Promise<Resultado> {
  const topicId = await topicDe(slideId);
  if (topicId === null || !(await autorizar(topicId))) return NO_PERMISO;
  await prisma.topicSlide.delete({ where: { id: slideId } });
  await purgeUnusedMedia(topicId);
  refrescar(topicId);
  return { ok: true };
}

/** Guarda el orden completo: `ids` es la lista de diapositivas del tema en su nuevo orden. */
export async function reorderSlidesAction(topicId: number, ids: number[]): Promise<Resultado> {
  if (!(await autorizar(topicId))) return NO_PERMISO;
  const propias = await prisma.topicSlide.findMany({ where: { topic_id: topicId }, select: { id: true } });
  const validas = new Set(propias.map((s) => s.id));
  const orden = ids.filter((id) => validas.has(id));
  await prisma.$transaction(orden.map((id, i) => prisma.topicSlide.update({ where: { id }, data: { order: i } })));
  refrescar(topicId);
  return { ok: true };
}

/** Sube una imagen o un audio del tema y devuelve su id. */
export async function uploadMediaAction(formData: FormData): Promise<Resultado<{ id: number }>> {
  const topicId = Number(formData.get("topic_id"));
  const kind = formData.get("kind") === "audio" ? "audio" : "image";
  if (!(await autorizar(topicId))) return NO_PERMISO;
  const id = await saveTopicMedia(topicId, kind, formData.get("file"));
  if (id === null) return { ok: false, error: "No se recibió ningún archivo." };
  if (typeof id === "object") return { ok: false, error: id.error };
  return { ok: true, id };
}

/* ───────────── panel de recursos ───────────── */

export type RecursoMedia = { id: number; nombre: string; kind: "image" | "audio"; sizeBytes: number; tema: string; enEsteTema: boolean };

/** Filtro de los medios que el usuario puede reutilizar: los de temas de sus paralelos (todos, si es admin). */
async function dondeMedia(user: { id: number; role: string }) {
  if (user.role === "admin") return {};
  const ids = await maestroParaleloIds(user.id);
  return { topic: { lesson: { paralelo_id: { in: ids } } } };
}

/** Imágenes y audios ya subidos (sin repetidos) más la biblioteca incluida en la aplicación. */
export async function listarRecursosAction(topicId: number): Promise<Resultado<{ medios: RecursoMedia[]; biblioteca: RecursoBiblioteca[] }>> {
  if (!(await autorizar(topicId))) return NO_PERMISO;
  const user = await requireRole(["maestro", "admin"]);
  const filas = await prisma.topicMedia.findMany({
    where: await dondeMedia(user),
    orderBy: { id: "desc" },
    take: 600,
    select: { id: true, topic_id: true, kind: true, nombre: true, size_bytes: true, topic: { select: { title: true } } },
  });
  // El mismo archivo subido a varios temas se muestra una vez, prefiriendo la copia de este tema.
  const unicos = new Map<string, RecursoMedia>();
  for (const f of filas) {
    const clave = `${f.kind}|${f.nombre}|${f.size_bytes}`;
    const previo = unicos.get(clave);
    if (previo && (previo.enEsteTema || f.topic_id !== topicId)) continue;
    unicos.set(clave, { id: f.id, nombre: f.nombre, kind: f.kind === "audio" ? "audio" : "image", sizeBytes: f.size_bytes, tema: f.topic.title, enEsteTema: f.topic_id === topicId });
  }
  return { ok: true, medios: [...unicos.values()], biblioteca: await listarBiblioteca() };
}

export type OrigenRecurso = { tipo: "media"; id: number } | { tipo: "biblioteca"; grupo: string; archivo: string };

/**
 * Deja un recurso disponible en este tema y devuelve su id. Un medio de otro tema
 * se copia (cada tema tiene los suyos: si se borra aquel, éste no queda roto) y
 * si ya hay una copia idéntica en este tema se reutiliza en vez de duplicarla.
 */
export async function usarRecursoAction(topicId: number, origen: OrigenRecurso): Promise<Resultado<{ id: number; kind: "image" | "audio" }>> {
  if (!(await autorizar(topicId))) return NO_PERMISO;
  const user = await requireRole(["maestro", "admin"]);

  if (origen.tipo === "media") {
    // `data` está excluido por defecto (src/lib/prisma.ts); aquí se pide a propósito.
    const fuente = await prisma.topicMedia.findFirst({
      where: { id: Number(origen.id), ...(await dondeMedia(user)) },
      select: { id: true, topic_id: true, kind: true, nombre: true, mime: true, size_bytes: true, data: true },
    });
    if (!fuente) return { ok: false, error: "El recurso ya no existe." };
    const kind = fuente.kind === "audio" ? "audio" : "image";
    if (fuente.topic_id === topicId) return { ok: true, id: fuente.id, kind };
    const igual = await prisma.topicMedia.findFirst({ where: { topic_id: topicId, kind: fuente.kind, nombre: fuente.nombre, size_bytes: fuente.size_bytes }, select: { id: true } });
    if (igual) return { ok: true, id: igual.id, kind };
    const copia = await prisma.topicMedia.create({
      data: { topic_id: topicId, kind: fuente.kind, nombre: fuente.nombre, mime: fuente.mime, size_bytes: fuente.size_bytes, data: fuente.data },
      select: { id: true },
    });
    return { ok: true, id: copia.id, kind };
  }

  const archivo = await leerBiblioteca(String(origen.grupo), String(origen.archivo));
  if (!archivo) return { ok: false, error: "Ese recurso no existe en la biblioteca." };
  const igual = await prisma.topicMedia.findFirst({ where: { topic_id: topicId, kind: "image", nombre: archivo.nombre }, select: { id: true } });
  if (igual) return { ok: true, id: igual.id, kind: "image" };
  const fila = await prisma.topicMedia.create({
    data: { topic_id: topicId, kind: "image", nombre: archivo.nombre.slice(0, 255), mime: archivo.mime, size_bytes: archivo.data.length, data: Uint8Array.from(archivo.data) },
    select: { id: true },
  });
  return { ok: true, id: fila.id, kind: "image" };
}
