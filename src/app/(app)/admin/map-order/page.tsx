import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ensureContentOrder } from "@/lib/content-order";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/layout/Topbar";
import { ParaleloSwitcher } from "@/components/layout/ParaleloSwitcher";
import { maestroContext } from "@/lib/maestro-page";
import { requireRole } from "@/lib/session";
import { assertMaestroOwnsParalelo } from "@/lib/rbac";
import Link from "next/link";
import { ArrowUp, ArrowDown } from "lucide-react";

export default async function MapOrderPage() {
  const { paralelo, opciones } = await maestroContext("/admin/map-order");

  let rows: { contentOrderId: number; type: "lesson" | "exam"; title: string; isFirst: boolean; isLast: boolean; targetId: number }[] = [];
  if (paralelo) {
    await ensureContentOrder(paralelo.id);
    const ordered = await prisma.contentOrder.findMany({ where: { paralelo_id: paralelo.id }, orderBy: { orden: "asc" } });
    const lessonIds = ordered.filter((o) => o.content_type === "lesson").map((o) => o.content_id);
    const examIds = ordered.filter((o) => o.content_type === "exam").map((o) => o.content_id);
    const [lessons, exams] = await Promise.all([
      prisma.lesson.findMany({ where: { id: { in: lessonIds } }, select: { id: true, title: true } }),
      prisma.exam.findMany({ where: { id: { in: examIds } }, select: { id: true, title: true } }),
    ]);
    const lMap = new Map(lessons.map((l) => [l.id, l.title]));
    const eMap = new Map(exams.map((e) => [e.id, e.title]));
    rows = ordered.map((o, i) => ({
      contentOrderId: o.id,
      type: o.content_type,
      title: o.content_type === "lesson" ? lMap.get(o.content_id) ?? `Lección ${o.content_id}` : eMap.get(o.content_id) ?? `Examen ${o.content_id}`,
      isFirst: i === 0,
      isLast: i === ordered.length - 1,
      targetId: o.content_id,
    }));
  }

  async function move(formData: FormData) {
    "use server";
    const user = await requireRole(["maestro", "admin"]);
    const id = Number(formData.get("id"));
    const direction = String(formData.get("direction"));
    const row = await prisma.contentOrder.findUnique({ where: { id } });
    if (!row) return;
    if (!(await assertMaestroOwnsParalelo(user.role, user.id, row.paralelo_id))) return;
    const neighbor = await prisma.contentOrder.findFirst({
      where: { paralelo_id: row.paralelo_id, orden: direction === "up" ? { lt: row.orden } : { gt: row.orden } },
      orderBy: { orden: direction === "up" ? "desc" : "asc" },
    });
    if (!neighbor) return;
    await prisma.$transaction([
      prisma.contentOrder.update({ where: { id: row.id }, data: { orden: neighbor.orden } }),
      prisma.contentOrder.update({ where: { id: neighbor.id }, data: { orden: row.orden } }),
    ]);
    revalidatePath("/admin/map-order");
  }

  return (
    <div className="space-y-6">
      <Topbar title="Orden del mapa" subtitle="Secuencia de niveles y exámenes que verá el alumno." />
      <ParaleloSwitcher actual={paralelo} opciones={opciones} back="/admin/map-order" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Secuencia ({rows.length})</CardTitle>
          <p className="text-xs text-muted-foreground">
            Sólo las lecciones bloquean el avance. Un examen se desbloquea con sus prerequisitos y su ventana de fechas (se configuran en «Editar» del examen).
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">Sin contenido en este paralelo todavía.</p>}
          {rows.map((r) => (
            <div key={r.contentOrderId} className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <Badge variant={r.type === "exam" ? "warning" : "secondary"}>{r.type}</Badge>
                <span className="text-sm font-medium">{r.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <Link href={r.type === "exam" ? `/admin/exams/${r.targetId}` : `/admin/lessons/${r.targetId}`}>
                  <Button size="sm" variant="outline">Editar</Button>
                </Link>
                <form action={move}>
                  <input type="hidden" name="id" value={r.contentOrderId} />
                  <input type="hidden" name="direction" value="up" />
                  <Button size="sm" variant="ghost" type="submit" disabled={r.isFirst} aria-label="Subir"><ArrowUp className="h-4 w-4" /></Button>
                </form>
                <form action={move}>
                  <input type="hidden" name="id" value={r.contentOrderId} />
                  <input type="hidden" name="direction" value="down" />
                  <Button size="sm" variant="ghost" type="submit" disabled={r.isLast} aria-label="Bajar"><ArrowDown className="h-4 w-4" /></Button>
                </form>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
