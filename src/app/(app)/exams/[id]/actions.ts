"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { startOrGetExamAttempt, finishExamAttempt } from "@/lib/exams/engine";

type WordMatchPayload = {
  totalWords: number;
  correctMatches: number;
  timeSpent: number; // segundos
  details: { ref: string; expected: string; respuesta: string | null; correct: boolean }[];
};

export async function submitWordMatchExam(examId: number, data: WordMatchPayload) {
  const user = await requireUser();
  if (user.role !== "estudiante") return { passed: false, percentage: 0, arCardId: null as number | null };

  const start = await startOrGetExamAttempt(user.id, examId);
  if (!start.ok) return { passed: false, percentage: 0, arCardId: null as number | null, motivo: start.motivo };

  const percentage = data.totalWords > 0 ? Math.round((data.correctMatches / data.totalWords) * 100) : 0;

  const res = await finishExamAttempt({
    attemptId: start.attemptId,
    alumnoId: user.id,
    scorePct: percentage,
    timeSpentMs: Math.max(0, data.timeSpent) * 1000,
    details: data.details.map((d) => ({
      item_ref: d.ref,
      expected: d.expected,
      respuesta: d.respuesta,
      is_correct: d.correct,
    })),
  });

  revalidatePath("/exams");
  revalidatePath("/exams/history");
  revalidatePath("/map");
  return { passed: res.passed, percentage: res.scorePct, arCardId: res.rewardCardId };
}
