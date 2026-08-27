import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";

export default async function ParalelosPage() {
  await requireRole(["admin"]);
  const [gestiones, grados, maestros, paralelos] = await Promise.all([
    prisma.gestion.findMany({ orderBy: { anio: "desc" } }),
    prisma.grado.findMany({ where: { estado: "activo" }, orderBy: { nivel: "asc" } }),
    prisma.usuario.findMany({ where: { role: "maestro", activo: true }, orderBy: { username: "asc" } }),
    prisma.paralelo.findMany({
      orderBy: [{ gestion_id: "desc" }, { grado: { nivel: "asc" } }, { nombre: "asc" }],
      include: { gestion: true, grado: true, profesor: true, _count: { select: { inscripciones: true, lessons: true } } },
    }),
  ]);
  const nombreMaestro = (u: { nombre: string | null; apellido: string | null; username: string }) =>
    [u.nombre, u.apellido].filter(Boolean).join(" ") || u.username;

  async function createParalelo(formData: FormData) {
    "use server";
    await requireRole(["admin"]);
    const gestion_id = Number(formData.get("gestion_id"));
    const grado_id = Number(formData.get("grado_id"));
    const nombre = String(formData.get("nombre") ?? "").trim().toUpperCase();
    if (!gestion_id || !grado_id || !nombre) return;
    const profesor_id = formData.get("profesor_id") ? Number(formData.get("profesor_id")) : null;
    const p = await prisma.paralelo.create({ data: { gestion_id, grado_id, nombre, profesor_id } }).catch(() => null);
    if (p && profesor_id) await prisma.asignacionProfesor.create({ data: { paralelo_id: p.id, profesor_id } });
    revalidatePath("/admin/paralelos");
  }

  async function assignProfesor(formData: FormData) {
    "use server";
    await requireRole(["admin"]);
    const id = Number(formData.get("id"));
    const profesor_id = formData.get("profesor_id") ? Number(formData.get("profesor_id")) : null;
    const current = await prisma.paralelo.findUnique({ where: { id } });
    if (!current) return;
    // Cerrar la asignación anterior y abrir la nueva — el CONTENIDO no se toca (Negocio.md §6).
    await prisma.asignacionProfesor.updateMany({
      where: { paralelo_id: id, activo: true },
      data: { activo: false, fecha_hasta: new Date() },
    });
    if (profesor_id) await prisma.asignacionProfesor.create({ data: { paralelo_id: id, profesor_id } });
    await prisma.paralelo.update({ where: { id }, data: { profesor_id } });
    revalidatePath("/admin/paralelos");
  }

  return (
    <div className="space-y-6">
      <Topbar title="Paralelos" subtitle="La unidad donde vive el contenido y se inscriben los alumnos. Cambiar de profesor no borra el contenido." />
      <Card>
        <CardHeader><CardTitle className="text-base">Nuevo paralelo</CardTitle></CardHeader>
        <CardContent>
          <form action={createParalelo} className="grid md:grid-cols-4 gap-3">
            <select name="gestion_id" required className="h-10 rounded-xl border border-input glass bg-transparent px-3 text-sm">
              {gestiones.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
            <select name="grado_id" required className="h-10 rounded-xl border border-input glass bg-transparent px-3 text-sm">
              {grados.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
            <Input name="nombre" placeholder='Paralelo ("A")' required />
            <select name="profesor_id" className="h-10 rounded-xl border border-input glass bg-transparent px-3 text-sm">
              <option value="">Sin profesor</option>
              {maestros.map((m) => <option key={m.id} value={m.id}>{nombreMaestro(m)}</option>)}
            </select>
            <Button type="submit" variant="gradient" className="md:col-span-4">Crear</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Paralelos ({paralelos.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {paralelos.map((p) => (
            <div key={p.id} className="glass rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium flex items-center gap-2">
                  {p.gestion.nombre} · {p.grado.nombre} "{p.nombre}"
                  {p.gestion.es_actual && <Badge variant="success">actual</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{p._count.inscripciones} alumno(s) · {p._count.lessons} lección(es)</p>
              </div>
              <form action={assignProfesor} className="flex items-center gap-2">
                <input type="hidden" name="id" value={p.id} />
                <select name="profesor_id" defaultValue={p.profesor_id ?? ""} className="h-9 rounded-lg border border-input glass bg-transparent px-3 text-sm">
                  <option value="">Sin profesor</option>
                  {maestros.map((m) => <option key={m.id} value={m.id}>{nombreMaestro(m)}</option>)}
                </select>
                <Button size="sm" variant="secondary" type="submit">Asignar</Button>
              </form>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
