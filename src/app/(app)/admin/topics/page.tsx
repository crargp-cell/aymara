import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import { ParaleloSwitcher } from "@/components/layout/ParaleloSwitcher";
import { maestroContext } from "@/lib/maestro-page";
import { requireRole } from "@/lib/session";
import { assertMaestroOwnsContent, assertMaestroOwnsParalelo } from "@/lib/rbac";
import { badgeVariantContenido, toggleEstado } from "@/lib/estado";
import { saveUpload } from "@/lib/uploads";
import Link from "next/link";

export default async function AdminTopicsPage() {
  const { paralelo, opciones } = await maestroContext("/admin/topics");

  const [lessons, topics] = paralelo
    ? await Promise.all([
        prisma.lesson.findMany({ where: { paralelo_id: paralelo.id }, orderBy: { orden: "asc" }, select: { id: true, title: true } }),
        prisma.lessonTopic.findMany({
          where: { lesson: { paralelo_id: paralelo.id } },
          orderBy: [{ lesson_id: "asc" }, { order: "asc" }],
          include: { archivo: true, lesson: { select: { title: true } } },
        }),
      ])
    : [[], []];

  async function createTopic(formData: FormData) {
    "use server";
    const user = await requireRole(["maestro", "admin"]);
    const lesson_id = Number(formData.get("lesson_id"));
    const { ok } = await assertMaestroOwnsContent(user.role, user.id, "lesson", lesson_id);
    if (!ok) return;
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;
    const order = Number(formData.get("order") ?? 0);
    const content = String(formData.get("content") ?? "");

    let archivo_id: number | null = null;
    const pdf = formData.get("pdf");
    if (pdf instanceof File && pdf.size > 0 && pdf.type === "application/pdf") {
      const lesson = await prisma.lesson.findUnique({ where: { id: lesson_id }, select: { paralelo_id: true } });
      const saved = await saveUpload("pdf", pdf.name, Buffer.from(await pdf.arrayBuffer()));
      const row = await prisma.archivo.create({
        data: { nombre: pdf.name, ruta: saved.url, mime: "application/pdf", size_bytes: pdf.size, uploaded_by: user.id, paralelo_id: lesson?.paralelo_id ?? null },
      });
      archivo_id = row.id;
    }

    await prisma.lessonTopic.create({ data: { title, lesson_id, order, content, archivo_id } });
    revalidatePath("/admin/topics");
  }

  async function toggleActivo(formData: FormData) {
    "use server";
    const user = await requireRole(["maestro", "admin"]);
    const id = Number(formData.get("id"));
    const { ok } = await assertMaestroOwnsContent(user.role, user.id, "topic", id);
    if (!ok) return;
    const topic = await prisma.lessonTopic.findUnique({ where: { id } });
    if (!topic) return;
    await prisma.lessonTopic.update({ where: { id }, data: { estado: toggleEstado(topic.estado) } });
    revalidatePath("/admin/topics");
  }

  return (
    <div className="space-y-6">
      <Topbar title="Temas y PDF" subtitle="La parte teórica de cada lección — texto y/o material PDF visible dentro de la plataforma." />
      <ParaleloSwitcher actual={paralelo} opciones={opciones} back="/admin/topics" />

      {paralelo && (
        <Card>
          <CardHeader><CardTitle className="text-base">Crear tema</CardTitle></CardHeader>
          <CardContent>
            {lessons.length === 0 ? (
              <p className="text-sm text-muted-foreground">Primero crea una lección en este paralelo.</p>
            ) : (
              <form action={createTopic} className="grid md:grid-cols-2 gap-3">
                <Input name="title" placeholder="Título" required />
                <select name="lesson_id" className="h-10 rounded-md border border-input bg-card px-3 text-sm" defaultValue={lessons[0]?.id ?? ""} required>
                  {lessons.map((l) => <option key={l.id} value={l.id}>{l.title.slice(0, 40)}</option>)}
                </select>
                <Input name="order" type="number" placeholder="Orden" defaultValue={0} />
                <label className="text-sm space-y-1">
                  <span className="text-muted-foreground">Material PDF (opcional)</span>
                  <input type="file" name="pdf" accept="application/pdf" className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/20 file:px-3 file:py-1.5" />
                </label>
                <textarea name="content" placeholder="Contenido del tema (texto)" rows={5} className="md:col-span-2 rounded-md border border-input bg-card px-4 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                <Button type="submit" variant="gradient" className="md:col-span-2">Crear</Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Temas ({topics.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {topics.length === 0 && <p className="text-sm text-muted-foreground">Sin temas todavía.</p>}
          {topics.map((t) => (
            <div key={t.id} className="panel rounded-xl px-4 py-3 flex items-center justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>{t.title}</span>
                  <Badge variant={badgeVariantContenido(t.estado)}>{t.estado}</Badge>
                  {t.archivo && <Badge variant="outline">PDF</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{t.lesson.title} · orden {t.order} · {t.content ? `${t.content.length} caracteres` : "sin texto"}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/topics/${t.id}`}><Button size="sm" variant="outline">Editar</Button></Link>
                <form action={toggleActivo}>
                  <input type="hidden" name="id" value={t.id} />
                  <Button size="sm" variant="secondary" type="submit">{t.estado === "activo" ? "Desactivar" : "Activar"}</Button>
                </form>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
