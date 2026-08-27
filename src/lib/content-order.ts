import { prisma } from "@/lib/prisma";

/**
 * Agrega al mapa de un curso cualquier lección/examen activo que todavía no esté en
 * `ContentOrder`, sin tocar el orden que un maestro ya haya definido manualmente —
 * las lecciones/exámenes nuevos se agregan al final, no reemplazan la secuencia existente.
 */
export async function ensureContentOrder(curso: number) {
  const existingRows = await prisma.contentOrder.findMany({ where: { curso_id: curso } });
  const existingLessonIds = new Set(existingRows.filter((r) => r.content_type === "lesson").map((r) => r.content_id));
  const existingExamIds = new Set(existingRows.filter((r) => r.content_type === "exam").map((r) => r.content_id));
  const maxOrden = existingRows.reduce((m, r) => Math.max(m, r.orden), 0);

  const [lessons, exams] = await Promise.all([
    prisma.lesson.findMany({ where: { activo: true, curso }, orderBy: { orden: "asc" } }),
    prisma.exam.findMany({ where: { active: true }, orderBy: { id: "asc" } }),
  ]);

  const additions = [
    ...lessons.filter((l) => !existingLessonIds.has(l.id)).map((l) => ({ content_type: "lesson" as const, content_id: l.id })),
    ...exams.filter((e) => !existingExamIds.has(e.id)).map((e) => ({ content_type: "exam" as const, content_id: e.id })),
  ];
  if (additions.length === 0) return;

  await prisma.contentOrder.createMany({
    data: additions.map((a, i) => ({ curso_id: curso, content_type: a.content_type, content_id: a.content_id, orden: maxOrden + (i + 1) * 10 })),
    skipDuplicates: true,
  });
}
