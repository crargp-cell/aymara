"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { startOrGetExamAttempt, finishExamAttempt } from "@/lib/exams/engine";

type ArPayload = {
  timeSpent: number; // segundos
  results: { requestedCode: string; requestedTitle: string; detectedCode: string | null; correct: boolean; timeMs: number }[];
};

export async function submitArExam(examId: number, data: ArPayload) {
  const user = await requireUser();
  if (user.role !== "estudiante") return { passed: false, percentage: 0, arCardId: null as number | null };

  const start = await startOrGetExamAttempt(user.id, examId);
  if (!start.ok) return { passed: false, percentage: 0, arCardId: null as number | null, motivo: start.motivo };

  const total = data.results.length || 1;
  const correct = data.results.filter((r) => r.correct).length;
  const percentage = Math.round((correct / total) * 100);

  const res = await finishExamAttempt({
    attemptId: start.attemptId,
    alumnoId: user.id,
    scorePct: percentage,
    timeSpentMs: Math.max(0, data.timeSpent) * 1000,
    details: data.results.map((r) => ({
      item_ref: r.requestedTitle,
      expected: r.requestedCode,
      respuesta: r.detectedCode,
      is_correct: r.correct,
      time_spent_ms: r.timeMs,
    })),
  });

  revalidatePath("/exams");
  revalidatePath("/exams/history");
  revalidatePath("/map");
  return { passed: res.passed, percentage: res.scorePct, arCardId: res.rewardCardId };
}
