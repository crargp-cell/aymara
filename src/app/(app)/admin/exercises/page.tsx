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
import { redirect } from "next/navigation";
import { generarDesdeAlfabetoAction } from "./media-actions";

const TIPOS_VALIDOS = new Set<string>(["text", "multiple_choice", "matching", "fill_in_the_blank", "image_guess", "drag_card"]);

export default async function AdminExercisesPage({ searchParams }: { searchParams: Promise<{ tipo?: string; generado?: string; omitidos?: string; error?: string }> }) {
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
    if (!TIPOS_VALIDOS.has(type)) return;
    const question = String(formData.get("question") ?? "").trim();
    if (!question) return;
    const answer = String(formData.get("answer") ?? "") || null;
    const dificultad = String(formData.get("dificultad") ?? "medio") as "facil" | "medio" | "dificil";

    // Las imágenes que llegan del formulario deben ser de este mismo paralelo.
    const idsImagen = [Number(formData.get("image_id")), ...formData.getAll("option_image_id").map(Number)].filter((n) => Number.isInteger(n) && n > 0);
    const validas = new Set(
      idsImagen.length ? (await prisma.exerciseMedia.findMany({ where: { id: { in: idsImagen }, paralelo_id: paraleloId }, select: { id: true } })).map((m) => m.id) : [],
    );
    const imagenValida = (v: FormDataEntryValue | null | undefined) => { const n = Number(v); return validas.has(n) ? n : null; };

    // Opciones de multiple_choice y drag_card (se arman antes de crear nada para poder rechazar).
    const textos = formData.getAll("option_text").map(String);
    const imagenes = formData.getAll("option_image_id");
    const correctIndex = Number(formData.get("correct_index") ?? 0);
    const opciones =
      type === "multiple_choice"
        ? textos.map((t, i) => ({ option_text: t.trim(), image_id: imagenValida(imagenes[i]), is_correct: i === correctIndex })).filter((o) => o.option_text)
        : type === "drag_card"
          ? imagenes.map((v, i) => ({ option_text: null, image_id: imagenValida(v), is_correct: i === correctIndex })).filter((o) => o.image_id)
          : [];
    const respuestas = formData.getAll("answer_text").map((t) => String(t).trim()).filter(Boolean);
    const imagenPrincipal = imagenValida(formData.get("image_id"));
    if (type === "drag_card" && (opciones.length < 2 || !opciones.some((o) => o.is_correct))) return;
    if (type === "image_guess" && (!imagenPrincipal || respuestas.length === 0)) return;
    const intentos = Math.min(8, Math.max(2, Math.round(Number(formData.get("max_intentos")) || 5)));

    const exercise = await prisma.exercise.create({
      data: {
        paralelo_id: paraleloId, type, question, answer, dificultad, created_by: user.id, updated_by: user.id,
        ...(type === "image_guess" ? { image_id: imagenPrincipal, config: { maxIntentos: intentos } } : {}),
      },
    });

    if (type === "multiple_choice" || type === "drag_card") {
      await prisma.multipleChoiceOption.createMany({ data: opciones.map((o) => ({ exercise_id: exercise.id, ...o })) });
    } else if (type === "image_guess") {
      await prisma.fillInTheBlankAnswer.createMany({ data: respuestas.map((t) => ({ exercise_id: exercise.id, answer_text: t })) });
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

  async function generarAlfabeto(formData: FormData) {
    "use server";
    const paraleloId = Number(formData.get("paralelo_id"));
    const lessonId = Number(formData.get("lesson_id")) || null;
    const r = await generarDesdeAlfabetoAction(paraleloId, lessonId);
    revalidatePath("/admin/exercises");
    redirect(r.ok ? `/admin/exercises?generado=${r.creados}&omitidos=${r.omitidos}` : `/admin/exercises?error=${encodeURIComponent(r.error)}`);
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

      {sp.generado && (
        <p role="status" className="rounded-lg border border-border bg-primary-soft px-4 py-2 text-sm">
          Se crearon {sp.generado} ejercicios con imágenes{Number(sp.omitidos) > 0 ? ` (${sp.omitidos} ya existían)` : ""}.
        </p>
      )}
      {sp.error && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">{sp.error}</p>}

      {paralelo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ejercicios con imágenes desde el alfabeto</CardTitle>
            <p className="text-sm text-muted-foreground">
              Crea de una vez un «adivina la imagen» y un «arrastra la tarjeta» por cada lámina del alfabeto aymara (sin el rótulo con la respuesta). Puedes repetirlo: no duplica lo ya creado.
            </p>
          </CardHeader>
          <CardContent>
            <form action={generarAlfabeto} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="paralelo_id" value={paralelo.id} />
              <select name="lesson_id" className="h-10 rounded-md border border-input bg-card px-3 text-sm" defaultValue="">
                <option value="">Sólo al pool (sin enlazar a una lección)</option>
                {lessons.map((l) => <option key={l.id} value={l.id}>Enlazar a: {l.title.slice(0, 40)}</option>)}
              </select>
              <Button type="submit" variant="secondary">Generar ejercicios</Button>
            </form>
          </CardContent>
        </Card>
      )}

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
            <div key={e.id} className="panel rounded-xl px-4 py-3 flex items-center justify-between gap-2">
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
