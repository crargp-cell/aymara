import { prisma } from "@/lib/prisma";
import { alumnoPuedeRendirExamen } from "@/lib/rbac";
import { grantExamReward } from "@/lib/rewards";
import { evaluateLogros } from "@/lib/logros/evaluate";

export type StartResult =
  | { ok: true; attemptId: number; attemptNo: number }
  | { ok: false; motivo: string };

/** Abre (o recupera) un intento de examen tras validar acceso (Negocio.md §20, §22). */
export async function startOrGetExamAttempt(alumnoId: number, examId: number): Promise<StartResult> {
  const gate = await alumnoPuedeRendirExamen(alumnoId, examId);
  if (!gate.ok) return { ok: false, motivo: gate.motivo ?? "No disponible." };

  const open = await prisma.examAttempt.findFirst({
    where: { exam_id: examId, alumno_id: alumnoId, completed_at: null },
    orderBy: { started_at: "desc" },
  });
  if (open) return { ok: true, attemptId: open.id, attemptNo: open.attempt_no };

  const attemptNo = (await prisma.examAttempt.count({ where: { exam_id: examId, alumno_id: alumnoId } })) + 1;
  const created = await prisma.examAttempt.create({ data: { exam_id: examId, alumno_id: alumnoId, attempt_no: attemptNo } });
  return { ok: true, attemptId: created.id, attemptNo };
}

export type FinishInput = {
  attemptId: number;
  alumnoId: number;
  scorePct: number; // 0..100
  timeSpentMs: number;
  details: { item_ref: string; expected?: string | null; respuesta?: string | null; is_correct: boolean; time_spent_ms?: number }[];
};

export type FinishResult = { passed: boolean; scorePct: number; rewardCardId: number | null; nuevosLogros: string[] };

export async function finishExamAttempt(input: FinishInput): Promise<FinishResult> {
  const attempt = await prisma.examAttempt.findUnique({ where: { id: input.attemptId }, include: { exam: true } });
  if (!attempt || attempt.alumno_id !== input.alumnoId || attempt.completed_at) {
    return { passed: false, scorePct: 0, rewardCardId: null, nuevosLogros: [] };
  }
  const exam = attempt.exam;
  const scorePct = Math.max(0, Math.min(100, Math.round(input.scorePct)));
  const limitMs = (exam.time_limit ?? 0) * 60_000;
  const overTime = limitMs > 0 && input.timeSpentMs > limitMs + 5_000;
  const passed = !overTime && scorePct >= exam.min_score;

  await prisma.$transaction([
    prisma.examAttempt.update({
      where: { id: attempt.id },
      data: { completed_at: new Date(), score: scorePct, passed, time_spent_ms: Math.max(0, input.timeSpentMs) },
    }),
    prisma.examAttemptDetail.createMany({
      data: input.details.map((d) => ({
        exam_attempt_id: attempt.id,
        item_ref: String(d.item_ref).slice(0, 255),
        expected: d.expected?.slice(0, 255) ?? null,
        respuesta: d.respuesta?.slice(0, 255) ?? null,
        is_correct: d.is_correct,
        time_spent_ms: Math.max(0, d.time_spent_ms ?? 0),
      })),
    }),
  ]);

  let rewardCardId: number | null = null;
  let nuevosLogros: string[] = [];
  if (passed) {
    rewardCardId = await grantExamReward(input.alumnoId, exam.id);
    if (rewardCardId) await prisma.examAttempt.update({ where: { id: attempt.id }, data: { ar_card_granted_id: rewardCardId } });
    nuevosLogros = await evaluateLogros(input.alumnoId);
  }
  return { passed, scorePct, rewardCardId, nuevosLogros };
}

/** Nota efectiva del alumno según la política del examen. */
export async function effectiveScore(examId: number, alumnoId: number): Promise<{ score: number; passed: boolean } | null> {
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) return null;
  const attempts = await prisma.examAttempt.findMany({
    where: { exam_id: examId, alumno_id: alumnoId, completed_at: { not: null } },
    orderBy: { completed_at: "asc" },
  });
  if (attempts.length === 0) return null;
  const scores = attempts.map((a) => Number(a.score));
  let score: number;
  switch (exam.attempt_policy) {
    case "first":
      score = scores[0];
      break;
    case "last":
      score = scores[scores.length - 1];
      break;
    case "average":
      score = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
      break;
    default:
      score = Math.max(...scores);
  }
  return { score, passed: score >= exam.min_score };
}
