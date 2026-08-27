import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExercisePlayer } from "@/components/exercise/ExercisePlayer";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { checkText, checkMatching, checkFillInTheBlank, checkMultipleChoice } from "@/lib/exercise-validation";
import { requireUser } from "@/lib/session";
import { alumnoPuedeVerLeccion } from "@/lib/rbac";
import { getOrStartAttempt, recordExerciseAttempt } from "@/lib/lesson-flow";
import { CheckCircle2, XCircle, Trophy, Sparkles } from "lucide-react";

export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ lessonId: string; exerciseId: string }>;
  searchParams: Promise<{ result?: string; reward?: string; logros?: string; done?: string }>;
}) {
  const { lessonId, exerciseId } = await params;
  const sp = await searchParams;
  const lid = Number(lessonId);
  const eid = Number(exerciseId);
  if (Number.isNaN(lid) || Number.isNaN(eid)) notFound();

  const user = await requireUser();
  const isStaff = user.role !== "estudiante";
  if (!isStaff && !(await alumnoPuedeVerLeccion(user.id, lid))) {
    return <p className="text-sm text-muted-foreground">No tienes acceso a esta lección.</p>;
  }

  const exercise = await prisma.exercise.findUnique({ where: { id: eid } });
  if (!exercise) notFound();
  const link = await prisma.lessonExercise.findFirst({ where: { lesson_id: lid, exercise_id: eid } });
  if (!link) notFound();

  const attempt = isStaff ? null : await getOrStartAttempt(user.id, lid);
  const presented = attempt?.presented_exercise_ids.length
    ? attempt.presented_exercise_ids
    : (await prisma.lessonExercise.findMany({ where: { lesson_id: lid, estado: "activo" }, orderBy: { orden: "asc" }, select: { exercise_id: true } })).map((l) => l.exercise_id);
  const idx = presented.indexOf(eid);
  const nextId = idx >= 0 ? presented[idx + 1] : undefined;

  const failed = isStaff ? 0 : await prisma.exerciseAttempt.count({ where: { alumno_id: user.id, exercise_id: eid, is_correct: false } });
  const forced = failed >= 3;
  const forcedTopic = forced ? await prisma.lessonTopic.findFirst({ where: { lesson_id: lid, estado: "activo" }, orderBy: { order: "asc" } }) : null;

  let options, pairs, answers;
  if (exercise.type === "multiple_choice") options = await prisma.multipleChoiceOption.findMany({ where: { exercise_id: eid } });
  if (exercise.type === "matching") pairs = await prisma.matchingPair.findMany({ where: { exercise_id: eid }, orderBy: [{ orden: "asc" }, { id: "asc" }] });
  if (exercise.type === "fill_in_the_blank") answers = await prisma.fillInTheBlankAnswer.findMany({ where: { exercise_id: eid } });

  async function submitAction(formData: FormData) {
    "use server";
    const u = await requireUser();
    if (u.role !== "estudiante") return;
    if (!(await alumnoPuedeVerLeccion(u.id, lid))) return;

    const type = String(formData.get("type") ?? exercise!.type);
    const raw = String(formData.get("user_answer") ?? "");
    const timeMs = Number(formData.get("time_ms") ?? 0);
    let isCorrect = false;
    let errorType: string | null = null;

    if (type === "text") {
      isCorrect = checkText(raw, exercise!.answer);
      if (!isCorrect) errorType = "concepto_equivocado";
    } else if (type === "multiple_choice") {
      const opts = await prisma.multipleChoiceOption.findMany({ where: { exercise_id: eid }, select: { id: true, is_correct: true } });
      isCorrect = checkMultipleChoice(raw, opts);
      if (!isCorrect) errorType = "seleccion_incorrecta";
    } else if (type === "matching") {
      const ps = await prisma.matchingPair.findMany({ where: { exercise_id: eid }, orderBy: [{ orden: "asc" }, { id: "asc" }] });
      isCorrect = checkMatching(raw, ps);
      if (!isCorrect) errorType = "emparejamiento_incorrecto";
    } else if (type === "fill_in_the_blank") {
      const ans = await prisma.fillInTheBlankAnswer.findMany({ where: { exercise_id: eid } });
      isCorrect = checkFillInTheBlank(raw, ans.map((a) => a.answer_text));
      if (!isCorrect) errorType = "concepto_equivocado";
    }

    const res = await recordExerciseAttempt({
      alumnoId: u.id,
      lessonId: lid,
      exerciseId: eid,
      userAnswer: raw,
      isCorrect,
      errorType,
      timeSpentMs: timeMs,
      exerciseType: type,
      dificultad: exercise!.dificultad,
    });

    const q = new URLSearchParams({ result: isCorrect ? "ok" : "fail" });
    if (res.completed) q.set("done", "1");
    if (res.rewardCardId) q.set("reward", String(res.rewardCardId));
    if (res.nuevosLogros.length) q.set("logros", res.nuevosLogros.join("|"));
    redirect(`/play/${lid}/${eid}?${q.toString()}`);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>{exercise.question}</span>
            <Badge variant="outline">{exercise.type}</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Lección {lid} · Ejercicio {idx >= 0 ? idx + 1 : "?"}/{presented.length} · Dificultad {exercise.dificultad}
          </p>
        </CardHeader>
        <CardContent>
          {sp.done && (
            <div className="mb-4 rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-4 space-y-2">
              <p className="flex items-center gap-2 text-emerald-400 font-medium"><Trophy className="h-5 w-5" /> ¡Lección completada!</p>
              {sp.reward && <p className="flex items-center gap-2 text-sm"><Sparkles className="h-4 w-4 text-amber-300" /> Desbloqueaste una tarjeta AR.</p>}
              {sp.logros && <p className="text-sm">Nuevos logros: {sp.logros.split("|").join(", ")}</p>}
              <Link href={`/lessons/${lid}`}><Button size="sm" variant="gradient">Volver a la lección</Button></Link>
            </div>
          )}
          {sp.result === "ok" && !sp.done && (
            <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-emerald-400 text-sm font-medium"><CheckCircle2 className="h-5 w-5" /> ¡Correcto!</span>
              {nextId ? (
                <Link href={`/play/${lid}/${nextId}`}><Button size="sm" variant="gradient">Siguiente</Button></Link>
              ) : (
                <Link href={`/lessons/${lid}`}><Button size="sm" variant="gradient">Volver a la lección</Button></Link>
              )}
            </div>
          )}
          {sp.result === "fail" && (
            <div className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 p-4 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-red-400 text-sm font-medium"><XCircle className="h-5 w-5" /> Incorrecto — inténtalo de nuevo.</span>
              {nextId && <Link href={`/play/${lid}/${nextId}`}><Button size="sm" variant="outline">Saltar</Button></Link>}
            </div>
          )}
          {forced && forcedTopic && (
            <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
              <p className="text-sm font-medium">Has fallado 3 veces — repasa la teoría</p>
              <Link href={`/topics/${forcedTopic.id}`}><Button size="sm" className="mt-2">Ir a lectura: {forcedTopic.title}</Button></Link>
            </div>
          )}

          <ExercisePlayer exercise={exercise} options={options as never} pairs={pairs as never} answers={answers as never} action={submitAction} />

          <div className="flex gap-2 mt-6">
            <Link href={`/lessons/${lid}`}><Button variant="outline">Volver</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
