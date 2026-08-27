import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ensureContentOrder } from "@/lib/content-order";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/layout/Topbar";
import Link from "next/link";
import { ArrowUp, ArrowDown } from "lucide-react";

export default async function MapOrderPage({ searchParams }: { searchParams: Promise<{ curso?: string }> }) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const myCurso = Number((session?.user as any)?.curso ?? 1);
  if (!["maestro", "admin"].includes(role)) redirect("/dashboard");
  const isAdmin = role === "admin";

  const sp = await searchParams;
  const curso = isAdmin && sp.curso ? Number(sp.curso) : myCurso;
  const cursos = isAdmin ? await prisma.curso.findMany({ orderBy: { id_cur: "asc" } }) : [];

  await ensureContentOrder(curso);
  const ordered = await prisma.contentOrder.findMany({ where: { curso_id: curso }, orderBy: { orden: "asc" } });

  const rows = await Promise.all(
    ordered.map(async (o, i) => {
      if (o.content_type === "lesson") {
        const l = await prisma.lesson.findUnique({ where: { id: o.content_id } });
        return { contentOrderId: o.id, orden: o.orden, type: "lesson" as const, title: l?.title ?? `Lección ${o.content_id}`, isFirst: i === 0, isLast: i === ordered.length - 1, examId: null as number | null };
      }
      const e = await prisma.exam.findUnique({ where: { id: o.content_id } });
      return { contentOrderId: o.id, orden: o.orden, type: "exam" as const, title: e?.title ?? `Examen ${o.content_id}`, isFirst: i === 0, isLast: i === ordered.length - 1, examId: e?.id ?? null };
    })
  );

  async function move(formData: FormData) {
    "use server";
    const session = await auth();
    const role = (session?.user as any)?.role;
    const myCurso = Number((session?.user as any)?.curso ?? 0);
    const id = Number(formData.get("id"));
    const direction = String(formData.get("direction"));
    const row = await prisma.contentOrder.findUnique({ where: { id } });
    if (!row) return;
    if (role !== "admin" && row.curso_id !== myCurso) return;
    const neighbor = await prisma.contentOrder.findFirst({
      where: { curso_id: row.curso_id, orden: direction === "up" ? { lt: row.orden } : { gt: row.orden } },
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
      <Topbar title="Orden del mapa" subtitle={isAdmin ? `Curso ${curso}` : `Tu curso — ${curso}`} />
      {isAdmin && (
        <div className="flex gap-2 flex-wrap">
          {cursos.map((c) => (
            <Link key={c.id_cur} href={`/admin/map-order?curso=${c.id_cur}`}>
              <Button size="sm" variant={curso === c.id_cur ? "secondary" : "outline"}>
                {c.nombre}
              </Button>
            </Link>
          ))}
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Secuencia del mapa ({rows.length})</CardTitle>
          <p className="text-xs text-muted-foreground">
            Los exámenes ya no bloquean lo que sigue — solo importan para desbloquearse a sí mismos. Configurá requisito de lección y ventana de disponibilidad desde "Editar" en cada examen.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">Sin lecciones ni exámenes en este curso todavía.</p>}
          {rows.map((r) => (
            <div key={r.contentOrderId} className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <Badge variant={r.type === "exam" ? "warning" : "secondary"}>{r.type}</Badge>
                <span className="text-sm font-medium">{r.title}</span>
              </div>
              <div className="flex items-center gap-2">
                {r.type === "exam" && r.examId && (
                  <Link href={`/admin/exams/${r.examId}`}>
                    <Button size="sm" variant="outline">
                      Editar
                    </Button>
                  </Link>
                )}
                <form action={move}>
                  <input type="hidden" name="id" value={r.contentOrderId} />
                  <input type="hidden" name="direction" value="up" />
                  <Button size="sm" variant="ghost" type="submit" disabled={r.isFirst} aria-label="Subir">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                </form>
                <form action={move}>
                  <input type="hidden" name="id" value={r.contentOrderId} />
                  <input type="hidden" name="direction" value="down" />
                  <Button size="sm" variant="ghost" type="submit" disabled={r.isLast} aria-label="Bajar">
                    <ArrowDown className="h-4 w-4" />
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
