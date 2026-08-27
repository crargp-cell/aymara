import { prisma } from "@/lib/prisma";
import { grantLessonReward } from "@/lib/rewards";
import { evaluateLogros } from "@/lib/logros/evaluate";
import type { LessonAttempt } from "@/generated/prisma/client";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** IDs de ejercicios ACTIVOS enlazados a la lección, en orden. */
export async function lessonExerciseIds(lessonId: number): Promise<number[]> {
  const links = await prisma.lessonExercise.findMany({
    where: { lesson_id: lessonId, estado: "activo", exercise: { estado: "activo" } },
    orderBy: { orden: "asc" },
    select: { exercise_id: true },
  });
  return links.map((l) => l.exercise_id);
}

/**
 * Devuelve el intento de lección ABIERTO y vigente del alumno, o crea uno nuevo
 * fijando el subconjunto de ejercicios presentado (estable dentro del intento).
 */
export async function getOrStartAttempt(alumnoId: number, lessonId: number): Promise<LessonAttempt> {
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });

  const open = await prisma.lessonAttempt.findFirst({
    where: {
      alumno_id: alumnoId,
      lesson_id: lessonId,
      finished_at: null,
      estado: "activo",
      lesson_version: { gte: lesson.min_valid_version },
    },
    orderBy: { started_at: "desc" },
  });
  if (open) return open;

  const allIds = await lessonExerciseIds(lessonId);
  let presented = allIds;
  if (lesson.present_count && lesson.present_count > 0 && lesson.present_count < allIds.length) {
    presented = lesson.random_selection ? shuffle(allIds).slice(0, lesson.present_count) : allIds.slice(0, lesson.present_count);
  }
  const attemptNo = (await prisma.lessonAttempt.count({ where: { alumno_id: alumnoId, lesson_id: lessonId } })) + 1;
  const minRequired = Math.min(lesson.min_correct, presented.length || lesson.min_correct);

  return prisma.lessonAttempt.create({
    data: {
      alumno_id: alumnoId,
      lesson_id: lessonId,
      paralelo_id: lesson.paralelo_id,
      attempt_no: attemptNo,
      presented_exercise_ids: presented,
      presented_count: presented.length,
      min_required: minRequired,
      lesson_version: lesson.content_epoch,
    },
  });
}

export type RecordResult = {
  isCorrect: boolean;
  correctCount: number;
  minRequired: number;
  completed: boolean;
  rewardCardId: number | null;
  nuevosLogros: string[];
  forcedReadingTopicId: number | null;
};

/** Registra un envío de ejercicio dentro del intento abierto y actualiza el estado. */
export async function recordExerciseAttempt(input: {
  alumnoId: number;
  lessonId: number;
  exerciseId: number;
  userAnswer: string;
  isCorrect: boolean;
  errorType: string | null;
  timeSpentMs: number;
  exerciseType: string;
  dificultad: "facil" | "medio" | "dificil";
}): Promise<RecordResult> {
  const { alumnoId, lessonId, exerciseId, userAnswer, isCorrect, errorType, timeSpentMs } = input;
  const attempt = await getOrStartAttempt(alumnoId, lessonId);
  const lesson = await prisma.lesson.findUniqueOrThrow({ where: { id: lessonId } });

  const attemptNumber = (await prisma.exerciseAttempt.count({ where: { alumno_id: alumnoId, exercise_id: exerciseId } })) + 1;

  await prisma.exerciseAttempt.create({
    data: {
      lesson_attempt_id: attempt.id,
      alumno_id: alumnoId,
      exercise_id: exerciseId,
      lesson_id: lessonId,
      paralelo_id: lesson.paralelo_id,
      exercise_type: input.exerciseType as never,
      dificultad: input.dificultad,
      attempt_number: attemptNumber,
      user_answer: userAnswer.slice(0, 2000),
      is_correct: isCorrect,
      score: isCorrect ? 10 : 0,
      time_spent_ms: Math.max(0, Math.min(timeSpentMs, 1000 * 60 * 30)),
      error_type: errorType,
    },
  });

  // Correctos DISTINTOS dentro del subconjunto presentado, para ESTE intento.
  const presented = attempt.presented_exercise_ids.length ? attempt.presented_exercise_ids : await lessonExerciseIds(lessonId);
  const correctRows = await prisma.exerciseAttempt.findMany({
    where: { lesson_attempt_id: attempt.id, is_correct: true, exercise_id: { in: presented } },
    select: { exercise_id: true },
    distinct: ["exercise_id"],
  });
  const correctCount = correctRows.length;
  const minRequired = attempt.min_required || Math.min(lesson.min_correct, presented.length);
  const completed = correctCount >= minRequired && minRequired > 0;

  // Lectura obligatoria tras 3 fallos en el MISMO ejercicio (Negocio.md espíritu de §13).
  let forcedReadingTopicId: number | null = null;
  const fails = await prisma.exerciseAttempt.count({ where: { alumno_id: alumnoId, exercise_id: exerciseId, is_correct: false } });
  if (fails >= 3) {
    const topic = await prisma.lessonTopic.findFirst({ where: { lesson_id: lessonId, estado: "activo" }, orderBy: { order: "asc" } });
    if (topic) {
      forcedReadingTopicId = topic.id;
      const exists = await prisma.topicReading.findFirst({ where: { alumno_id: alumnoId, topic_id: topic.id, forced_by_failures: true } });
      if (!exists) {
        await prisma.topicReading.create({
          data: { alumno_id: alumnoId, topic_id: topic.id, lesson_id: lessonId, forced_by_failures: true, failure_count: fails },
        });
      }
    }
  }

  let rewardCardId: number | null = null;
  let nuevosLogros: string[] = [];

  if (completed) {
    await prisma.lessonAttempt.update({
      where: { id: attempt.id },
      data: { finished_at: new Date(), passed: true, correct_count: correctCount, score: correctCount * 10 },
    });
    // best_flag: sólo el mejor intento por (alumno, lección)
    await prisma.lessonAttempt.updateMany({ where: { alumno_id: alumnoId, lesson_id: lessonId }, data: { best_flag: false } });
    await prisma.lessonAttempt.update({ where: { id: attempt.id }, data: { best_flag: true } });

    await prisma.userProgress.upsert({
      where: { alumno_id_lesson_id: { alumno_id: alumnoId, lesson_id: lessonId } },
      create: {
        alumno_id: alumnoId,
        lesson_id: lessonId,
        lesson_version: attempt.lesson_version,
        current_index: correctCount,
        total_exercises: presented.length,
        best_score: correctCount * 10,
        attempts: attempt.attempt_no,
        completed: true,
        in_progress: false,
      },
      update: {
        lesson_version: attempt.lesson_version,
        current_index: correctCount,
        total_exercises: presented.length,
        best_score: { set: correctCount * 10 },
        attempts: attempt.attempt_no,
        completed: true,
        in_progress: false,
        last_seen_at: new Date(),
      },
    });

    rewardCardId = await grantLessonReward(alumnoId, lessonId);
    nuevosLogros = await evaluateLogros(alumnoId);
  } else {
    await prisma.lessonAttempt.update({ where: { id: attempt.id }, data: { correct_count: correctCount } });
    await prisma.userProgress.upsert({
      where: { alumno_id_lesson_id: { alumno_id: alumnoId, lesson_id: lessonId } },
      create: {
        alumno_id: alumnoId,
        lesson_id: lessonId,
        lesson_version: attempt.lesson_version,
        current_index: correctCount,
        total_exercises: presented.length,
        attempts: attempt.attempt_no,
        in_progress: true,
      },
      update: { current_index: correctCount, total_exercises: presented.length, in_progress: true, last_seen_at: new Date() },
    });
  }

  return { isCorrect, correctCount, minRequired, completed, rewardCardId, nuevosLogros, forcedReadingTopicId };
}
