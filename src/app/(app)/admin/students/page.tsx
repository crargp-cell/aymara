import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ curso?: string }> }) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!["maestro", "admin"].includes(role)) redirect("/dashboard");
  const isAdmin = role === "admin";
  const myCurso = Number((session?.user as any)?.curso ?? 1);

  const sp = await searchParams;
  const cursoFilter = isAdmin ? (sp.curso ? Number(sp.curso) : undefined) : myCurso;

  const [students, cursos] = await Promise.all([
    prisma.usuario.findMany({ where: { role: "estudiante", activo: true, ...(cursoFilter ? { curso: cursoFilter } : {}) }, orderBy: { id: "asc" }, take: 50 }),
    isAdmin ? prisma.curso.findMany({ orderBy: { id_cur: "asc" } }) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <Topbar title="Panel Alumnos" subtitle={isAdmin ? `${students.length} estudiantes${cursoFilter ? ` — curso ${cursoFilter}` : " — todos los cursos"}` : `Curso ${myCurso} · ${students.length} estudiantes`} />
      {isAdmin && (
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/students">
            <Button size="sm" variant={!cursoFilter ? "secondary" : "outline"}>
              Todos
            </Button>
          </Link>
          {cursos.map((c) => (
            <Link key={c.id_cur} href={`/admin/students?curso=${c.id_cur}`}>
              <Button size="sm" variant={cursoFilter === c.id_cur ? "secondary" : "outline"}>
                {c.nombre}
              </Button>
            </Link>
          ))}
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estudiantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {students.length === 0 && <p className="text-sm text-muted-foreground">Sin estudiantes en este curso.</p>}
          {students.map((s) => (
            <div key={s.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>{s.username}</span>
                  <Badge variant="outline">{s.email ?? "sin email"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Curso {s.curso} · {s.activo ? "activo" : "inactivo"}</p>
              </div>
              <Link href={`/admin/students/${s.id}`}>
                <Button size="sm" variant="outline">
                  Detalle
                </Button>
              </Link>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
