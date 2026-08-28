import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import { requireRole } from "@/lib/session";
import { assertMaestroOwnsContent } from "@/lib/rbac";
import Link from "next/link";

async function guard(lessonId: number) {
  const user = await requireRole(["maestro", "admin"]);
  const { ok } = await assertMaestroOwnsContent(user.role, user.id, "lesson", lessonId);
  if (!ok) notFound();
  return user;
}

export default async function AdminLessonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lessonId = Number(id);
  const user = await requireRole(["maestro", "admin"]);
  const { ok } = await assertMaestroOwnsContent(user.role, user.id, "lesson", lessonId);
  if (!ok) notFound();

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      versions: { orderBy: { version: "desc" } },
      lesson_exercises: { include: { exercise: true }, orderBy: { orden: "asc" } },
      topics: { orderBy: { order: "asc" } },
    },
  });
  if (!lesson) notFound();

  const arCards = await prisma.arCard.findMany({ where: { paralelo_id: lesson.paralelo_id, estado: "activo" }, take: 50 });
  const linkedIds = new Set(lesson.lesson_exercises.map((le) => le.exercise_id));
  const poolAvailable = await prisma.exercise.findMany({
    where: { paralelo_id: lesson.paralelo_id, estado: "activo", id: { notIn: [...linkedIds] } },
    orderBy: { id: "desc" },
    take: 100,
  });

  async function updateLesson(formData: FormData) {
    "use server";
    const u = await guard(lessonId);
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;
    const tipo = formData.get("tipo_cambio") === "mayor" ? "mayor" : "menor";
    const resumen = String(formData.get("resumen") ?? (tipo === "mayor" ? "Cambio mayor" : "Ajuste menor")).slice(0, 500);
    const current = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!current) return;

    const nextVersion = (await prisma.lessonVersion.count({ where: { lesson_id: lessonId } })) + 1;
    const data = {
      title,
      description: String(formData.get("description") ?? ""),
      orden: Number(formData.get("orden") ?? current.orden),
      min_correct: Math.max(1, Number(formData.get("min_correct") ?? current.min_correct)),
      present_count: Number(formData.get("present_count") ?? 0) > 0 ? Number(formData.get("present_count")) : null,
      random_selection: formData.get("random_selection") === "on",
      grants_ar: formData.get("grants_ar") === "on",
      ar_card_id: formData.get("ar_card_id") ? Number(formData.get("ar_card_id")) : null,
      updated_by: u.id,
      // Un cambio MAYOR sube la época de contenido y caduca los completados previos
      // (Negocio.md §15, §25) sin borrar ningún intento.
      ...(tipo === "mayor" ? { content_epoch: current.content_epoch + 1, min_valid_version: current.content_epoch + 1 } : {}),
    };
    await prisma.lesson.update({ where: { id: lessonId }, data });
    await prisma.lessonVersion.create({
      data: { lesson_id: lessonId, version: nextVersion, tipo_cambio: tipo, resumen, created_by: u.id },
    });
    revalidatePath(`/admin/lessons/${lessonId}`);
    revalidatePath("/admin/lessons");
  }

  async function attachExercise(formData: FormData) {
    "use server";
    await guard(lessonId);
    const exerciseId = Number(formData.get("exercise_id"));
    const ex = await prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!ex || ex.paralelo_id !== lesson!.paralelo_id) return;
    const maxOrden = (await prisma.lessonExercise.aggregate({ where: { lesson_id: lessonId }, _max: { orden: true } }))._max.orden ?? 0;
    await prisma.lessonExercise.upsert({
      where: { lesson_id_exercise_id: { lesson_id: lessonId, exercise_id: exerciseId } },
      create: { lesson_id: lessonId, exercise_id: exerciseId, orden: maxOrden + 1 },
      update: { estado: "activo" },
    });
    revalidatePath(`/admin/lessons/${lessonId}`);
  }

  async function detachExercise(formData: FormData) {
    "use server";
    await guard(lessonId);
    const leId = Number(formData.get("le_id"));
    await prisma.lessonExercise.delete({ where: { id: leId } }).catch(() => {});
    revalidatePath(`/admin/lessons/${lessonId}`);
  }

  async function moveExercise(formData: FormData) {
    "use server";
    await guard(lessonId);
    const leId = Number(formData.get("le_id"));
    const dir = String(formData.get("dir"));
    const rows = await prisma.lessonExercise.findMany({ where: { lesson_id: lessonId }, orderBy: { orden: "asc" } });
    const idx = rows.findIndex((r) => r.id === leId);
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= rows.length) return;
    await prisma.$transaction([
      prisma.lessonExercise.update({ where: { id: rows[idx].id }, data: { orden: rows[swapIdx].orden } }),
      prisma.lessonExercise.update({ where: { id: rows[swapIdx].id }, data: { orden: rows[idx].orden } }),
    ]);
    revalidatePath(`/admin/lessons/${lessonId}`);
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Topbar title={`Editar lección #${lesson.id}`} subtitle={lesson.title} />
      <Link href="/admin/lessons" className="text-sm text-primary hover:underline">← Volver a lecciones</Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos y versión</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateLesson} className="grid md:grid-cols-2 gap-3">
            <Input name="title" placeholder="Título" defaultValue={lesson.title} required className="md:col-span-2" />
            <Input name="description" placeholder="Descripción" defaultValue={lesson.description ?? ""} className="md:col-span-2" />
            <label className="text-sm space-y-1"><span className="text-muted-foreground">Orden</span><Input name="orden" type="number" defaultValue={lesson.orden} /></label>
            <label className="text-sm space-y-1"><span className="text-muted-foreground">Mínimo correctos</span><Input name="min_correct" type="number" min={1} defaultValue={lesson.min_correct} /></label>
            <label className="text-sm space-y-1"><span className="text-muted-foreground">Presentar (0 = todos)</span><Input name="present_count" type="number" min={0} defaultValue={lesson.present_count ?? 0} /></label>
            <label className="flex items-center gap-2 text-sm mt-6"><input type="checkbox" name="random_selection" defaultChecked={lesson.random_selection} className="rounded" /> Selección aleatoria</label>
            <select name="ar_card_id" defaultValue={lesson.ar_card_id ?? ""} className="h-10 rounded-md border border-input bg-card px-3 text-sm">
              <option value="">Sin tarjeta de recompensa</option>
              {arCards.map((a) => <option key={a.id} value={a.id}>{a.card_code} — {a.title ?? "sin título"}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="grants_ar" defaultChecked={lesson.grants_ar} className="rounded" /> Otorga tarjeta al completar</label>

            <div className="md:col-span-2 border-t border-border pt-3 mt-1 space-y-2">
              <p className="text-xs text-muted-foreground">
                Un <b>cambio menor</b> (texto, imagen) conserva el progreso de los alumnos. Un <b>cambio mayor</b> (ejercicios, evaluación) caduca los completados previos y obliga a repetir.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="radio" name="tipo_cambio" value="menor" defaultChecked /> Cambio menor</label>
                <label className="flex items-center gap-2 text-sm"><input type="radio" name="tipo_cambio" value="mayor" /> Cambio mayor</label>
                <Input name="resumen" placeholder="Resumen del cambio" className="flex-1 min-w-[200px]" />
              </div>
            </div>
            <Button type="submit" variant="gradient" className="md:col-span-2">Guardar nueva versión</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Ejercicios de la lección ({lesson.lesson_exercises.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {lesson.lesson_exercises.length === 0 && <p className="text-sm text-muted-foreground">Sin ejercicios enlazados.</p>}
          {lesson.lesson_exercises.map((le, i) => (
            <div key={le.id} className="flex items-center justify-between panel rounded-xl px-4 py-2 text-sm">
              <span className="flex items-center gap-2">
                <Badge variant="outline">{le.exercise.type}</Badge>
                <Badge variant="secondary">{le.exercise.dificultad}</Badge>
                <span className="line-clamp-1">{le.exercise.question}</span>
              </span>
              <span className="flex gap-1">
                <form action={moveExercise}><input type="hidden" name="le_id" value={le.id} /><input type="hidden" name="dir" value="up" /><Button size="sm" variant="ghost" type="submit" disabled={i === 0}>↑</Button></form>
                <form action={moveExercise}><input type="hidden" name="le_id" value={le.id} /><input type="hidden" name="dir" value="down" /><Button size="sm" variant="ghost" type="submit" disabled={i === lesson.lesson_exercises.length - 1}>↓</Button></form>
                <Link href={`/admin/exercises/${le.exercise_id}`}><Button size="sm" variant="outline">Abrir</Button></Link>
                <form action={detachExercise}><input type="hidden" name="le_id" value={le.id} /><Button size="sm" variant="secondary" type="submit">Quitar</Button></form>
              </span>
            </div>
          ))}

          <form action={attachExercise} className="flex gap-2 pt-2 border-t border-border mt-2">
            <select name="exercise_id" className="h-10 flex-1 rounded-md border border-input bg-card px-3 text-sm">
              {poolAvailable.length === 0 && <option value="">— sin ejercicios disponibles en el pool —</option>}
              {poolAvailable.map((e) => <option key={e.id} value={e.id}>[{e.type}/{e.dificultad}] {e.question.slice(0, 70)}</option>)}
            </select>
            <Button type="submit" variant="gradient" disabled={poolAvailable.length === 0}>Enlazar</Button>
          </form>
          <p className="text-xs text-muted-foreground">
            ¿Falta un ejercicio? Créalo en <Link href="/admin/exercises" className="text-primary hover:underline">Ejercicios</Link> — son reutilizables entre lecciones.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Historial de versiones</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {lesson.versions.map((v) => (
            <div key={v.id} className="flex items-center gap-2 panel rounded-lg px-3 py-1.5">
              <Badge variant={v.tipo_cambio === "mayor" ? "warning" : "secondary"}>v{v.version} · {v.tipo_cambio}</Badge>
              <span className="text-muted-foreground">{v.resumen}</span>
              <span className="ml-auto text-xs text-muted-foreground">{v.created_at.toLocaleDateString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
