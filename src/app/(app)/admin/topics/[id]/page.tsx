import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import { PdfViewer } from "@/components/topic/PdfViewer";
import { requireRole } from "@/lib/session";
import { assertMaestroOwnsContent } from "@/lib/rbac";
import { saveUpload } from "@/lib/uploads";
import { SlideEditor } from "@/components/topic/SlideEditor";
import { emptyCanvas, sanitizeCanvas } from "@/lib/slide-canvas";
import Link from "next/link";

export default async function AdminTopicDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const user = await requireRole(["maestro", "admin"]);
  const { id } = await params;
  const { ok: aviso, error: fallo } = await searchParams;
  const topicId = Number(id);
  const { ok } = await assertMaestroOwnsContent(user.role, user.id, "topic", topicId);
  if (!ok) notFound();
  const topic = await prisma.lessonTopic.findUnique({ where: { id: topicId }, include: { archivo: true, lesson: { select: { title: true } } } });
  if (!topic) notFound();

  const slideRows = await prisma.topicSlide.findMany({ where: { topic_id: topicId }, orderBy: [{ order: "asc" }, { id: "asc" }] });

  async function guard() {
    "use server";
    const u = await requireRole(["maestro", "admin"]);
    const { ok } = await assertMaestroOwnsContent(u.role, u.id, "topic", topicId);
    return ok ? u : null;
  }

  async function updateTopic(formData: FormData) {
    "use server";
    const u = await guard();
    if (!u) return;
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;
    await prisma.lessonTopic.update({
      where: { id: topicId },
      data: { title, order: Number(formData.get("order") ?? 0), content: String(formData.get("content") ?? "") },
    });
    revalidatePath(`/admin/topics/${topicId}`);
    revalidatePath("/admin/topics");
  }

  async function replacePdf(formData: FormData) {
    "use server";
    const u = await guard();
    if (!u) return;
    const pdf = formData.get("pdf");
    if (!(pdf instanceof File) || pdf.size === 0 || pdf.type !== "application/pdf") return;
    const t = await prisma.lessonTopic.findUnique({ where: { id: topicId }, include: { lesson: { select: { paralelo_id: true } } } });
    const saved = await saveUpload("pdf", pdf.name, Buffer.from(await pdf.arrayBuffer()));
    const row = await prisma.archivo.create({
      data: { nombre: pdf.name, ruta: saved.url, mime: "application/pdf", size_bytes: pdf.size, uploaded_by: u.id, paralelo_id: t?.lesson.paralelo_id ?? null },
    });
    await prisma.lessonTopic.update({ where: { id: topicId }, data: { archivo_id: row.id } });
    revalidatePath(`/admin/topics/${topicId}`);
  }

  async function removePdf() {
    "use server";
    const u = await guard();
    if (!u) return;
    await prisma.lessonTopic.update({ where: { id: topicId }, data: { archivo_id: null } });
    revalidatePath(`/admin/topics/${topicId}`);
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Topbar title={`Editar tema #${topic.id}`} subtitle={topic.lesson.title} />
      <Link href="/admin/topics" className="text-sm text-primary hover:underline">← Volver a temas</Link>

      {fallo && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">{fallo}</p>}
      {aviso && <p role="status" className="rounded-lg border border-border bg-primary-soft px-4 py-2 text-sm">{aviso}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Diapositivas ({slideRows.length})</CardTitle>
          <p className="text-sm text-muted-foreground">
            Diseña cada diapositiva como en Canva: agrega textos, imágenes y figuras, arrástralos y cambia su tamaño. Se guarda solo. Si hay diapositivas, el alumno ve la presentación en lugar del texto de abajo.
          </p>
        </CardHeader>
        <CardContent>
          <SlideEditor
            topicId={topic.id}
            initial={slideRows.map((r) => ({
              id: r.id,
              canvas: r.canvas ? sanitizeCanvas(r.canvas) : emptyCanvas(),
              audioId: r.audio_id,
              version: r.updated_at.toISOString(),
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Contenido de texto</CardTitle></CardHeader>
        <CardContent>
          <form action={updateTopic} className="grid gap-3">
            <Input name="title" placeholder="Título" defaultValue={topic.title} required />
            <Input name="order" type="number" placeholder="Orden" defaultValue={topic.order} />
            <textarea
              name="content"
              placeholder="Contenido del tema"
              rows={12}
              defaultValue={topic.content ?? ""}
              className="rounded-md border border-input bg-card px-4 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" variant="gradient">Guardar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Material PDF {topic.archivo && <Badge variant="success">adjunto</Badge>}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {topic.archivo && (
            <>
              <PdfViewer url={topic.archivo.ruta} title={topic.archivo.nombre} />
              <form action={removePdf}><Button size="sm" variant="destructive" type="submit">Quitar PDF</Button></form>
            </>
          )}
          <form action={replacePdf} className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
            <input type="file" name="pdf" accept="application/pdf" required className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/20 file:px-3 file:py-1.5" />
            <Button type="submit" variant="secondary">{topic.archivo ? "Reemplazar" : "Subir"} PDF</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
