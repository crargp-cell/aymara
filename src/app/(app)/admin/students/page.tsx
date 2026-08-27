import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { getParalelosDeMaestro } from "@/lib/paralelo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { badgeVariantAlumno } from "@/lib/estado";
import Link from "next/link";

const paraleloLabel = (p: { gestion: { nombre: string }; grado: { nombre: string }; nombre: string }) =>
  `${p.gestion.nombre} · ${p.grado.nombre} "${p.nombre}"`;

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ paralelo?: string }> }) {
  const user = await requireRole(["maestro", "admin"]);
  const isAdmin = user.role === "admin";
  const sp = await searchParams;

  const paralelos = isAdmin
    ? await prisma.paralelo.findMany({
        orderBy: [{ gestion_id: "desc" }, { grado: { nivel: "asc" } }, { nombre: "asc" }],
        include: { gestion: true, grado: true },
      })
    : (await getParalelosDeMaestro(user.id)).map((p) => ({ id: p.id, nombre: p.nombre, gestion: { nombre: p.gestion }, grado: { nombre: p.grado } }));

  const selectedId = sp.paralelo ? Number(sp.paralelo) : paralelos[0]?.id;
  const selected = paralelos.find((p) => p.id === selectedId) ?? null;

  const inscripciones = selected
    ? await prisma.inscripcion.findMany({
        where: { paralelo_id: selected.id },
        orderBy: [{ estado: "asc" }, { alumno: { apellido: "asc" } }],
        include: { alumno: true },
      })
    : [];

  // Alumnos sin inscripción en este paralelo (para inscribir)
  const enrolledIds = inscripciones.map((i) => i.alumno_id);
  const candidatos = isAdmin && selected
    ? await prisma.usuario.findMany({ where: { role: "estudiante", activo: true, id: { notIn: enrolledIds } }, orderBy: { apellido: "asc" }, take: 300 })
    : [];
  const destinos = isAdmin ? paralelos.filter((p) => p.id !== selected?.id) : [];

  async function inscribir(formData: FormData) {
    "use server";
    const u = await requireRole(["admin"]);
    const alumno_id = Number(formData.get("alumno_id"));
    const paralelo_id = Number(formData.get("paralelo_id"));
    if (!alumno_id || !paralelo_id) return;
    const insc = await prisma.inscripcion.upsert({
      where: { alumno_id_paralelo_id: { alumno_id, paralelo_id } },
      create: { alumno_id, paralelo_id, estado: "activo" },
      update: { estado: "activo", fecha_baja: null },
    });
    await prisma.movimientoAcademico.create({ data: { inscripcion_id: insc.id, tipo: "alta", realizado_por: u.id } });
    revalidatePath("/admin/students");
  }

  async function cambiarEstado(formData: FormData) {
    "use server";
    const u = await requireRole(["admin"]);
    const inscripcion_id = Number(formData.get("inscripcion_id"));
    const accion = String(formData.get("accion"));
    const insc = await prisma.inscripcion.findUnique({ where: { id: inscripcion_id } });
    if (!insc) return;
    if (accion === "retirar") {
      await prisma.inscripcion.update({ where: { id: inscripcion_id }, data: { estado: "retirado", fecha_baja: new Date(), motivo: String(formData.get("motivo") ?? "") || null } });
      await prisma.movimientoAcademico.create({ data: { inscripcion_id, tipo: "retiro", realizado_por: u.id } });
    } else if (accion === "reincorporar") {
      await prisma.inscripcion.update({ where: { id: inscripcion_id }, data: { estado: "reincorporado", fecha_baja: null } });
      await prisma.movimientoAcademico.create({ data: { inscripcion_id, tipo: "reincorporacion", realizado_por: u.id } });
    }
    revalidatePath("/admin/students");
  }

  async function cambiarParalelo(formData: FormData) {
    "use server";
    const u = await requireRole(["admin"]);
    const alumno_id = Number(formData.get("alumno_id"));
    const desde_id = Number(formData.get("desde_id"));
    const hacia_id = Number(formData.get("hacia_id"));
    if (!alumno_id || !hacia_id || desde_id === hacia_id) return;
    const anterior = await prisma.inscripcion.findUnique({ where: { alumno_id_paralelo_id: { alumno_id, paralelo_id: desde_id } } });
    if (anterior) {
      await prisma.inscripcion.update({ where: { id: anterior.id }, data: { estado: "trasladado", fecha_baja: new Date() } });
      await prisma.movimientoAcademico.create({ data: { inscripcion_id: anterior.id, tipo: "cambio_paralelo", realizado_por: u.id, datos_previos: { paralelo_id: desde_id }, datos_nuevos: { paralelo_id: hacia_id } } });
    }
    const nueva = await prisma.inscripcion.upsert({
      where: { alumno_id_paralelo_id: { alumno_id, paralelo_id: hacia_id } },
      create: { alumno_id, paralelo_id: hacia_id, estado: "activo" },
      update: { estado: "activo", fecha_baja: null },
    });
    await prisma.movimientoAcademico.create({ data: { inscripcion_id: nueva.id, tipo: "cambio_paralelo", realizado_por: u.id } });
    revalidatePath("/admin/students");
  }

  async function promoverLote(formData: FormData) {
    "use server";
    const u = await requireRole(["admin"]);
    const desde_id = Number(formData.get("desde_id"));
    const hacia_id = Number(formData.get("hacia_id"));
    if (!desde_id || !hacia_id || desde_id === hacia_id) return;
    const activos = await prisma.inscripcion.findMany({ where: { paralelo_id: desde_id, estado: { in: ["activo", "reincorporado"] } } });
    for (const insc of activos) {
      await prisma.inscripcion.update({ where: { id: insc.id }, data: { estado: "promovido", fecha_baja: new Date() } });
      await prisma.movimientoAcademico.create({ data: { inscripcion_id: insc.id, tipo: "promocion", realizado_por: u.id, datos_previos: { paralelo_id: desde_id }, datos_nuevos: { paralelo_id: hacia_id } } });
      const nueva = await prisma.inscripcion.upsert({
        where: { alumno_id_paralelo_id: { alumno_id: insc.alumno_id, paralelo_id: hacia_id } },
        create: { alumno_id: insc.alumno_id, paralelo_id: hacia_id, estado: "activo" },
        update: { estado: "activo", fecha_baja: null },
      });
      await prisma.movimientoAcademico.create({ data: { inscripcion_id: nueva.id, tipo: "promocion", realizado_por: u.id } });
    }
    revalidatePath("/admin/students");
  }

  return (
    <div className="space-y-6">
      <Topbar title={isAdmin ? "Alumnos e inscripciones" : "Mis alumnos"} subtitle="El historial del alumno se conserva en todos los cambios de paralelo y gestión." />

      <div className="flex gap-2 flex-wrap">
        {paralelos.map((p) => (
          <Link key={p.id} href={`/admin/students?paralelo=${p.id}`}>
            <Button size="sm" variant={selected?.id === p.id ? "secondary" : "outline"}>{paraleloLabel(p)}</Button>
          </Link>
        ))}
      </div>

      {isAdmin && selected && (
        <Card>
          <CardHeader><CardTitle className="text-base">Inscribir alumno en {paraleloLabel(selected)}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <form action={inscribir} className="flex flex-wrap gap-2">
              <input type="hidden" name="paralelo_id" value={selected.id} />
              <select name="alumno_id" className="h-9 flex-1 min-w-[220px] rounded-lg border border-input glass bg-transparent px-3 text-sm">
                {candidatos.map((c) => <option key={c.id} value={c.id}>{[c.nombre, c.apellido].filter(Boolean).join(" ") || c.username}</option>)}
              </select>
              <Button size="sm" variant="gradient" type="submit" disabled={candidatos.length === 0}>Inscribir</Button>
            </form>
            <form action={promoverLote} className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
              <span className="text-xs text-muted-foreground">Promoción por lote — pasar todos los activos a:</span>
              <input type="hidden" name="desde_id" value={selected.id} />
              <select name="hacia_id" className="h-9 rounded-lg border border-input glass bg-transparent px-3 text-sm">
                {destinos.map((p) => <option key={p.id} value={p.id}>{paraleloLabel(p)}</option>)}
              </select>
              <Button size="sm" variant="secondary" type="submit">Promover lote</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Alumnos ({inscripciones.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {inscripciones.length === 0 && <p className="text-sm text-muted-foreground">Sin inscripciones en este paralelo.</p>}
          {inscripciones.map((i) => (
            <div key={i.id} className="glass rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-[200px]">
                <div className="text-sm font-medium flex items-center gap-2">
                  {[i.alumno.nombre, i.alumno.apellido].filter(Boolean).join(" ") || i.alumno.username}
                  <Badge variant={badgeVariantAlumno(i.estado)}>{i.estado}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{i.alumno.codigo_estudiante ?? "sin código"} · desde {i.fecha_inscripcion.toLocaleDateString()}</p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Link href={`/admin/students/${i.alumno_id}`}><Button size="sm" variant="outline">Historial</Button></Link>
                {isAdmin && (["activo", "reincorporado"].includes(i.estado) ? (
                  <>
                    <form action={cambiarParalelo} className="flex gap-1 items-center">
                      <input type="hidden" name="alumno_id" value={i.alumno_id} />
                      <input type="hidden" name="desde_id" value={selected!.id} />
                      <select name="hacia_id" className="h-8 rounded-lg border border-input glass bg-transparent px-2 text-xs">
                        {destinos.map((p) => <option key={p.id} value={p.id}>{p.grado.nombre} "{p.nombre}"</option>)}
                      </select>
                      <Button size="sm" variant="ghost" type="submit">Mover</Button>
                    </form>
                    <form action={cambiarEstado}><input type="hidden" name="inscripcion_id" value={i.id} /><input type="hidden" name="accion" value="retirar" /><Button size="sm" variant="destructive" type="submit">Retirar</Button></form>
                  </>
                ) : (
                  <form action={cambiarEstado}><input type="hidden" name="inscripcion_id" value={i.id} /><input type="hidden" name="accion" value="reincorporar" /><Button size="sm" variant="secondary" type="submit">Reincorporar</Button></form>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
