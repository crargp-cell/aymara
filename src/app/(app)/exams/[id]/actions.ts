"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function submitWordMatchExam(
  examId: number,
  data: { totalWords: number; correctMatches: number; timeSpent: number }
) {
  const session = await auth();
  const userId = Number((session?.user as any)?.id ?? 0);
  if (!userId) return { passed: false, percentage: 0, arCardId: null as number | null };

  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  const percentage = data.totalWords > 0 ? Math.round((data.correctMatches / data.totalWords) * 100) : 0;
  const timeLimitSec = (exam?.time_limit ?? 0) * 60;
  const overTime = timeLimitSec > 0 && data.timeSpent > timeLimitSec + 5;
  const passed = !overTime && percentage >= (exam?.min_score ?? 70);

  await prisma.examResult.create({
    data: {
      exam_id: examId,
      user_id: userId,
      score: percentage,
      total_words: data.totalWords,
      correct_matches: data.correctMatches,
      time_spent: data.timeSpent,
      passed,
    },
  });
  await prisma.examAttempt.create({ data: { exam_id: examId, user_id: userId, score: percentage, passed, time_spent: data.timeSpent } });

  let arCardId: number | null = null;
  if (passed && exam?.ar_card_id) {
    arCardId = exam.ar_card_id;
    const exists = await prisma.userArCard.findFirst({ where: { user_id: userId, ar_card_id: exam.ar_card_id } });
    if (!exists) await prisma.userArCard.create({ data: { user_id: userId, ar_card_id: exam.ar_card_id, unlocked_by: "exam", source_id: examId } });
  }

  revalidatePath("/exams");
  revalidatePath("/exams/history");
  return { passed, percentage, arCardId };
}
