import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/layout/Topbar";
import Link from "next/link";

function toLocalInputValue(d: Date | null | undefined) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AdminExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const userId = Number((session?.user as any)?.id ?? 0);
  if (!["maestro", "admin"].includes(role)) redirect("/dashboard");
  const isAdmin = role === "admin";

  const { id } = await params;
  const examId = Number(id);
  const exam = await prisma.exam.findUnique({ where: { id: examId } });
  if (!exam) notFound();
  if (!isAdmin && exam.created_by !== userId) notFound();

  const detail = await prisma.examDetail.findFirst({ where: { exam_id: examId } });
  const lessons = await prisma.lesson.findMany({ where: isAdmin ? {} : { maestro_id: userId }, orderBy: { id: "asc" } });
  const arCards = await prisma.arCard.findMany({ where: { activo: true }, take: 20 });

  async function updateExam(formData: FormData) {
    "use server";
    const session = await auth();
    const role = (session?.user as any)?.role;
    const userId = Number((session?.user as any)?.id ?? 0);
    const current = await prisma.exam.findUnique({ where: { id: examId } });
    if (!current) return;
    if (role !== "admin" && current.created_by !== userId) return;

    const title = String(formData.get("title") ?? "");
    const description = String(formData.get("description") ?? "");
    const time_limit = Number(formData.get("time_limit") ?? 5);
    const min_score = Number(formData.get("min_score") ?? 70);
    const end_date = formData.get("end_date") ? new Date(String(formData.get("end_date"))) : current.end_date;
    const start_date = formData.get("start_date") ? new Date(String(formData.get("start_date"))) : null;
    const ar_card_id = formData.get("ar_card_id") ? Number(formData.get("ar_card_id")) : null;
    const lesson_id = formData.get("lesson_id") ? Number(formData.get("lesson_id")) : null;
    if (!title) return;

    await prisma.exam.update({ where: { id: examId }, data: { title, description, time_limit, min_score, end_date, start_date, ar_card_id, lesson_id } });

    const categories = String(formData.get("categories") ?? "");
    if (categories) {
      try {
        const parsed = JSON.parse(categories);
        await prisma.examDetail.upsert({
          where: { exam_id_config_type: { exam_id: examId, config_type: current.type === "ar_exam" ? "ar_cards" : "categories" } },
          create: { exam_id: examId, config_type: current.type === "ar_exam" ? "ar_cards" : "categories", config_value: JSON.stringify(parsed) },
          update: { config_value: JSON.stringify(parsed) },
        });
      } catch {}
    }

    revalidatePath(`/admin/exams/${examId}`);
    revalidatePath("/admin/exams");
    revalidatePath("/admin/map-order");
    revalidatePath("/map");
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Topbar title={`Editar examen #${exam.id}`} subtitle={exam.title} />
      <Link href="/admin/exams" className="text-sm text-primary hover:underline">
        ← Volver a exámenes
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateExam} className="grid md:grid-cols-2 gap-3">
            <Input name="title" placeholder="Título" defaultValue={exam.title} required className="md:col-span-2" />
            <Input name="description" placeholder="Descripción" defaultValue={exam.description ?? ""} className="md:col-span-2" />
            <Input name="time_limit" type="number" placeholder="Tiempo (min)" defaultValue={exam.time_limit ?? 5} />
            <Input name="min_score" type="number" placeholder="Min score" defaultValue={exam.min_score ?? 70} />

            <label className="text-xs text-muted-foreground space-y-1">
              <span>Requisito — lección previa (opcional)</span>
              <select name="lesson_id" className="h-10 w-full rounded-xl border border-input glass bg-transparent px-3 text-sm" defaultValue={exam.lesson_id ?? ""}>
                <option value="">Sin requisito (orden secuencial normal)</option>
                {lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    Lección {l.id}: {l.title.slice(0, 30)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground space-y-1">
              <span>Tarjeta AR al aprobar</span>
              <select name="ar_card_id" className="h-10 w-full rounded-xl border border-input glass bg-transparent px-3 text-sm" defaultValue={exam.ar_card_id ?? ""}>
                <option value="">Sin AR</option>
                {arCards.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.card_code} — {a.title ?? "sin título"}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs text-muted-foreground space-y-1">
              <span>Disponible desde (opcional)</span>
              <Input name="start_date" type="datetime-local" defaultValue={toLocalInputValue(exam.start_date)} />
            </label>
            <label className="text-xs text-muted-foreground space-y-1">
              <span>Disponible hasta — después desaparece del mapa</span>
              <Input name="end_date" type="datetime-local" defaultValue={toLocalInputValue(exam.end_date)} required />
            </label>

            {exam.type === "conectar_palabras" && (
              <Input
                name="categories"
                placeholder='Categorías JSON ["Animal","Cuerpo"]'
                defaultValue={detail?.config_value ?? ""}
                className="md:col-span-2"
              />
            )}

            <Button type="submit" variant="gradient" className="md:col-span-2">
              Guardar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
