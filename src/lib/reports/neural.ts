import { prisma } from "@/lib/prisma";

/**
 * Heurística simple (NO una red neuronal real) para estimar dificultad por ejercicio:
 * combina tasa de error y tiempo promedio de los intentos registrados en `exercise_attempts`.
 * Reemplaza el campo `predicted_difficulty` de `statistics_aggregated`, que hasta ahora
 * solo se leía pero nunca se calculaba en esta app.
 */

function mode(values: string[]): string | null {
  if (!values.length) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | null = null;
  let bestCount = 0;
  for (const [k, v] of counts) {
    if (v > bestCount) {
      best = k;
      bestCount = v;
    }
  }
  return best;
}

export async function recalcExerciseDifficulty() {
  const grouped = await prisma.exerciseAttempt.groupBy({
    by: ["exercise_id", "lesson_id"],
    _count: { _all: true },
  });

  let updated = 0;
  for (const g of grouped) {
    const attempts = await prisma.exerciseAttempt.findMany({
      where: { exercise_id: g.exercise_id, lesson_id: g.lesson_id },
    });
    const total = attempts.length;
    if (!total) continue;
    const successful = attempts.filter((a) => a.is_correct).length;
    const failed = total - successful;
    const avgScore = attempts.reduce((s, a) => s + (a.score ?? 0), 0) / total;
    const avgTime = attempts.reduce((s, a) => s + (a.time_spent ?? 0), 0) / total;
    const errorRate = failed / total;
    const timeFactor = Math.min(avgTime / 60, 1);
    const difficultyScore = Math.round((errorRate * 70 + timeFactor * 30) * 100) / 100;
    const neuralScore = Math.round((100 - avgScore) * 0.5 + difficultyScore * 0.5);
    const predicted_difficulty = difficultyScore >= 60 ? "dificil" : difficultyScore >= 30 ? "medio" : "facil";
    const mostCommonError = mode(attempts.filter((a) => !a.is_correct && a.error_type).map((a) => a.error_type as string));

    const existing = await prisma.statisticsAggregated.findFirst({
      where: { exercise_id: g.exercise_id, lesson_id: g.lesson_id, user_id: null, curso_id: null, stat_type: "exercise" },
    });

    const data = {
      total_attempts: total,
      successful_attempts: successful,
      failed_attempts: failed,
      average_score: avgScore,
      average_time: avgTime,
      most_common_error: mostCommonError,
      difficulty_score: difficultyScore,
      neural_network_score: neuralScore,
      predicted_difficulty: predicted_difficulty as "facil" | "medio" | "dificil",
      last_calculated: new Date(),
    };

    if (existing) {
      await prisma.statisticsAggregated.update({ where: { id: existing.id }, data });
    } else {
      await prisma.statisticsAggregated.create({
        data: { exercise_id: g.exercise_id, lesson_id: g.lesson_id, stat_type: "exercise", ...data },
      });
    }
    updated++;
  }
  return updated;
}
