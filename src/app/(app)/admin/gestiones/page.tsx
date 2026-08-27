import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";

export default async function GestionesPage() {
  await requireRole(["admin"]);
  const gestiones = await prisma.gestion.findMany({
    orderBy: { anio: "desc" },
    include: { _count: { select: { paralelos: true } } },
  });

  async function createGestion(formData: FormData) {
    "use server";
    await requireRole(["admin"]);
    const anio = Number(formData.get("anio"));
    if (!anio) return;
    const nombre = String(formData.get("nombre") || `Gestión ${anio}`);
    await prisma.gestion.create({
      data: {
        nombre,
        anio,
        fecha_inicio: new Date(formData.get("fecha_inicio") ? String(formData.get("fecha_inicio")) : `${anio}-02-01`),
        fecha_fin: new Date(formData.get("fecha_fin") ? String(formData.get("fecha_fin")) : `${anio}-11-30`),
        estado: "planificada",
      },
    });
    revalidatePath("/admin/gestiones");
  }

  async function setActual(formData: FormData) {
    "use server";
    await requireRole(["admin"]);
    const id = Number(formData.get("id"));
    await prisma.$transaction([
      prisma.gestion.updateMany({ data: { es_actual: false } }),
      prisma.gestion.update({ where: { id }, data: { es_actual: true, estado: "activa" } }),
    ]);
    revalidatePath("/admin/gestiones");
  }

  async function cerrar(formData: FormData) {
    "use server";
    await requireRole(["admin"]);
    const id = Number(formData.get("id"));
    await prisma.gestion.update({ where: { id }, data: { estado: "cerrada", es_actual: false } });
    revalidatePath("/admin/gestiones");
  }

  return (
    <div className="space-y-6">
      <Topbar title="Gestiones académicas" subtitle="Cada año escolar. Sólo una es la gestión actual." />
      <Card>
        <CardHeader><CardTitle className="text-base">Nueva gestión</CardTitle></CardHeader>
        <CardContent>
          <form action={createGestion} className="grid md:grid-cols-4 gap-3">
            <Input name="nombre" placeholder="Nombre (opcional)" />
            <Input name="anio" type="number" placeholder="Año" required defaultValue={new Date().getFullYear() + 1} />
            <Input name="fecha_inicio" type="date" />
            <Input name="fecha_fin" type="date" />
            <Button type="submit" variant="gradient" className="md:col-span-4">Crear</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Gestiones ({gestiones.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {gestiones.map((g) => (
            <div key={g.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium flex items-center gap-2">
                  {g.nombre}
                  {g.es_actual && <Badge variant="success">actual</Badge>}
                  <Badge variant="outline">{g.estado}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{g.anio} · {g._count.paralelos} paralelo(s) · {g.fecha_inicio.toLocaleDateString()} – {g.fecha_fin.toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                {!g.es_actual && <form action={setActual}><input type="hidden" name="id" value={g.id} /><Button size="sm" variant="secondary" type="submit">Marcar actual</Button></form>}
                {g.estado !== "cerrada" && <form action={cerrar}><input type="hidden" name="id" value={g.id} /><Button size="sm" variant="outline" type="submit">Cerrar</Button></form>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
