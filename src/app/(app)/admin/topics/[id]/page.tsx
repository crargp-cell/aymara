import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/layout/Topbar";
import Link from "next/link";

export default async function AdminTopicDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const userId = Number((session?.user as any)?.id ?? 0);
  if (!["maestro", "admin"].includes(role)) redirect("/dashboard");
  const isAdmin = role === "admin";

  const { id } = await params;
  const topicId = Number(id);
  const topic = await prisma.lessonTopic.findUnique({ where: { id: topicId } });
  if (!topic) notFound();
  const lesson = await prisma.lesson.findUnique({ where: { id: topic.lesson_id } });
  if (!isAdmin && lesson?.maestro_id !== userId) notFound();

  async function updateTopic(formData: FormData) {
    "use server";
    const session = await auth();
    const role = (session?.user as any)?.role;
    const userId = Number((session?.user as any)?.id ?? 0);
    const current = await prisma.lessonTopic.findUnique({ where: { id: topicId } });
    if (!current) return;
    if (role !== "admin") {
      const owns = await prisma.lesson.findFirst({ where: { id: current.lesson_id, maestro_id: userId } });
      if (!owns) return;
    }
    const title = String(formData.get("title") ?? "");
    const order = Number(formData.get("order") ?? 0);
    const content = String(formData.get("content") ?? "");
    if (!title) return;
    await prisma.lessonTopic.update({ where: { id: topicId }, data: { title, order, content } });
    revalidatePath(`/admin/topics/${topicId}`);
    revalidatePath("/admin/topics");
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Topbar title={`Editar tema #${topic.id}`} subtitle={lesson?.title ?? `Lección ${topic.lesson_id}`} />
      <Link href="/admin/topics" className="text-sm text-primary hover:underline">
        ← Volver a temas
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contenido</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateTopic} className="grid gap-3">
            <Input name="title" placeholder="Título" defaultValue={topic.title} required />
            <Input name="order" type="number" placeholder="Orden" defaultValue={topic.order ?? 0} />
            <textarea
              name="content"
              placeholder="Contenido del tema"
              rows={12}
              defaultValue={topic.content ?? ""}
              className="rounded-xl border border-input glass bg-transparent px-4 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" variant="gradient">
              Guardar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
