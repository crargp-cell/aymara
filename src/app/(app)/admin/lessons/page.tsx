import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import Link from "next/link";

export default async function AdminLessonsPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const userId = Number((session?.user as any)?.id ?? 0);
  const myCurso = Number((session?.user as any)?.curso ?? 1);
  if (!["maestro", "admin"].includes(role)) redirect("/dashboard");
  const isAdmin = role === "admin";

  const lessons = await prisma.lesson.findMany({ where: isAdmin ? {} : { maestro_id: userId }, orderBy: [{ curso: "asc" }, { orden: "asc" }] });
  const arCards = await prisma.arCard.findMany({ where: { activo: true }, take: 20 });
  const cursos = await prisma.curso.findMany();

  async function createLesson(formData: FormData) {
    "use server";
    const session = await auth();
    const role = (session?.user as any)?.role;
    const maestro_id = Number((session?.user as any)?.id ?? 1);
    const title = String(formData.get("title") ?? "");
    const description = String(formData.get("description") ?? "");
    const curso = role === "admin" ? Number(formData.get("curso")) : Number((session?.user as any)?.curso ?? 1);
    const orden = Number(formData.get("orden") ?? 1);
    const grants = formData.get("grants_ar_marker") === "on";
    const ar_card_id = formData.get("ar_card_id") ? Number(formData.get("ar_card_id")) : null;
    if (!title) return;
    await prisma.lesson.create({ data: { title, description, curso, orden, grants_ar_marker: grants, ar_card_id, maestro_id, activo: true } });
    revalidatePath("/admin/lessons");
  }

  async function toggleActive(formData: FormData) {
    "use server";
    const session = await auth();
    const role = (session?.user as any)?.role;
    const userId = Number((session?.user as any)?.id ?? 0);
    const id = Number(formData.get("id"));
    const lesson = await prisma.lesson.findUnique({ where: { id } });
    if (!lesson) return;
    if (role !== "admin" && lesson.maestro_id !== userId) return;
    await prisma.lesson.update({ where: { id }, data: { activo: !lesson.activo } });
    revalidatePath("/admin/lessons");
  }

  return (
    <div className="space-y-6">
      <Topbar title="Gestión Lecciones" subtitle={isAdmin ? "Todos los cursos — administrador" : `Tus lecciones — curso ${myCurso}`} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Crear lección</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createLesson} className="grid md:grid-cols-2 gap-3">
            <Input name="title" placeholder="Título" required />
            <Input name="description" placeholder="Descripción" />
            {isAdmin ? (
              <select name="curso" className="h-10 rounded-xl border border-input glass bg-transparent px-3 text-sm" defaultValue={cursos[0]?.id_cur ?? 1}>
                {cursos.map((c) => (
                  <option key={c.id_cur} value={c.id_cur}>
                    Curso {c.nombre} (ID {c.id_cur})
                  </option>
                ))}
              </select>
            ) : (
              <div className="h-10 rounded-xl glass px-3 text-sm flex items-center text-muted-foreground">Se creará en tu curso ({myCurso})</div>
            )}
            <Input name="orden" type="number" placeholder="Orden" defaultValue={1} />
            <select name="ar_card_id" className="h-10 rounded-xl border border-input glass bg-transparent px-3 text-sm">
              <option value="">Sin tarjeta AR</option>
              {arCards.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.card_code} — {a.title ?? "sin título"}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="grants_ar_marker" className="rounded" /> Otorga AR
            </label>
            <Button type="submit" variant="gradient">
              Crear
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lecciones ({lessons.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {lessons.length === 0 && <p className="text-sm text-muted-foreground">Sin lecciones todavía.</p>}
          {lessons.map((l) => (
            <div key={l.id} className="flex items-center justify-between glass rounded-xl px-4 py-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>{l.title}</span>
                  <Badge variant={l.activo ? "success" : "destructive"}>{l.activo ? "activo" : "inactivo"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Curso {l.curso} · Orden {l.orden} · {l.grants_ar_marker ? "AR ✓" : "AR —"} {l.ar_card_id ? `· Card ${l.ar_card_id}` : ""}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/lessons/${l.id}`}>
                  <Button size="sm" variant="outline">
                    Editar
                  </Button>
                </Link>
                <form action={toggleActive}>
                  <input type="hidden" name="id" value={l.id} />
                  <Button size="sm" variant="secondary" type="submit">
                    {l.activo ? "Desactivar" : "Activar"}
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
