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
import Link from "next/link";

export default async function AdminExamsPage() {
  const { paralelo, opciones } = await maestroContext("/admin/exams");

  const exams = paralelo
    ? await prisma.exam.findMany({
        where: { paralelo_id: paralelo.id },
        orderBy: { id: "asc" },
        include: { _count: { select: { attempts: true, prerequisitos: true, ar_cards: true } } },
      })
    : [];

  async function createExam(formData: FormData) {
    "use server";
    const user = await requireRole(["maestro", "admin"]);
    const paraleloId = Number(formData.get("paralelo_id"));
    if (!(await assertMaestroOwnsParalelo(user.role, user.id, paraleloId))) return;
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;
    const type = formData.get("type") === "ar_exam" ? "ar_exam" : "conectar_palabras";
    const exam = await prisma.exam.create({
      data: {
        paralelo_id: paraleloId,
        type,
        title,
        description: String(formData.get("description") ?? ""),
        time_limit: Number(formData.get("time_limit") ?? 15),
        min_score: Number(formData.get("min_score") ?? 60),
        max_attempts: Number(formData.get("max_attempts") ?? 0) > 0 ? Number(formData.get("max_attempts")) : null,
        start_date: formData.get("start_date") ? new Date(String(formData.get("start_date"))) : null,
        end_date: formData.get("end_date") ? new Date(String(formData.get("end_date"))) : null,
        created_by: user.id,
        updated_by: user.id,
      },
    });
    if (type === "conectar_palabras") {
      const cats = String(formData.get("categories") ?? '["Animales"]');
      try {
        JSON.parse(cats);
        await prisma.examDetail.create({ data: { exam_id: exam.id, config_type: "categories", config_value: cats } });
      } catch {
        /* ignore */
      }
    }
    revalidatePath("/admin/exams");
    revalidatePath("/admin/map-order");
  }

  async function toggleActive(formData: FormData) {
    "use server";
    const user = await requireRole(["maestro", "admin"]);
    const id = Number(formData.get("id"));
    const { ok } = await assertMaestroOwnsContent(user.role, user.id, "exam", id);
    if (!ok) return;
    const exam = await prisma.exam.findUnique({ where: { id } });
    if (!exam) return;
    await prisma.exam.update({ where: { id }, data: { estado: toggleEstado(exam.estado), updated_by: user.id } });
    revalidatePath("/admin/exams");
  }

  return (
    <div className="space-y-6">
      <Topbar title="Exámenes" subtitle="Evaluaciones académicas del paralelo — conectar palabras y examen AR." />
      <ParaleloSwitcher actual={paralelo} opciones={opciones} back="/admin/exams" />

      {paralelo && (
        <Card>
          <CardHeader><CardTitle className="text-base">Crear examen en {paralelo.nombre}</CardTitle></CardHeader>
          <CardContent>
            <form action={createExam} className="grid md:grid-cols-2 gap-3">
              <input type="hidden" name="paralelo_id" value={paralelo.id} />
              <Input name="title" placeholder="Título" required className="md:col-span-2" />
              <Input name="description" placeholder="Descripción" className="md:col-span-2" />
              <select name="type" className="h-10 rounded-md border border-input bg-card px-3 text-sm">
                <option value="conectar_palabras">Conectar palabras (clasificar por categoría)</option>
                <option value="ar_exam">Examen AR (mostrar tarjeta a la cámara)</option>
              </select>
              <Input name="time_limit" type="number" placeholder="Tiempo (min)" defaultValue={15} />
              <Input name="min_score" type="number" placeholder="Nota mínima %" defaultValue={60} />
              <Input name="max_attempts" type="number" placeholder="Intentos (0 = sin límite)" defaultValue={2} />
              <label className="text-xs text-muted-foreground space-y-1"><span>Disponible desde</span><Input name="start_date" type="datetime-local" /></label>
              <label className="text-xs text-muted-foreground space-y-1"><span>Disponible hasta</span><Input name="end_date" type="datetime-local" /></label>
              <Input name="categories" placeholder='Categorías JSON ["Animales","Colores"]' defaultValue='["Animales","Colores","Familia","Números"]' className="md:col-span-2" />
              <Button type="submit" variant="gradient" className="md:col-span-2">Crear</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Exámenes ({exams.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {exams.length === 0 && <p className="text-sm text-muted-foreground">Sin exámenes en este paralelo.</p>}
          {exams.map((e) => (
            <div key={e.id} className="panel rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>{e.title}</span>
                  <Badge variant="outline">{e.type}</Badge>
                  <Badge variant={badgeVariantContenido(e.estado)}>{e.estado}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  mínimo {e.min_score}% · {e.time_limit ?? "—"} min · {e.max_attempts ?? "∞"} intentos · {e._count.prerequisitos} prerequisito(s) · {e._count.attempts} intento(s) rendidos
                </p>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/exams/${e.id}`}><Button size="sm" variant="outline">Editar</Button></Link>
                <a href={`/exams/${e.id}`}><Button size="sm" variant="outline">Ver</Button></a>
                <form action={toggleActive}><input type="hidden" name="id" value={e.id} /><Button size="sm" variant="secondary" type="submit">{e.estado === "activo" ? "Desactivar" : "Activar"}</Button></form>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
