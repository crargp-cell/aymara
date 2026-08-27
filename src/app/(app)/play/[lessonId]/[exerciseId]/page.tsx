import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExercisePlayer } from "@/components/exercise/ExercisePlayer";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { checkText, checkMatching, checkFillInTheBlank } from "@/lib/exercise-validation";
import { CheckCircle2, XCircle } from "lucide-react";

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ lessonId: string; exerciseId: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const { lessonId, exerciseId } = await params;
  const { result } = await searchParams;
  const lid = Number(lessonId);
  const eid = Number(exerciseId);
  if (Number.isNaN(lid) || Number.isNaN(eid)) notFound();
  const exercise = await prisma.exercise.findUnique({ where: { id: eid } });
  if (!exercise || exercise.lesson_id !== lid) notFound();

  const session = await auth();
  const userId = Number((session?.user as any)?.id ?? 0);

  const failed = await prisma.exerciseAttempt.count({ where: { user_id: userId, exercise_id: eid, is_correct: false } });
  const forced = failed >= 3;

  const lessonExercises = await prisma.exercise.findMany({ where: { lesson_id: lid, activo: true }, orderBy: { id: "asc" } });
  const currentIndex = lessonExercises.findIndex((e) => e.id === eid);
  const nextExercise = currentIndex >= 0 ? lessonExercises[currentIndex + 1] : undefined;

  let options, pairs, answers;
  if (exercise.type === "multiple_choice") options = await prisma.multipleChoiceOption.findMany({ where: { exercise_id: eid } });
  if (exercise.type === "matching") pairs = await prisma.matchingPair.findMany({ where: { exercise_id: eid }, orderBy: { id: "asc" } });
  if (exercise.type === "fill_in_the_blank") answers = await prisma.fillInTheBlankAnswer.findMany({ where: { exercise_id: eid } });

  const topic = forced ? await prisma.lessonTopic.findFirst({ where: { lesson_id: lid, activo: true }, orderBy: { order: "asc" } }) : null;

  async function submitAction(formData: FormData) {
    "use server";
    const session = await auth();
    const userId = Number((session?.user as any)?.id);
    if (!userId) return;
    const type = String(formData.get("type") ?? exercise!.type);
    const raw = String(formData.get("user_answer") ?? formData.get("fill_0") ?? "");
    let is_correct = false;
    let correct_answer = exercise!.answer ?? "";
    let error_type: string | null = null;

    if (type === "text") {
      is_correct = checkText(raw, exercise!.answer);
      correct_answer = exercise!.answer ?? "";
      if (!is_correct) error_type = "concepto_equivocado";
    } else if (type === "multiple_choice") {
      const optId = Number(raw);
      const opt = await prisma.multipleChoiceOption.findUnique({ where: { id: optId } });
      is_correct = !!opt?.is_correct;
      correct_answer = (await prisma.multipleChoiceOption.findFirst({ where: { exercise_id: eid, is_correct: true } }))?.option_text ?? "";
      if (!is_correct) error_type = "seleccion_incorrecta";
    } else if (type === "matching") {
      const pairs = await prisma.matchingPair.findMany({ where: { exercise_id: eid }, orderBy: { id: "asc" } });
      is_correct = checkMatching(raw, pairs);
      if (!is_correct) error_type = "emparejamiento_incorrecto";
      correct_answer = "Emparejamiento";
    } else if (type === "fill_in_the_blank") {
      const answers = await prisma.fillInTheBlankAnswer.findMany({ where: { exercise_id: eid } });
      is_correct = checkFillInTheBlank(raw, answers.map((a) => a.answer_text));
      correct_answer = answers.map((a) => a.answer_text).join(", ");
      if (!is_correct) error_type = "concepto_equivocado";
    }

    const attemptNo = (await prisma.exerciseAttempt.count({ where: { user_id: userId, exercise_id: eid } })) + 1;
    await prisma.exerciseAttempt.create({
      data: {
        user_id: userId,
        exercise_id: eid,
        lesson_id: lid,
        attempt_number: attemptNo,
        user_answer: raw.slice(0, 500),
        correct_answer: correct_answer.slice(0, 500),
        is_correct,
        score: is_correct ? 10 : 0,
        time_spent: 0,
        error_type,
        exercise_type: type,
      },
    });

    // progressive stats simplified
    const total = await prisma.exerciseAttempt.count({ where: { exercise_id: eid } });
    const success = await prisma.exerciseAttempt.count({ where: { exercise_id: eid, is_correct: true } });
    await prisma.statisticsAggregated.upsert({
      where: { user_id_exercise_id_lesson_id_curso_id_stat_type: { user_id: userId, exercise_id: eid, lesson_id: lid, curso_id: 0, stat_type: "exercise" } } as any,
      create: {
        user_id: userId,
        exercise_id: eid,
        lesson_id: lid,
        curso_id: 0,
        stat_type: "exercise",
        total_attempts: total,
        successful_attempts: success,
        failed_attempts: total - success,
        average_score: is_correct ? 10 : 0,
      },
      update: { total_attempts: total, successful_attempts: success, failed_attempts: total - success },
    });

    // Progreso real de la lección: se marca completada cuando el alumno acertó
    // (al menos una vez) todos los ejercicios activos de la lección.
    const activeExercises = await prisma.exercise.findMany({ where: { lesson_id: lid, activo: true }, select: { id: true } });
    const totalExercises = activeExercises.length;
    const distinctCorrect = await prisma.exerciseAttempt.findMany({
      where: { user_id: userId, lesson_id: lid, is_correct: true, exercise_id: { in: activeExercises.map((e) => e.id) } },
      select: { exercise_id: true },
      distinct: ["exercise_id"],
    });
    const lessonCompleted = totalExercises > 0 && distinctCorrect.length >= totalExercises;
    const todayDate = new Date();
    todayDate.setUTCHours(0, 0, 0, 0);
    await prisma.userProgress.upsert({
      where: { user_id_lesson_id_date: { user_id: userId, lesson_id: lid, date: todayDate } },
      create: {
        user_id: userId,
        lesson_id: lid,
        date: todayDate,
        current_index: distinctCorrect.length,
        total_exercises: totalExercises,
        in_progress: !lessonCompleted,
        completed: lessonCompleted,
        score: is_correct ? 10 : 0,
      },
      update: {
        current_index: distinctCorrect.length,
        total_exercises: totalExercises,
        in_progress: !lessonCompleted,
        completed: lessonCompleted,
        last_seen_at: new Date(),
      },
    });

    // check 3 fails → force reading
    const fails = await prisma.exerciseAttempt.count({ where: { user_id: userId, exercise_id: eid, is_correct: false } });
    if (fails >= 3) {
      const t = await prisma.lessonTopic.findFirst({ where: { lesson_id: lid } });
      if (t) {
        const exists = await prisma.topicReading.findFirst({ where: { user_id: userId, topic_id: t.id } });
        if (!exists) await prisma.topicReading.create({ data: { user_id: userId, topic_id: t.id, lesson_id: lid, forced_by_failures: true, failure_count: fails } });
      }
    }
    redirect(`/play/${lid}/${eid}?result=${is_correct ? "ok" : "fail"}`);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>{exercise.question}</span>
            <Badge variant="outline">{exercise.type}</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">Lección {lid} · Ejercicio {eid} · Dificultad {exercise.dificultad}</p>
        </CardHeader>
        <CardContent>
          {result === "ok" && (
            <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">¡Correcto!</span>
              </div>
              {nextExercise ? (
                <Link href={`/play/${lid}/${nextExercise.id}`}>
                  <Button size="sm" variant="gradient">
                    Siguiente ejercicio
                  </Button>
                </Link>
              ) : (
                <Link href={`/lessons/${lid}`}>
                  <Button size="sm" variant="gradient">
                    ¡Lección completada! Volver
                  </Button>
                </Link>
              )}
            </div>
          )}
          {result === "fail" && (
            <div className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-4 flex items-center gap-2 text-red-400">
              <XCircle className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">Incorrecto — intenta de nuevo.</span>
            </div>
          )}
          {forced && topic && (
            <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
              <p className="text-sm font-medium">Has fallado 3 veces — lectura obligatoria</p>
              <p className="text-xs text-muted-foreground">Debes revisar: {topic.title}</p>
              <Link href={`/topics/${topic.id}`}>
                <Button size="sm" className="mt-2">
                  Ir a lectura
                </Button>
              </Link>
            </div>
          )}
          <ExercisePlayer exercise={exercise as any} options={options as any} pairs={pairs as any} answers={answers as any} action={submitAction} />
          <div className="flex gap-2 mt-6">
            <Link href={`/lessons/${lid}`}>
              <Button variant="outline">Volver</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
