import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import { ParaleloSwitcher } from "@/components/layout/ParaleloSwitcher";
import { maestroContext } from "@/lib/maestro-page";
import { assertMaestroOwnsContent } from "@/lib/rbac";
import { requireRole } from "@/lib/session";
import { badgeVariantContenido, toggleEstado } from "@/lib/estado";
import Link from "next/link";

export default async function AdminLessonsPage() {
  const { paralelo, opciones } = await maestroContext("/admin/lessons");

  const lessons = paralelo
    ? await prisma.lesson.findMany({
        where: { paralelo_id: paralelo.id },
        orderBy: { orden: "asc" },
        include: { _count: { select: { lesson_exercises: true, topics: true } }, reward_card: true },
      })
    : [];

  async function createLesson(formData: FormData) {
    "use server";
    const user = await requireRole(["maestro", "admin"]);
    const paraleloId = Number(formData.get("paralelo_id"));
    const { assertMaestroOwnsParalelo } = await import("@/lib/rbac");
    if (!(await assertMaestroOwnsParalelo(user.role, user.id, paraleloId))) return;
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;
    const description = String(formData.get("description") ?? "");
    const orden = Number(formData.get("orden") ?? 1);
    const min_correct = Math.max(1, Number(formData.get("min_correct") ?? 1));
    const present_raw = Number(formData.get("present_count") ?? 0);
    const present_count = present_raw > 0 ? present_raw : null;
    const random_selection = formData.get("random_selection") === "on";
    const lesson = await prisma.lesson.create({
      data: {
        paralelo_id: paraleloId,
        title,
        description,
        orden,
        min_correct,
        present_count,
        random_selection,
        created_by: user.id,
        updated_by: user.id,
      },
    });
    await prisma.lessonVersion.create({
      data: { lesson_id: lesson.id, version: 1, tipo_cambio: "menor", resumen: "Versión inicial", created_by: user.id },
    });
    revalidatePath("/admin/lessons");
    revalidatePath("/admin/map-order");
  }

  async function toggleActive(formData: FormData) {
    "use server";
    const user = await requireRole(["maestro", "admin"]);
    const id = Number(formData.get("id"));
    const { ok } = await assertMaestroOwnsContent(user.role, user.id, "lesson", id);
    if (!ok) return;
    const lesson = await prisma.lesson.findUnique({ where: { id } });
    if (!lesson) return;
    await prisma.lesson.update({ where: { id }, data: { estado: toggleEstado(lesson.estado), updated_by: user.id } });
    revalidatePath("/admin/lessons");
  }

  return (
    <div className="space-y-6">
      <Topbar title="Lecciones" subtitle="El contenido pertenece al paralelo, no al profesor." />
      <ParaleloSwitcher actual={paralelo} opciones={opciones} back="/admin/lessons" />

      {paralelo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Crear lección en {paralelo.nombre}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createLesson} className="grid md:grid-cols-2 gap-3">
              <input type="hidden" name="paralelo_id" value={paralelo.id} />
              <Input name="title" placeholder="Título" required className="md:col-span-2" />
              <Input name="description" placeholder="Descripción" className="md:col-span-2" />
              <label className="text-sm space-y-1">
                <span className="text-muted-foreground">Orden</span>
                <Input name="orden" type="number" defaultValue={lessons.length + 1} />
              </label>
              <label className="text-sm space-y-1">
                <span className="text-muted-foreground">Mínimo de ejercicios correctos</span>
                <Input name="min_correct" type="number" defaultValue={5} min={1} />
              </label>
              <label className="text-sm space-y-1">
                <span className="text-muted-foreground">Ejercicios a presentar (0 = todos)</span>
                <Input name="present_count" type="number" defaultValue={0} min={0} />
              </label>
              <label className="flex items-center gap-2 text-sm mt-6">
                <input type="checkbox" name="random_selection" className="rounded" /> Selección aleatoria del subconjunto
              </label>
              <Button type="submit" variant="gradient" className="md:col-span-2">
                Crear
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lecciones ({lessons.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {lessons.length === 0 && <p className="text-sm text-muted-foreground">Sin lecciones en este paralelo.</p>}
          {lessons.map((l) => (
            <div key={l.id} className="flex items-center justify-between glass rounded-xl px-4 py-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>#{l.orden} · {l.title}</span>
                  <Badge variant={badgeVariantContenido(l.estado)}>{l.estado}</Badge>
                  {l.content_epoch > 1 && <Badge variant="outline">v{l.content_epoch}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {l._count.topics} tema(s) · {l._count.lesson_exercises} ejercicio(s) · mínimo {l.min_correct}
                  {l.present_count ? ` · presenta ${l.present_count}${l.random_selection ? " al azar" : ""}` : ""}
                  {l.reward_card ? ` · recompensa: ${l.reward_card.title ?? l.reward_card.card_code}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/lessons/${l.id}`}>
                  <Button size="sm" variant="outline">Editar</Button>
                </Link>
                <form action={toggleActive}>
                  <input type="hidden" name="id" value={l.id} />
                  <Button size="sm" variant="secondary" type="submit">
                    {l.estado === "activo" ? "Desactivar" : "Activar"}
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
