import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import { badgeVariantContenido, toggleEstado } from "@/lib/estado";

export default async function GradosPage() {
  await requireRole(["admin"]);
  const grados = await prisma.grado.findMany({ orderBy: { nivel: "asc" }, include: { _count: { select: { paralelos: true } } } });

  async function createGrado(formData: FormData) {
    "use server";
    await requireRole(["admin"]);
    const nombre = String(formData.get("nombre") ?? "").trim();
    const nivel = Number(formData.get("nivel"));
    if (!nombre || !nivel) return;
    await prisma.grado.create({ data: { nombre, nivel } }).catch(() => {});
    revalidatePath("/admin/grados");
  }

  async function toggle(formData: FormData) {
    "use server";
    await requireRole(["admin"]);
    const id = Number(formData.get("id"));
    const g = await prisma.grado.findUnique({ where: { id } });
    if (!g) return;
    await prisma.grado.update({ where: { id }, data: { estado: toggleEstado(g.estado) } });
    revalidatePath("/admin/grados");
  }

  return (
    <div className="space-y-6">
      <Topbar title="Grados" subtitle="Catálogo de grados del colegio (p. ej. 1º–6º de Secundaria)." />
      <Card>
        <CardHeader><CardTitle className="text-base">Nuevo grado</CardTitle></CardHeader>
        <CardContent>
          <form action={createGrado} className="grid md:grid-cols-3 gap-3">
            <Input name="nombre" placeholder="Nombre (1º Secundaria)" required />
            <Input name="nivel" type="number" placeholder="Nivel (para ordenar)" required />
            <Button type="submit" variant="gradient">Crear</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Grados ({grados.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {grados.map((g) => (
            <div key={g.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                Nivel {g.nivel} · {g.nombre}
                <Badge variant={badgeVariantContenido(g.estado)}>{g.estado}</Badge>
                <span className="text-xs text-muted-foreground">{g._count.paralelos} paralelo(s)</span>
              </span>
              <form action={toggle}><input type="hidden" name="id" value={g.id} /><Button size="sm" variant="secondary" type="submit">{g.estado === "activo" ? "Desactivar" : "Activar"}</Button></form>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
