import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/session";

/** IDs de paralelos que un maestro puede gestionar. */
export async function maestroParaleloIds(maestroId: number): Promise<number[]> {
  const rows = await prisma.paralelo.findMany({
    where: { OR: [{ profesor_id: maestroId }, { asignaciones: { some: { profesor_id: maestroId, activo: true } } }] },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function assertMaestroOwnsParalelo(role: Role, userId: number, paraleloId: number): Promise<boolean> {
  if (role === "admin") return true;
  if (role !== "maestro") return false;
  const ids = await maestroParaleloIds(userId);
  return ids.includes(paraleloId);
}

type ContentKind = "lesson" | "exercise" | "exam" | "arcard" | "topic";

/** Resuelve el paralelo dueño de una pieza de contenido y valida permiso. */
export async function assertMaestroOwnsContent(
  role: Role,
  userId: number,
  kind: ContentKind,
  id: number,
): Promise<{ ok: boolean; paraleloId: number | null }> {
  let paraleloId: number | null = null;
  if (kind === "lesson") paraleloId = (await prisma.lesson.findUnique({ where: { id }, select: { paralelo_id: true } }))?.paralelo_id ?? null;
  else if (kind === "exercise") paraleloId = (await prisma.exercise.findUnique({ where: { id }, select: { paralelo_id: true } }))?.paralelo_id ?? null;
  else if (kind === "exam") paraleloId = (await prisma.exam.findUnique({ where: { id }, select: { paralelo_id: true } }))?.paralelo_id ?? null;
  else if (kind === "arcard") paraleloId = (await prisma.arCard.findUnique({ where: { id }, select: { paralelo_id: true } }))?.paralelo_id ?? null;
  else if (kind === "topic") {
    const t = await prisma.lessonTopic.findUnique({ where: { id }, select: { lesson: { select: { paralelo_id: true } } } });
    paraleloId = t?.lesson.paralelo_id ?? null;
  }
  if (paraleloId == null) return { ok: false, paraleloId: null };
  const ok = await assertMaestroOwnsParalelo(role, userId, paraleloId);
  return { ok, paraleloId };
}

/** ¿El alumno está inscrito (gestión actual) en el paralelo dueño de la lección? */
export async function alumnoPuedeVerLeccion(alumnoId: number, lessonId: number): Promise<boolean> {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { paralelo_id: true, estado: true } });
  if (!lesson || lesson.estado === "retirado" || lesson.estado === "archivado") return false;
  const insc = await prisma.inscripcion.findFirst({
    where: {
      alumno_id: alumnoId,
      paralelo_id: lesson.paralelo_id,
      estado: { in: ["activo", "reincorporado"] },
      paralelo: { gestion: { es_actual: true } },
    },
    select: { id: true },
  });
  return !!insc;
}

/**
 * Chequeo de acceso a un examen (Negocio.md §20, §22):
 * inscripción activa + prerequisitos completados y vigentes + ventana + intentos.
 */
export async function alumnoPuedeRendirExamen(
  alumnoId: number,
  examId: number,
): Promise<{ ok: boolean; motivo?: string }> {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { prerequisitos: true },
  });
  if (!exam || exam.estado !== "activo") return { ok: false, motivo: "El examen no está disponible." };

  const insc = await prisma.inscripcion.findFirst({
    where: {
      alumno_id: alumnoId,
      paralelo_id: exam.paralelo_id,
      estado: { in: ["activo", "reincorporado"] },
      paralelo: { gestion: { es_actual: true } },
    },
    select: { id: true },
  });
  if (!insc) return { ok: false, motivo: "No estás inscrito en el paralelo de este examen." };

  const now = new Date();
  if (exam.start_date && now < exam.start_date) return { ok: false, motivo: "El examen aún no está abierto." };
  if (exam.end_date && now > exam.end_date) return { ok: false, motivo: "El plazo del examen ya cerró." };

  for (const pre of exam.prerequisitos) {
    const done = await prisma.userProgress.findFirst({
      where: { alumno_id: alumnoId, lesson_id: pre.lesson_id, completed: true },
      select: { lesson_version: true },
    });
    const lesson = await prisma.lesson.findUnique({ where: { id: pre.lesson_id }, select: { min_valid_version: true, title: true } });
    if (!done || !lesson || done.lesson_version < lesson.min_valid_version) {
      return { ok: false, motivo: `Debes completar antes: ${lesson?.title ?? "una lección requerida"}.` };
    }
  }

  if (exam.max_attempts != null) {
    const used = await prisma.examAttempt.count({ where: { exam_id: examId, alumno_id: alumnoId, completed_at: { not: null } } });
    if (used >= exam.max_attempts) return { ok: false, motivo: "Agotaste los intentos permitidos." };
  }

  return { ok: true };
}
