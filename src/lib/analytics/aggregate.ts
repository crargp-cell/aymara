import { prisma } from "@/lib/prisma";

/**
 * Recalcula `statistics_aggregated` de forma descriptiva (Negocio.md §26).
 * Claves con centinela 0 (no NULL) para que los upsert por clave compuesta parcial
 * dedupliquen. Produce filas por: ejercicio, lección, paralelo y alumno.
 */

function mode(values: (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | null = null;
  let bestC = 0;
  for (const [k, c] of counts) {
    if (c > bestC) {
      best = k;
      bestC = c;
    }
  }
  return best;
}

type StatKey = { stat_type: "exercise" | "lesson" | "paralelo" | "student"; alumno_id?: number; exercise_id?: number; lesson_id?: number; paralelo_id?: number };

async function upsertStat(key: StatKey, data: {
  total: number; ok: number; fail: number; avgScore: number; avgTimeMs: number; commonError: string | null; difficulty: number; predicted: "facil" | "medio" | "dificil" | null;
}) {
  const where = {
    stat_type: key.stat_type,
    alumno_id: key.alumno_id ?? 0,
    exercise_id: key.exercise_id ?? 0,
    lesson_id: key.lesson_id ?? 0,
    paralelo_id: key.paralelo_id ?? 0,
    gestion_id: 0,
  };
  const payload = {
    total_attempts: data.total,
    successful_attempts: data.ok,
    failed_attempts: data.fail,
    average_score: Math.round(data.avgScore * 100) / 100,
    average_time_ms: Math.round(data.avgTimeMs * 100) / 100,
    most_common_error: data.commonError,
    difficulty_score: Math.round(data.difficulty * 100) / 100,
    predicted_difficulty: data.predicted,
    last_calculated: new Date(),
  };
  await prisma.statisticsAggregated.upsert({
    where: { stat_type_alumno_id_exercise_id_lesson_id_paralelo_id_gestion_id: where },
    create: { ...where, ...payload },
    update: payload,
  });
}

export async function recomputeAnalytics(): Promise<{ exercises: number; lessons: number; paralelos: number; students: number }> {
  // Se recalcula desde cero: si cambian las claves (p. ej. al empezar a guardar
  // paralelo_id en las filas de ejercicio) quedarían filas huérfanas con la
  // clave vieja y los paneles mostrarían datos duplicados.
  await prisma.statisticsAggregated.deleteMany();

  const attempts = await prisma.exerciseAttempt.findMany({
    select: { exercise_id: true, lesson_id: true, paralelo_id: true, alumno_id: true, is_correct: true, score: true, time_spent_ms: true, error_type: true, dificultad: true },
  });

  const group = <K extends string>(keyFn: (a: (typeof attempts)[number]) => K | null) => {
    const m = new Map<K, typeof attempts>();
    for (const a of attempts) {
      const k = keyFn(a);
      if (k == null) continue;
      (m.get(k) ?? m.set(k, []).get(k)!).push(a);
    }
    return m;
  };

  const summarize = (rows: typeof attempts) => {
    const total = rows.length;
    const ok = rows.filter((r) => r.is_correct).length;
    const fail = total - ok;
    const avgScore = total ? rows.reduce((s, r) => s + (r.score ?? 0), 0) / total : 0;
    const avgTimeMs = total ? rows.reduce((s, r) => s + (r.time_spent_ms ?? 0), 0) / total : 0;
    const errorRate = total ? fail / total : 0;
    const timeFactor = Math.min(avgTimeMs / 60000, 1);
    const difficulty = errorRate * 70 + timeFactor * 30;
    const predicted = difficulty >= 55 ? "dificil" : difficulty >= 30 ? "medio" : "facil";
    const commonError = mode(rows.filter((r) => !r.is_correct).map((r) => r.error_type));
    return { total, ok, fail, avgScore, avgTimeMs, commonError, difficulty, predicted: predicted as "facil" | "medio" | "dificil" };
  };

  const byExercise = group((a) => `${a.exercise_id}` as const);
  for (const [k, rows] of byExercise) {
    // paralelo_id también en las filas de ejercicio: sin él el panel del maestro
    // no puede acotar la estadística a sus propios paralelos.
    await upsertStat(
      { stat_type: "exercise", exercise_id: Number(k), lesson_id: rows[0].lesson_id, paralelo_id: rows[0].paralelo_id ?? 0 },
      summarize(rows),
    );
  }

  const byLesson = group((a) => `${a.lesson_id}` as const);
  for (const [k, rows] of byLesson) await upsertStat({ stat_type: "lesson", lesson_id: Number(k), paralelo_id: rows[0].paralelo_id ?? 0 }, summarize(rows));

  const byParalelo = group((a) => (a.paralelo_id ? `${a.paralelo_id}` : null));
  for (const [k, rows] of byParalelo) await upsertStat({ stat_type: "paralelo", paralelo_id: Number(k) }, summarize(rows));

  const byStudent = group((a) => `${a.alumno_id}` as const);
  for (const [k, rows] of byStudent) await upsertStat({ stat_type: "student", alumno_id: Number(k), paralelo_id: rows[0].paralelo_id ?? 0 }, summarize(rows));

  return { exercises: byExercise.size, lessons: byLesson.size, paralelos: byParalelo.size, students: byStudent.size };
}
