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

function toLocalInputValue(d: Date | null | undefined) {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AdminExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["maestro", "admin"]);
  const { id } = await params;
  const examId = Number(id);
  const { ok } = await assertMaestroOwnsContent(user.role, user.id, "exam", examId);
  if (!ok) notFound();

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { details: true, prerequisitos: true, ar_cards: { include: { ar_card: true } } },
  });
  if (!exam) notFound();

  const [lessons, arCards] = await Promise.all([
    prisma.lesson.findMany({ where: { paralelo_id: exam.paralelo_id }, orderBy: { orden: "asc" }, select: { id: true, title: true } }),
    prisma.arCard.findMany({ where: { paralelo_id: exam.paralelo_id, estado: "activo" }, select: { id: true, card_code: true, title: true } }),
  ]);
  const catDetail = exam.details.find((d) => d.config_type === "categories");
  const prereqIds = new Set(exam.prerequisitos.map((p) => p.lesson_id));
  const linkedCardIds = new Set(exam.ar_cards.map((c) => c.ar_card_id));

  async function guard() {
    "use server";
    const u = await requireRole(["maestro", "admin"]);
    const { ok } = await assertMaestroOwnsContent(u.role, u.id, "exam", examId);
    return ok ? u : null;
  }

  async function updateExam(formData: FormData) {
    "use server";
    const u = await guard();
    if (!u) return;
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;
    await prisma.exam.update({
      where: { id: examId },
      data: {
        title,
        description: String(formData.get("description") ?? ""),
        time_limit: Number(formData.get("time_limit") ?? 15),
        min_score: Number(formData.get("min_score") ?? 60),
        max_attempts: Number(formData.get("max_attempts") ?? 0) > 0 ? Number(formData.get("max_attempts")) : null,
        attempt_policy: (["best", "last", "first", "average"] as const).includes(String(formData.get("attempt_policy")) as never)
          ? (String(formData.get("attempt_policy")) as "best")
          : "best",
        start_date: formData.get("start_date") ? new Date(String(formData.get("start_date"))) : null,
        end_date: formData.get("end_date") ? new Date(String(formData.get("end_date"))) : null,
        ar_card_id: formData.get("ar_card_id") ? Number(formData.get("ar_card_id")) : null,
        updated_by: u.id,
      },
    });
    const cats = String(formData.get("categories") ?? "");
    if (cats && exam!.type === "conectar_palabras") {
      try {
        JSON.parse(cats);
        await prisma.examDetail.upsert({
          where: { exam_id_config_type: { exam_id: examId, config_type: "categories" } },
          create: { exam_id: examId, config_type: "categories", config_value: cats },
          update: { config_value: cats },
        });
      } catch {
        /* ignore */
      }
    }
    revalidatePath(`/admin/exams/${examId}`);
    revalidatePath("/admin/exams");
    revalidatePath("/map");
  }

  async function togglePrereq(formData: FormData) {
    "use server";
    const u = await guard();
    if (!u) return;
    const lessonId = Number(formData.get("lesson_id"));
    const existing = await prisma.examPrerequisito.findUnique({ where: { exam_id_lesson_id: { exam_id: examId, lesson_id: lessonId } } });
    if (existing) await prisma.examPrerequisito.delete({ where: { id: existing.id } });
    else await prisma.examPrerequisito.create({ data: { exam_id: examId, lesson_id: lessonId } });
    revalidatePath(`/admin/exams/${examId}`);
  }

  async function toggleArCard(formData: FormData) {
    "use server";
    const u = await guard();
    if (!u) return;
    const cardId = Number(formData.get("card_id"));
    const existing = await prisma.examArCard.findUnique({ where: { exam_id_ar_card_id: { exam_id: examId, ar_card_id: cardId } } });
    if (existing) await prisma.examArCard.delete({ where: { id: existing.id } });
    else await prisma.examArCard.create({ data: { exam_id: examId, ar_card_id: cardId } });
    revalidatePath(`/admin/exams/${examId}`);
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Topbar title={`Editar examen #${exam.id}`} subtitle={`${exam.title} · ${exam.type}`} />
      <Link href="/admin/exams" className="text-sm text-primary hover:underline">← Volver a exámenes</Link>

      <Card>
        <CardHeader><CardTitle className="text-base">Datos</CardTitle></CardHeader>
        <CardContent>
          <form action={updateExam} className="grid md:grid-cols-2 gap-3">
            <Input name="title" placeholder="Título" defaultValue={exam.title} required className="md:col-span-2" />
            <Input name="description" placeholder="Descripción" defaultValue={exam.description ?? ""} className="md:col-span-2" />
            <label className="text-sm space-y-1"><span className="text-muted-foreground">Tiempo (min)</span><Input name="time_limit" type="number" defaultValue={exam.time_limit ?? 15} /></label>
            <label className="text-sm space-y-1"><span className="text-muted-foreground">Nota mínima %</span><Input name="min_score" type="number" defaultValue={exam.min_score} /></label>
            <label className="text-sm space-y-1"><span className="text-muted-foreground">Intentos (0 = ∞)</span><Input name="max_attempts" type="number" defaultValue={exam.max_attempts ?? 0} /></label>
            <label className="text-sm space-y-1">
              <span className="text-muted-foreground">Nota que cuenta</span>
              <select name="attempt_policy" defaultValue={exam.attempt_policy} className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm">
                <option value="best">mejor intento</option>
                <option value="last">último intento</option>
                <option value="first">primer intento</option>
                <option value="average">promedio</option>
              </select>
            </label>
            <label className="text-sm space-y-1"><span className="text-muted-foreground">Disponible desde</span><Input name="start_date" type="datetime-local" defaultValue={toLocalInputValue(exam.start_date)} /></label>
            <label className="text-sm space-y-1"><span className="text-muted-foreground">Disponible hasta</span><Input name="end_date" type="datetime-local" defaultValue={toLocalInputValue(exam.end_date)} /></label>
            <label className="text-sm space-y-1 md:col-span-2">
              <span className="text-muted-foreground">Tarjeta AR de recompensa al aprobar</span>
              <select name="ar_card_id" defaultValue={exam.ar_card_id ?? ""} className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm">
                <option value="">Sin recompensa</option>
                {arCards.map((a) => <option key={a.id} value={a.id}>{a.card_code} — {a.title ?? ""}</option>)}
              </select>
            </label>
            {exam.type === "conectar_palabras" && (
              <Input name="categories" placeholder='Categorías JSON' defaultValue={catDetail?.config_value ?? '["Animales","Colores"]'} className="md:col-span-2" />
            )}
            <Button type="submit" variant="gradient" className="md:col-span-2">Guardar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Prerequisitos — lecciones que el alumno debe completar antes</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {lessons.map((l) => (
            <form key={l.id} action={togglePrereq} className="flex items-center justify-between panel rounded-lg px-3 py-1.5 text-sm">
              <span>{l.title}</span>
              <input type="hidden" name="lesson_id" value={l.id} />
              <Button size="sm" variant={prereqIds.has(l.id) ? "secondary" : "outline"} type="submit">
                {prereqIds.has(l.id) ? "Quitar" : "Exigir"}
              </Button>
            </form>
          ))}
        </CardContent>
      </Card>

      {exam.type === "ar_exam" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Tarjetas del examen AR — se piden al azar</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {arCards.length === 0 && <p className="text-sm text-muted-foreground">Crea tarjetas AR en este paralelo primero.</p>}
            {arCards.map((c) => (
              <form key={c.id} action={toggleArCard} className="flex items-center justify-between panel rounded-lg px-3 py-1.5 text-sm">
                <span className="flex items-center gap-2">{c.card_code} — {c.title ?? ""} {linkedCardIds.has(c.id) && <Badge variant="success">en el examen</Badge>}</span>
                <input type="hidden" name="card_id" value={c.id} />
                <Button size="sm" variant={linkedCardIds.has(c.id) ? "secondary" : "outline"} type="submit">{linkedCardIds.has(c.id) ? "Quitar" : "Agregar"}</Button>
              </form>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
