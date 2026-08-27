import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Topbar } from "@/components/layout/Topbar";
import { badgeVariantContenido } from "@/lib/estado";
import Link from "next/link";

export default async function SupervisionPage({ searchParams }: { searchParams: Promise<{ paralelo?: string }> }) {
  await requireRole(["admin"]);
  const sp = await searchParams;

  const paralelos = await prisma.paralelo.findMany({
    orderBy: [{ gestion_id: "desc" }, { grado: { nivel: "asc" } }, { nombre: "asc" }],
    include: { gestion: true, grado: true, profesor: true },
  });
  const selId = sp.paralelo ? Number(sp.paralelo) : paralelos[0]?.id;
  const sel = paralelos.find((p) => p.id === selId) ?? null;

  const [lessons, exams, comentarios] = sel
    ? await Promise.all([
        prisma.lesson.findMany({ where: { paralelo_id: sel.id }, orderBy: { orden: "asc" }, include: { _count: { select: { lesson_exercises: true, topics: true } } } }),
        prisma.exam.findMany({ where: { paralelo_id: sel.id }, orderBy: { id: "asc" } }),
        prisma.comentarioRevision.findMany({ where: { paralelo_id: sel.id }, orderBy: { created_at: "desc" }, take: 30 }),
      ])
    : [[], [], []];

  async function deshabilitar(formData: FormData) {
    "use server";
    const u = await requireRole(["admin"]);
    const tipo = String(formData.get("tipo"));
    const id = Number(formData.get("id"));
    const motivo = String(formData.get("motivo") ?? "Contenido observado por administración").slice(0, 255);
    const data = { estado: "deshabilitado" as const, deshabilitado_por: u.id, deshabilitado_at: new Date(), motivo };
    if (tipo === "lesson") await prisma.lesson.update({ where: { id }, data });
    else if (tipo === "exam") await prisma.exam.update({ where: { id }, data });
    revalidatePath("/admin/supervision");
  }

  async function rehabilitar(formData: FormData) {
    "use server";
    await requireRole(["admin"]);
    const tipo = String(formData.get("tipo"));
    const id = Number(formData.get("id"));
    const data = { estado: "activo" as const, deshabilitado_por: null, deshabilitado_at: null, motivo: null };
    if (tipo === "lesson") await prisma.lesson.update({ where: { id }, data });
    else if (tipo === "exam") await prisma.exam.update({ where: { id }, data });
    revalidatePath("/admin/supervision");
  }

  async function comentar(formData: FormData) {
    "use server";
    const u = await requireRole(["admin"]);
    const texto = String(formData.get("texto") ?? "").trim();
    if (!texto || !sel) return;
    await prisma.comentarioRevision.create({
      data: { paralelo_id: sel.id, contenido_tipo: String(formData.get("tipo") ?? "paralelo"), contenido_id: Number(formData.get("id") ?? 0), autor_id: u.id, texto },
    });
    revalidatePath("/admin/supervision");
  }

  async function resolver(formData: FormData) {
    "use server";
    await requireRole(["admin"]);
    await prisma.comentarioRevision.update({ where: { id: Number(formData.get("id")) }, data: { resuelto: true } });
    revalidatePath("/admin/supervision");
  }

  return (
    <div className="space-y-6">
      <Topbar title="Supervisión de contenido" subtitle="Revisar, desactivar y comentar. El administrador NO edita el contenido pedagógico." />

      <div className="flex gap-2 flex-wrap">
        {paralelos.map((p) => (
          <Link key={p.id} href={`/admin/supervision?paralelo=${p.id}`}>
            <Button size="sm" variant={sel?.id === p.id ? "secondary" : "outline"}>{p.gestion.nombre} · {p.grado.nombre} "{p.nombre}"</Button>
          </Link>
        ))}
      </div>

      {sel && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">{sel.grado.nombre} "{sel.nombre}" — profesor: {sel.profesor ? [sel.profesor.nombre, sel.profesor.apellido].filter(Boolean).join(" ") || sel.profesor.username : "sin asignar"}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Lecciones</p>
              {lessons.map((l) => (
                <div key={l.id} className="glass rounded-xl px-4 py-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    #{l.orden} {l.title}
                    <Badge variant={badgeVariantContenido(l.estado)}>{l.estado}</Badge>
                    <span className="text-xs text-muted-foreground">{l._count.topics} tema · {l._count.lesson_exercises} ej.</span>
                  </span>
                  <span className="flex gap-1">
                    <Link href={`/lessons/${l.id}`}><Button size="sm" variant="ghost">Ver</Button></Link>
                    {l.estado === "deshabilitado" ? (
                      <form action={rehabilitar}><input type="hidden" name="tipo" value="lesson" /><input type="hidden" name="id" value={l.id} /><Button size="sm" variant="secondary" type="submit">Rehabilitar</Button></form>
                    ) : (
                      <form action={deshabilitar} className="flex gap-1"><input type="hidden" name="tipo" value="lesson" /><input type="hidden" name="id" value={l.id} /><Input name="motivo" placeholder="Motivo" className="h-8 w-32 text-xs" /><Button size="sm" variant="destructive" type="submit">Desactivar</Button></form>
                    )}
                  </span>
                </div>
              ))}
              <p className="text-xs font-semibold uppercase text-muted-foreground pt-2">Exámenes</p>
              {exams.map((e) => (
                <div key={e.id} className="glass rounded-xl px-4 py-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">{e.title} <Badge variant={badgeVariantContenido(e.estado)}>{e.estado}</Badge></span>
                  <span className="flex gap-1">
                    {e.estado === "deshabilitado" ? (
                      <form action={rehabilitar}><input type="hidden" name="tipo" value="exam" /><input type="hidden" name="id" value={e.id} /><Button size="sm" variant="secondary" type="submit">Rehabilitar</Button></form>
                    ) : (
                      <form action={deshabilitar} className="flex gap-1"><input type="hidden" name="tipo" value="exam" /><input type="hidden" name="id" value={e.id} /><Input name="motivo" placeholder="Motivo" className="h-8 w-32 text-xs" /><Button size="sm" variant="destructive" type="submit">Desactivar</Button></form>
                    )}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Comentarios para el profesor</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <form action={comentar} className="flex gap-2">
                <input type="hidden" name="tipo" value="paralelo" />
                <Input name="texto" placeholder="Escribe una observación para el profesor…" className="flex-1" />
                <Button size="sm" variant="gradient" type="submit">Enviar</Button>
              </form>
              {comentarios.map((c) => (
                <div key={c.id} className="glass rounded-xl px-4 py-2 flex items-center justify-between text-sm">
                  <span className={c.resuelto ? "line-through text-muted-foreground" : ""}>{c.texto}</span>
                  {!c.resuelto && <form action={resolver}><input type="hidden" name="id" value={c.id} /><Button size="sm" variant="ghost" type="submit">Resolver</Button></form>}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
