import { prisma } from "@/lib/prisma";

/**
 * Otorga la tarjeta AR de recompensa de una lección al completarla, si:
 *  - la lección tiene `grants_ar` y una `ar_card_id`, o
 *  - existe una ArCard con unlock_type=lesson y unlock_lesson_id = esta lección,
 *  y la tarjeta está `activo` (Negocio.md §19, §21).
 * Nunca re-otorga una tarjeta ya revocada.
 */
export async function grantLessonReward(alumnoId: number, lessonId: number): Promise<number | null> {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { grants_ar: true, ar_card_id: true } });
  let cardId = lesson?.grants_ar ? lesson.ar_card_id ?? null : null;
  if (!cardId) {
    const byUnlock = await prisma.arCard.findFirst({
      where: { unlock_type: "lesson", unlock_lesson_id: lessonId, estado: "activo" },
      select: { id: true },
    });
    cardId = byUnlock?.id ?? null;
  }
  if (!cardId) return null;

  const card = await prisma.arCard.findUnique({ where: { id: cardId }, select: { estado: true } });
  if (!card || card.estado === "retirado" || card.estado === "deshabilitado") return null;

  const existing = await prisma.userArCard.findUnique({ where: { alumno_id_ar_card_id: { alumno_id: alumnoId, ar_card_id: cardId } } });
  if (existing) return existing.revocado ? null : cardId;

  await prisma.userArCard.create({
    data: { alumno_id: alumnoId, ar_card_id: cardId, unlocked_by: "lesson", source_id: lessonId },
  });
  return cardId;
}

/** Otorga la tarjeta de recompensa de un examen al aprobarlo. */
export async function grantExamReward(alumnoId: number, examId: number): Promise<number | null> {
  const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { ar_card_id: true } });
  if (!exam?.ar_card_id) return null;
  const card = await prisma.arCard.findUnique({ where: { id: exam.ar_card_id }, select: { estado: true } });
  if (!card || card.estado === "retirado" || card.estado === "deshabilitado") return null;

  const existing = await prisma.userArCard.findUnique({ where: { alumno_id_ar_card_id: { alumno_id: alumnoId, ar_card_id: exam.ar_card_id } } });
  if (existing) return existing.revocado ? null : exam.ar_card_id;

  await prisma.userArCard.create({
    data: { alumno_id: alumnoId, ar_card_id: exam.ar_card_id, unlocked_by: "exam", source_id: examId },
  });
  return exam.ar_card_id;
}
