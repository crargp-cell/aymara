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

export default async function AdminTopicsPage({ searchParams }: { searchParams: Promise<{ lesson_id?: string }> }) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const userId = Number((session?.user as any)?.id ?? 0);
  if (!["maestro", "admin"].includes(role)) redirect("/dashboard");
  const isAdmin = role === "admin";

  const sp = await searchParams;
  const lessonId = sp.lesson_id ? Number(sp.lesson_id) : undefined;

  const lessons = await prisma.lesson.findMany({ where: isAdmin ? {} : { maestro_id: userId }, orderBy: { id: "asc" } });
  const ownedLessonIds = lessons.map((l) => l.id);

  const where = {
    ...(lessonId ? { lesson_id: lessonId } : isAdmin ? {} : { lesson_id: { in: ownedLessonIds } }),
  };
  const topics = await prisma.lessonTopic.findMany({ where, orderBy: [{ lesson_id: "asc" }, { order: "asc" }], take: 50 });

  async function createTopic(formData: FormData) {
    "use server";
    const session = await auth();
    const role = (session?.user as any)?.role;
    const userId = Number((session?.user as any)?.id ?? 0);
    const title = String(formData.get("title") ?? "");
    const lesson_id = Number(formData.get("lesson_id"));
    const order = Number(formData.get("order") ?? 0);
    const content = String(formData.get("content") ?? "");
    if (!title || !lesson_id) return;
    if (role !== "admin") {
      const owns = await prisma.lesson.findFirst({ where: { id: lesson_id, maestro_id: userId } });
      if (!owns) return;
    }
    await prisma.lessonTopic.create({ data: { title, lesson_id, order, content, activo: true } });
    revalidatePath("/admin/topics");
  }

  async function toggleActivo(formData: FormData) {
    "use server";
    const session = await auth();
    const role = (session?.user as any)?.role;
    const userId = Number((session?.user as any)?.id ?? 0);
    const id = Number(formData.get("id"));
    const topic = await prisma.lessonTopic.findUnique({ where: { id } });
    if (!topic) return;
    if (role !== "admin") {
      const owns = await prisma.lesson.findFirst({ where: { id: topic.lesson_id, maestro_id: userId } });
      if (!owns) return;
    }
    await prisma.lessonTopic.update({ where: { id }, data: { activo: !topic.activo } });
    revalidatePath("/admin/topics");
  }

  return (
    <div className="space-y-6">
      <Topbar title="Gestión Temas" subtitle={lessonId ? `Lección ${lessonId}` : isAdmin ? "Todos los temas" : "Tus temas"} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Crear tema</CardTitle>
        </CardHeader>
        <CardContent>
          {lessons.length === 0 ? (
            <p className="text-sm text-muted-foreground">Primero crea una lección en "Mis lecciones".</p>
          ) : (
            <form action={createTopic} className="grid md:grid-cols-2 gap-3">
              <Input name="title" placeholder="Título" required />
              <select name="lesson_id" className="h-10 rounded-xl border border-input glass bg-transparent px-3 text-sm" defaultValue={lessonId ?? lessons[0]?.id ?? ""} required>
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    Lección {l.id}: {l.title.slice(0, 30)}
                  </option>
                ))}
              </select>
              <Input name="order" type="number" placeholder="Orden" defaultValue={0} />
              <textarea name="content" placeholder="Contenido del tema" rows={4} className="md:col-span-2 rounded-xl border border-input glass bg-transparent px-4 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              <Button type="submit" variant="gradient" className="md:col-span-2">
                Crear
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Temas ({topics.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {topics.length === 0 && <p className="text-sm text-muted-foreground">Sin temas todavía.</p>}
          {topics.map((t) => (
            <div key={t.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>{t.title}</span>
                  <Badge variant={t.activo ? "success" : "destructive"}>{t.activo ? "activo" : "inactivo"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Lección {t.lesson_id} · Orden {t.order ?? 0} · {t.content ? `${t.content.length} caracteres` : "sin contenido"}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/topics/${t.id}`}>
                  <Button size="sm" variant="outline">
                    Editar
                  </Button>
                </Link>
                <form action={toggleActivo}>
                  <input type="hidden" name="id" value={t.id} />
                  <Button size="sm" variant="secondary" type="submit">
                    {t.activo ? "Desactivar" : "Activar"}
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
