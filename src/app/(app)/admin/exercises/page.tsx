import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import { CreateExerciseForm } from "@/components/exercise/CreateExerciseForm";

export default async function AdminExercisesPage({ searchParams }: { searchParams: Promise<{ lesson_id?: string }> }) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const userId = Number((session?.user as any)?.id ?? 0);
  if (!["maestro", "admin"].includes(role)) redirect("/dashboard");
  const isAdmin = role === "admin";
  const sp = await searchParams;
  const lessonId = sp.lesson_id ? Number(sp.lesson_id) : undefined;

  const lessons = await prisma.lesson.findMany({ where: isAdmin ? {} : { maestro_id: userId }, orderBy: { id: "asc" } });
  const ownedLessonIds = lessons.map((l) => l.id);
  const where = lessonId ? { lesson_id: lessonId } : isAdmin ? {} : { lesson_id: { in: ownedLessonIds } };
  const exercises = await prisma.exercise.findMany({ where, orderBy: { id: "asc" }, take: 50 });

  async function createExercise(formData: FormData) {
    "use server";
    const session = await auth();
    const role = (session?.user as any)?.role;
    const userId = Number((session?.user as any)?.id ?? 0);
    const lesson_id = Number(formData.get("lesson_id"));
    const type = String(formData.get("type") ?? "text") as any;
    const question = String(formData.get("question") ?? "");
    const answer = String(formData.get("answer") ?? "") || null;
    const dificultad = String(formData.get("dificultad") ?? "medio") as any;
    if (!lesson_id || !question) return;
    if (role !== "admin") {
      const owns = await prisma.lesson.findFirst({ where: { id: lesson_id, maestro_id: userId } });
      if (!owns) return;
    }
    const exercise = await prisma.exercise.create({ data: { lesson_id, type, question, answer, dificultad, activo: true } });

    if (type === "multiple_choice") {
      const texts = formData.getAll("option_text").map(String);
      const correctIndex = Number(formData.get("correct_index") ?? 0);
      for (let i = 0; i < texts.length; i++) {
        if (!texts[i]) continue;
        await prisma.multipleChoiceOption.create({ data: { exercise_id: exercise.id, option_text: texts[i], is_correct: i === correctIndex } });
      }
    } else if (type === "matching") {
      const aymaraWords = formData.getAll("pair_aymara").map(String);
      const spanishWords = formData.getAll("pair_spanish").map(String);
      for (let i = 0; i < aymaraWords.length; i++) {
        if (!aymaraWords[i] || !spanishWords[i]) continue;
        await prisma.matchingPair.create({ data: { exercise_id: exercise.id, aymara_word: aymaraWords[i], spanish_word: spanishWords[i] } });
      }
    } else if (type === "fill_in_the_blank") {
      const texts = formData.getAll("answer_text").map(String);
      for (const t of texts) {
        if (!t) continue;
        await prisma.fillInTheBlankAnswer.create({ data: { exercise_id: exercise.id, answer_text: t } });
      }
    }

    revalidatePath("/admin/exercises");
  }

  async function toggle(formData: FormData) {
    "use server";
    const session = await auth();
    const role = (session?.user as any)?.role;
    const userId = Number((session?.user as any)?.id ?? 0);
    const id = Number(formData.get("id"));
    const ex = await prisma.exercise.findUnique({ where: { id } });
    if (!ex) return;
    if (role !== "admin") {
      const owns = await prisma.lesson.findFirst({ where: { id: ex.lesson_id, maestro_id: userId } });
      if (!owns) return;
    }
    await prisma.exercise.update({ where: { id }, data: { activo: !ex.activo } });
    revalidatePath("/admin/exercises");
  }

  return (
    <div className="space-y-6">
      <Topbar title="Gestión Ejercicios" subtitle={lessonId ? `Lección ${lessonId}` : "Todos — 4 tipos: text / multiple_choice / matching / fill_in_the_blank"} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Crear ejercicio</CardTitle>
        </CardHeader>
        <CardContent>
          {lessons.length === 0 ? (
            <p className="text-sm text-muted-foreground">Primero crea una lección en "Mis lecciones".</p>
          ) : (
            <CreateExerciseForm lessons={lessons} defaultLessonId={lessonId ?? lessons[0]?.id ?? ""} action={createExercise} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ejercicios ({exercises.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {exercises.map((e) => (
            <div key={e.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium line-clamp-1">{e.question}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <Badge variant="outline">{e.type}</Badge>
                  <Badge variant={e.dificultad === "dificil" ? "destructive" : e.dificultad === "medio" ? "warning" : "secondary"}>{e.dificultad}</Badge>
                  <Badge variant={e.activo ? "success" : "destructive"}>{e.activo ? "activo" : "inactivo"}</Badge>
                  <span className="text-xs text-muted-foreground">Lección {e.lesson_id}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <a href={`/admin/exercises/${e.id}`}>
                  <Button size="sm" variant="outline">
                    Editar
                  </Button>
                </a>
                <a href={`/play/${e.lesson_id}/${e.id}`}>
                  <Button size="sm" variant="outline">
                    Jugar
                  </Button>
                </a>
                <form action={toggle}>
                  <input type="hidden" name="id" value={e.id} />
                  <Button size="sm" variant="secondary" type="submit">
                    Toggle
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
