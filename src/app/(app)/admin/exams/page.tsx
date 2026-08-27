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

export default async function AdminExamsPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const userId = Number((session?.user as any)?.id ?? 0);
  if (!["maestro", "admin"].includes(role)) redirect("/dashboard");
  const isAdmin = role === "admin";
  const exams = await prisma.exam.findMany({ where: isAdmin ? {} : { created_by: userId }, orderBy: { id: "asc" } });
  const arCards = await prisma.arCard.findMany({ take: 10 });

  async function createExam(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "");
    const description = String(formData.get("description") ?? "");
    const type = String(formData.get("type") ?? "conectar_palabras") as any;
    const time_limit = Number(formData.get("time_limit") ?? 5);
    const min_score = Number(formData.get("min_score") ?? 70);
    const end_date = formData.get("end_date") ? new Date(String(formData.get("end_date"))) : new Date(Date.now() + 7 * 86400000);
    const ar_card_id = formData.get("ar_card_id") ? Number(formData.get("ar_card_id")) : null;
    const session = await auth();
    const created_by = Number((session?.user as any)?.id ?? 1);
    if (!title) return;
    const exam = await prisma.exam.create({ data: { title, description, type, time_limit, min_score, end_date, ar_card_id, active: true, created_by } });
    const categories = String(formData.get("categories") ?? '["Animal"]');
    try {
      const parsed = JSON.parse(categories);
      await prisma.examDetail.create({ data: { exam_id: exam.id, config_type: type === "ar_exam" ? "ar_cards" : "categories", config_value: JSON.stringify(parsed) } });
    } catch {}
    revalidatePath("/admin/exams");
  }

  async function toggleActive(formData: FormData) {
    "use server";
    const session = await auth();
    const role = (session?.user as any)?.role;
    const userId = Number((session?.user as any)?.id ?? 0);
    const id = Number(formData.get("id"));
    const exam = await prisma.exam.findUnique({ where: { id } });
    if (!exam) return;
    if (role !== "admin" && exam.created_by !== userId) return;
    await prisma.exam.update({ where: { id }, data: { active: !exam.active } });
    revalidatePath("/admin/exams");
  }

  return (
    <div className="space-y-6">
      <Topbar title="Gestión Exámenes" subtitle="Crear conectar_palabras / ar_exam" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Crear examen</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createExam} className="grid md:grid-cols-2 gap-3">
            <Input name="title" placeholder="Título" required />
            <Input name="description" placeholder="Descripción" />
            <select name="type" className="h-10 rounded-xl border border-input glass bg-transparent px-3 text-sm">
              <option value="conectar_palabras">conectar_palabras</option>
              <option value="ar_exam">ar_exam</option>
            </select>
            <Input name="time_limit" type="number" placeholder="Tiempo (min)" defaultValue={5} />
            <Input name="end_date" type="datetime-local" />
            <Input name="min_score" type="number" placeholder="Min score" defaultValue={70} />
            <select name="ar_card_id" className="h-10 rounded-xl border border-input glass bg-transparent px-3 text-sm">
              <option value="">Sin AR</option>
              {arCards.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.card_code}
                </option>
              ))}
            </select>
            <Input name="categories" placeholder='Categorías JSON ["Animal","Cuerpo"]' defaultValue='["Animal"]' className="md:col-span-2" />
            <Button type="submit" variant="gradient" className="md:col-span-2">
              Crear
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exámenes ({exams.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {exams.map((e) => (
            <div key={e.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>{e.title}</span>
                  <Badge variant="outline">{e.type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Min {e.min_score}% · {e.time_limit}min · {e.active ? "activo" : "inactivo"}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/exams/${e.id}`}>
                  <Button size="sm" variant="outline">
                    Editar
                  </Button>
                </Link>
                <a href={`/exams/${e.id}`}>
                  <Button size="sm" variant="outline">
                    Ver
                  </Button>
                </a>
                <form action={toggleActive}>
                  <input type="hidden" name="id" value={e.id} />
                  <Button size="sm" variant="secondary" type="submit">
                    {e.active ? "Desactivar" : "Activar"}
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
