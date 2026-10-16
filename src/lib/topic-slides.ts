import { prisma } from "@/lib/prisma";
import { canvasMediaIds, emptyCanvas, mediaUrl, sanitizeCanvas, type SlideCanvas } from "@/lib/slide-canvas";

/** Tipos y tamaños admitidos por clase de medio. */
export const MEDIA_RULES = {
  image: { mimes: ["image/jpeg", "image/png", "image/webp", "image/gif"], maxBytes: 5 * 1024 * 1024, label: "imagen (JPG, PNG, WebP o GIF, máx. 5 MB)" },
  audio: {
    mimes: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg", "audio/webm", "audio/mp4", "audio/x-m4a", "audio/aac"],
    maxBytes: 10 * 1024 * 1024,
    label: "audio (MP3, WAV, OGG, M4A o WebM, máx. 10 MB)",
  },
} as const;

/** Forma que consume el reproductor: sólo datos serializables. */
export type SlideView = {
  id: number;
  canvas: SlideCanvas;
  audioUrl: string | null;
};

export { mediaUrl };

export async function getSlideViews(topicId: number): Promise<SlideView[]> {
  const rows = await prisma.topicSlide.findMany({
    where: { topic_id: topicId },
    orderBy: [{ order: "asc" }, { id: "asc" }],
  });
  return rows.map((s) => ({
    id: s.id,
    canvas: s.canvas ? sanitizeCanvas(s.canvas) : emptyCanvas(),
    audioUrl: s.audio_id ? mediaUrl(s.audio_id) : null,
  }));
}

/**
 * Valida un archivo subido y lo guarda como TopicMedia. Devuelve el id, `null`
 * si no había archivo, o `{ error }` si no pasó la validación.
 */
export async function saveTopicMedia(
  topicId: number,
  kind: "image" | "audio",
  file: FormDataEntryValue | null,
): Promise<number | null | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return null;
  const rule = MEDIA_RULES[kind];
  // Algunos navegadores mandan los .mp3 como application/octet-stream vacío; se
  // acepta por extensión sólo en ese caso.
  const porExtension = kind === "audio" && /\.(mp3|wav|ogg|m4a|aac|webm)$/i.test(file.name);
  const mime = (rule.mimes as readonly string[]).includes(file.type) ? file.type : porExtension ? guessAudioMime(file.name) : null;
  if (!mime) return { error: `Formato no admitido. Sube una ${rule.label}.` };
  if (file.size > rule.maxBytes) return { error: `El archivo es demasiado grande. Máximo ${Math.round(rule.maxBytes / 1024 / 1024)} MB.` };

  const row = await prisma.topicMedia.create({
    data: { topic_id: topicId, kind, nombre: file.name.slice(0, 255), mime, size_bytes: file.size, data: Buffer.from(await file.arrayBuffer()) },
    select: { id: true },
  });
  return row.id;
}

function guessAudioMime(name: string): string {
  const ext = name.toLowerCase().split(".").pop();
  return ({ mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", m4a: "audio/mp4", aac: "audio/aac", webm: "audio/webm" } as Record<string, string>)[ext ?? ""] ?? "audio/mpeg";
}

/**
 * Borra los medios de un tema que ya no usa ninguna diapositiva (ni como imagen
 * o audio de la diapositiva, ni dentro de su lienzo).
 */
export async function purgeUnusedMedia(topicId: number): Promise<void> {
  const slides = await prisma.topicSlide.findMany({ where: { topic_id: topicId }, select: { canvas: true } });
  const enLienzo = slides.flatMap((s) => (s.canvas ? canvasMediaIds(sanitizeCanvas(s.canvas)) : []));
  await prisma.topicMedia.deleteMany({
    // Margen de 10 min: una imagen recién subida aún no está en ningún lienzo guardado.
    where: { topic_id: topicId, created_at: { lt: new Date(Date.now() - 10 * 60_000) }, audioSlides: { none: {} }, id: { notIn: enLienzo } },
  });
}
