import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/layout/Topbar";
import Link from "next/link";

export default async function AdminLessonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const userId = Number((session?.user as any)?.id ?? 0);
  if (!["maestro", "admin"].includes(role)) redirect("/dashboard");
  const isAdmin = role === "admin";

  const { id } = await params;
  const lessonId = Number(id);
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) notFound();
  if (!isAdmin && lesson.maestro_id !== userId) notFound();

  const arCards = await prisma.arCard.findMany({ where: { activo: true }, take: 20 });
  const cursos = isAdmin ? await prisma.curso.findMany() : [];

  async function updateLesson(formData: FormData) {
    "use server";
    const session = await auth();
    const role = (session?.user as any)?.role;
    const userId = Number((session?.user as any)?.id ?? 0);
    const current = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!current) return;
    if (role !== "admin" && current.maestro_id !== userId) return;
    const title = String(formData.get("title") ?? "");
    const description = String(formData.get("description") ?? "");
    const orden = Number(formData.get("orden") ?? 1);
    const grants = formData.get("grants_ar_marker") === "on";
    const ar_card_id = formData.get("ar_card_id") ? Number(formData.get("ar_card_id")) : null;
    if (!title) return;
    const data: any = { title, description, orden, grants_ar_marker: grants, ar_card_id };
    if (role === "admin" && formData.get("curso")) data.curso = Number(formData.get("curso"));
    await prisma.lesson.update({ where: { id: lessonId }, data });
    revalidatePath(`/admin/lessons/${lessonId}`);
    revalidatePath("/admin/lessons");
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Topbar title={`Editar lección #${lesson.id}`} subtitle={lesson.title} />
      <Link href="/admin/lessons" className="text-sm text-primary hover:underline">
        ← Volver a lecciones
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateLesson} className="grid md:grid-cols-2 gap-3">
            <Input name="title" placeholder="Título" defaultValue={lesson.title} required className="md:col-span-2" />
            <Input name="description" placeholder="Descripción" defaultValue={lesson.description ?? ""} className="md:col-span-2" />
            {isAdmin && (
              <select name="curso" className="h-10 rounded-xl border border-input glass bg-transparent px-3 text-sm" defaultValue={lesson.curso}>
                {cursos.map((c) => (
                  <option key={c.id_cur} value={c.id_cur}>
                    Curso {c.nombre} (ID {c.id_cur})
                  </option>
                ))}
              </select>
            )}
            <Input name="orden" type="number" placeholder="Orden" defaultValue={lesson.orden} />
            <select name="ar_card_id" className="h-10 rounded-xl border border-input glass bg-transparent px-3 text-sm" defaultValue={lesson.ar_card_id ?? ""}>
              <option value="">Sin tarjeta AR</option>
              {arCards.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.card_code} — {a.title ?? "sin título"}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="grants_ar_marker" defaultChecked={lesson.grants_ar_marker} className="rounded" /> Otorga AR
            </label>
            <Button type="submit" variant="gradient" className="md:col-span-2">
              Guardar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
