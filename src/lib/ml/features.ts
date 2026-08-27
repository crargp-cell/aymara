import { prisma } from "@/lib/prisma";

export type StudentFeatures = {
  alumnoId: number;
  paraleloId: number;
  /** Nº de respuestas registradas. Metadato (no entra al vector): sirve para
   *  distinguir "sin datos suficientes" de "en riesgo". */
  totalAttempts: number;
  accuracy: number;
  accFacil: number;
  accMedio: number;
  accDificil: number;
  avgTimeS: number;
  lessonsRatio: number;
  examPassRatio: number;
  retriesPerLesson: number;
  trend: number; // >0 mejora, <0 empeora
};

const ratio = (ok: number, total: number) => (total > 0 ? ok / total : 0);

/** Vector de características por alumno para el modelo de riesgo (Negocio.md §27). */
export async function buildStudentFeatures(alumnoId: number, paraleloId: number): Promise<StudentFeatures> {
  const [attempts, lessonsInParalelo, completed, lessonAttempts, examAttempts] = await Promise.all([
    prisma.exerciseAttempt.findMany({ where: { alumno_id: alumnoId }, select: { is_correct: true, dificultad: true, time_spent_ms: true, created_at: true } }),
    prisma.lesson.count({ where: { paralelo_id: paraleloId, estado: "activo" } }),
    prisma.userProgress.count({ where: { alumno_id: alumnoId, completed: true } }),
    prisma.lessonAttempt.groupBy({ by: ["lesson_id"], where: { alumno_id: alumnoId }, _count: { _all: true } }),
    prisma.examAttempt.findMany({ where: { alumno_id: alumnoId, completed_at: { not: null } }, select: { passed: true } }),
  ]);

  const total = attempts.length;
  const byDiff = (d: "facil" | "medio" | "dificil") => attempts.filter((a) => a.dificultad === d);
  const acc = (rows: typeof attempts) => ratio(rows.filter((r) => r.is_correct).length, rows.length);

  // Tendencia: precisión de la primera mitad vs la segunda mitad (cronológico).
  const sorted = [...attempts].sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  const half = Math.floor(sorted.length / 2);
  const trend = sorted.length >= 6 ? acc(sorted.slice(half)) - acc(sorted.slice(0, half)) : 0;

  const retries = lessonAttempts.length ? lessonAttempts.reduce((s, l) => s + l._count._all, 0) / lessonAttempts.length : 0;

  return {
    alumnoId,
    paraleloId,
    totalAttempts: total,
    accuracy: acc(attempts),
    accFacil: acc(byDiff("facil")),
    accMedio: acc(byDiff("medio")),
    accDificil: acc(byDiff("dificil")),
    avgTimeS: total ? attempts.reduce((s, a) => s + (a.time_spent_ms ?? 0), 0) / total / 1000 : 0,
    lessonsRatio: ratio(completed, lessonsInParalelo),
    examPassRatio: ratio(examAttempts.filter((e) => e.passed).length, examAttempts.length),
    retriesPerLesson: retries,
    trend,
  };
}

/** Características de todos los alumnos con inscripción activa (gestión actual). */
export async function buildAllStudentFeatures(): Promise<StudentFeatures[]> {
  const inscripciones = await prisma.inscripcion.findMany({
    where: { estado: { in: ["activo", "reincorporado"] }, paralelo: { gestion: { es_actual: true } } },
    select: { alumno_id: true, paralelo_id: true },
  });
  return Promise.all(inscripciones.map((i) => buildStudentFeatures(i.alumno_id, i.paralelo_id)));
}

/** Mínimo de respuestas para que una predicción de riesgo sea significativa. */
export const MIN_ATTEMPTS_PARA_PREDECIR = 5;

/** Orden fijo de las columnas del vector para el modelo. */
export const FEATURE_KEYS: (keyof StudentFeatures)[] = [
  "accuracy",
  "accFacil",
  "accMedio",
  "accDificil",
  "avgTimeS",
  "lessonsRatio",
  "examPassRatio",
  "retriesPerLesson",
  "trend",
];

export function toVector(f: StudentFeatures): number[] {
  return FEATURE_KEYS.map((k) => {
    const v = f[k] as number;
    return Number.isFinite(v) ? v : 0;
  });
}
