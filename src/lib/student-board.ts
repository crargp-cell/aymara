import { prisma } from "@/lib/prisma";
import { ensureContentOrder } from "@/lib/content-order";
import { getParaleloActivoAlumno, type ParaleloResumen } from "@/lib/paralelo";

export type BoardNode = {
  key: string;
  type: "lesson" | "exam";
  id: number;
  title: string;
  orden: number;
  done: boolean;
  unlocked: boolean;
  lockReason: string | null;
  examType?: "conectar_palabras" | "ar_exam";
  /** Sólo en vista previa: por qué el alumno no vería este nodo ahora mismo. */
  nota?: string;
};

export type StudentBoard = {
  paralelo: ParaleloResumen | null;
  nodes: BoardNode[];
  completedLessonIds: Set<number>;
  totalDone: number;
};

/**
 * Construye el "tablero" del alumno: la secuencia de lecciones/exámenes de su
 * paralelo activo, con estado hecho/desbloqueado. Sólo las LECCIONES bloquean el
 * avance; un examen se desbloquea por sus prerequisitos + su ventana de fechas.
 */
export async function getStudentBoard(alumnoId: number): Promise<StudentBoard> {
  const paralelo = await getParaleloActivoAlumno(alumnoId);
  if (!paralelo) return { paralelo: null, nodes: [], completedLessonIds: new Set(), totalDone: 0 };

  await ensureContentOrder(paralelo.id);
  const ordered = await prisma.contentOrder.findMany({ where: { paralelo_id: paralelo.id }, orderBy: { orden: "asc" } });

  const lessonIds = ordered.filter((o) => o.content_type === "lesson").map((o) => o.content_id);
  const examIds = ordered.filter((o) => o.content_type === "exam").map((o) => o.content_id);

  const [lessons, exams, progress, passedAttempts] = await Promise.all([
    prisma.lesson.findMany({ where: { id: { in: lessonIds }, estado: "activo" } }),
    prisma.exam.findMany({ where: { id: { in: examIds }, estado: "activo" }, include: { prerequisitos: true } }),
    prisma.userProgress.findMany({ where: { alumno_id: alumnoId, completed: true } }),
    prisma.examAttempt.findMany({ where: { alumno_id: alumnoId, passed: true }, select: { exam_id: true } }),
  ]);

  const lessonMap = new Map(lessons.map((l) => [l.id, l]));
  const examMap = new Map(exams.map((e) => [e.id, e]));
  const minValid = new Map(lessons.map((l) => [l.id, l.min_valid_version]));

  // Completadas y VIGENTES (una lección con cambio mayor caduca — Negocio.md §15).
  const completedLessonIds = new Set(
    progress.filter((p) => p.lesson_version >= (minValid.get(p.lesson_id) ?? 1)).map((p) => p.lesson_id),
  );
  const passedExamIds = new Set(passedAttempts.map((a) => a.exam_id));

  const now = new Date();
  const nodes: BoardNode[] = [];
  const priorLessonIds: number[] = [];

  for (const o of ordered) {
    if (o.content_type === "lesson") {
      const l = lessonMap.get(o.content_id);
      if (!l) continue;
      const done = completedLessonIds.has(l.id);
      const unlocked = done || priorLessonIds.every((id) => completedLessonIds.has(id));
      nodes.push({
        key: `lesson-${l.id}`,
        type: "lesson",
        id: l.id,
        title: l.title,
        orden: o.orden,
        done,
        unlocked,
        lockReason: unlocked ? null : "Completa las lecciones anteriores.",
      });
      priorLessonIds.push(l.id);
    } else {
      const e = examMap.get(o.content_id);
      if (!e) continue;
      // Ventana de disponibilidad (Negocio.md §22).
      if (e.start_date && now < e.start_date) continue;
      if (e.end_date && now > e.end_date) continue;
      const done = passedExamIds.has(e.id);
      const prereqOk = e.prerequisitos.every((p) => completedLessonIds.has(p.lesson_id));
      nodes.push({
        key: `exam-${e.id}`,
        type: "exam",
        id: e.id,
        title: e.title,
        orden: o.orden,
        done,
        unlocked: done || prereqOk,
        lockReason: done || prereqOk ? null : "Completa las lecciones requeridas antes.",
        examType: e.type,
      });
    }
  }

  return {
    paralelo,
    nodes,
    completedLessonIds,
    totalDone: nodes.filter((n) => n.done).length,
  };
}

/**
 * Mismo mapa pero para el docente que revisa un paralelo: todo desbloqueado y
 * sin progreso, porque no está cursando. A diferencia de la vista del alumno
 * incluye los exámenes fuera de su ventana, anotando por qué el alumno no los
 * vería — es justo lo que el autor necesita revisar.
 */
export async function getPreviewBoard(paraleloId: number): Promise<BoardNode[]> {
  await ensureContentOrder(paraleloId);
  const ordered = await prisma.contentOrder.findMany({ where: { paralelo_id: paraleloId }, orderBy: { orden: "asc" } });

  const lessonIds = ordered.filter((o) => o.content_type === "lesson").map((o) => o.content_id);
  const examIds = ordered.filter((o) => o.content_type === "exam").map((o) => o.content_id);
  const [lessons, exams] = await Promise.all([
    prisma.lesson.findMany({ where: { id: { in: lessonIds } } }),
    prisma.exam.findMany({ where: { id: { in: examIds } }, include: { prerequisitos: true } }),
  ]);
  const lessonMap = new Map(lessons.map((l) => [l.id, l]));
  const examMap = new Map(exams.map((e) => [e.id, e]));

  const now = new Date();
  const nodes: BoardNode[] = [];

  for (const o of ordered) {
    if (o.content_type === "lesson") {
      const l = lessonMap.get(o.content_id);
      if (!l) continue;
      nodes.push({
        key: `lesson-${l.id}`,
        type: "lesson",
        id: l.id,
        title: l.title,
        orden: o.orden,
        done: false,
        unlocked: true,
        lockReason: null,
        nota: l.estado !== "activo" ? `Lección ${l.estado}: el alumno no la ve` : undefined,
      });
    } else {
      const e = examMap.get(o.content_id);
      if (!e) continue;
      const fuera =
        e.start_date && now < e.start_date
          ? `Abre el ${e.start_date.toLocaleDateString()}`
          : e.end_date && now > e.end_date
            ? `Cerró el ${e.end_date.toLocaleDateString()}`
            : e.estado !== "activo"
              ? `Examen ${e.estado}: el alumno no lo ve`
              : undefined;
      nodes.push({
        key: `exam-${e.id}`,
        type: "exam",
        id: e.id,
        title: e.title,
        orden: o.orden,
        done: false,
        unlocked: true,
        lockReason: null,
        examType: e.type,
        nota: fuera ?? (e.prerequisitos.length ? `Requiere ${e.prerequisitos.length} lección(es)` : undefined),
      });
    }
  }
  return nodes;
}
