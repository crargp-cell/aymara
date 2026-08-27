import { prisma } from "@/lib/prisma";

/**
 * Agrega al mapa de un PARALELO cualquier lección/examen activo que todavía no
 * esté en `ContentOrder`, sin tocar el orden que un maestro ya haya definido a
 * mano — el contenido nuevo se agrega al final (aditivo e idempotente).
 */
export async function ensureContentOrder(paraleloId: number) {
  const existingRows = await prisma.contentOrder.findMany({ where: { paralelo_id: paraleloId } });
  const existingLessonIds = new Set(existingRows.filter((r) => r.content_type === "lesson").map((r) => r.content_id));
  const existingExamIds = new Set(existingRows.filter((r) => r.content_type === "exam").map((r) => r.content_id));
  const maxOrden = existingRows.reduce((m, r) => Math.max(m, r.orden), 0);

  const [lessons, exams] = await Promise.all([
    prisma.lesson.findMany({ where: { estado: "activo", paralelo_id: paraleloId }, orderBy: { orden: "asc" } }),
    prisma.exam.findMany({ where: { estado: "activo", paralelo_id: paraleloId }, orderBy: { id: "asc" } }),
  ]);

  const additions = [
    ...lessons.filter((l) => !existingLessonIds.has(l.id)).map((l) => ({ content_type: "lesson" as const, content_id: l.id })),
    ...exams.filter((e) => !existingExamIds.has(e.id)).map((e) => ({ content_type: "exam" as const, content_id: e.id })),
  ];
  if (additions.length === 0) return;

  await prisma.contentOrder.createMany({
    data: additions.map((a, i) => ({ paralelo_id: paraleloId, content_type: a.content_type, content_id: a.content_id, orden: maxOrden + (i + 1) * 10 })),
    skipDuplicates: true,
  });
}
