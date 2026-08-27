import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import { ParaleloSwitcher } from "@/components/layout/ParaleloSwitcher";
import { CreateExerciseForm } from "@/components/exercise/CreateExerciseForm";
import { maestroContext } from "@/lib/maestro-page";
import { requireRole } from "@/lib/session";
import { assertMaestroOwnsContent, assertMaestroOwnsParalelo } from "@/lib/rbac";
import { badgeVariantContenido, toggleEstado } from "@/lib/estado";
import type { ExercisesTypeEnum } from "@/generated/prisma/enums";

export default async function AdminExercisesPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { paralelo, opciones } = await maestroContext("/admin/exercises");
  const sp = await searchParams;

  const [lessons, exercises] = paralelo
    ? await Promise.all([
        prisma.lesson.findMany({ where: { paralelo_id: paralelo.id }, orderBy: { orden: "asc" }, select: { id: true, title: true } }),
        prisma.exercise.findMany({
          where: { paralelo_id: paralelo.id, ...(sp.tipo ? { type: sp.tipo as ExercisesTypeEnum } : {}) },
          orderBy: { id: "desc" },
          take: 100,
          include: { _count: { select: { lesson_links: true, attempts: true } } },
        }),
      ])
    : [[], []];

  async function createExercise(formData: FormData) {
    "use server";
    const user = await requireRole(["maestro", "admin"]);
    const paraleloId = Number(formData.get("paralelo_id"));
    if (!(await assertMaestroOwnsParalelo(user.role, user.id, paraleloId))) return;
    const type = String(formData.get("type") ?? "text") as ExercisesTypeEnum;
    const question = String(formData.get("question") ?? "").trim();
    if (!question) return;
    const answer = String(formData.get("answer") ?? "") || null;
    const dificultad = String(formData.get("dificultad") ?? "medio") as "facil" | "medio" | "dificil";

    const exercise = await prisma.exercise.create({
      data: { paralelo_id: paraleloId, type, question, answer, dificultad, created_by: user.id, updated_by: user.id },
    });

    if (type === "multiple_choice") {
      const texts = formData.getAll("option_text").map(String);
      const correctIndex = Number(formData.get("correct_index") ?? 0);
      await prisma.multipleChoiceOption.createMany({
        data: texts.filter(Boolean).map((t, i) => ({ exercise_id: exercise.id, option_text: t, is_correct: i === correctIndex })),
      });
    } else if (type === "matching") {
      const a = formData.getAll("pair_aymara").map(String);
      const s = formData.getAll("pair_spanish").map(String);
      await prisma.matchingPair.createMany({
        data: a.map((aw, i) => ({ exercise_id: exercise.id, aymara_word: aw, spanish_word: s[i] ?? "", orden: i })).filter((p) => p.aymara_word && p.spanish_word),
      });
    } else if (type === "fill_in_the_blank") {
      await prisma.fillInTheBlankAnswer.createMany({
        data: formData.getAll("answer_text").map(String).filter(Boolean).map((t) => ({ exercise_id: exercise.id, answer_text: t })),
      });
    }

    const attachLessonId = Number(formData.get("attach_lesson_id") ?? 0);
    if (attachLessonId) {
      const lesson = await prisma.lesson.findUnique({ where: { id: attachLessonId }, select: { paralelo_id: true } });
      if (lesson?.paralelo_id === paraleloId) {
        const maxOrden = (await prisma.lessonExercise.aggregate({ where: { lesson_id: attachLessonId }, _max: { orden: true } }))._max.orden ?? 0;
        await prisma.lessonExercise.create({ data: { lesson_id: attachLessonId, exercise_id: exercise.id, orden: maxOrden + 1 } });
      }
    }
    revalidatePath("/admin/exercises");
  }

  async function toggle(formData: FormData) {
    "use server";
    const user = await requireRole(["maestro", "admin"]);
    const id = Number(formData.get("id"));
    const { ok } = await assertMaestroOwnsContent(user.role, user.id, "exercise", id);
    if (!ok) return;
    const ex = await prisma.exercise.findUnique({ where: { id } });
    if (!ex) return;
    await prisma.exercise.update({ where: { id }, data: { estado: toggleEstado(ex.estado), updated_by: user.id } });
    revalidatePath("/admin/exercises");
  }

  return (
    <div className="space-y-6">
      <Topbar title="Ejercicios" subtitle="Pool reutilizable del paralelo — un ejercicio puede enlazarse a varias lecciones." />
      <ParaleloSwitcher actual={paralelo} opciones={opciones} back="/admin/exercises" />

      {paralelo && (
        <Card>
          <CardHeader><CardTitle className="text-base">Crear ejercicio en {paralelo.nombre}</CardTitle></CardHeader>
          <CardContent>
            <CreateExerciseForm lessons={lessons} defaultLessonId={""} action={createExercise} paraleloId={paralelo.id} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Ejercicios ({exercises.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {exercises.length === 0 && <p className="text-sm text-muted-foreground">Sin ejercicios en el pool de este paralelo.</p>}
          {exercises.map((e) => (
            <div key={e.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium line-clamp-1">{e.question}</p>
                <div className="flex gap-2 mt-1 flex-wrap items-center">
                  <Badge variant="outline">{e.type}</Badge>
                  <Badge variant={e.dificultad === "dificil" ? "destructive" : e.dificultad === "medio" ? "warning" : "secondary"}>{e.dificultad}</Badge>
                  <Badge variant={badgeVariantContenido(e.estado)}>{e.estado}</Badge>
                  <span className="text-xs text-muted-foreground">{e._count.lesson_links} lección(es) · {e._count.attempts} intento(s)</span>
                </div>
              </div>
              <div className="flex gap-2">
                <a href={`/admin/exercises/${e.id}`}><Button size="sm" variant="outline">Editar</Button></a>
                <form action={toggle}><input type="hidden" name="id" value={e.id} /><Button size="sm" variant="secondary" type="submit">{e.estado === "activo" ? "Desactivar" : "Activar"}</Button></form>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
