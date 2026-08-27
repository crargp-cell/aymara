import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getParaleloSeleccionado } from "@/lib/paralelo";
import { setParaleloSeleccionado } from "@/lib/paralelo-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/layout/Topbar";
import { BookOpen, Users, FileQuestion, Sparkles, CheckCircle2 } from "lucide-react";

/**
 * Primer paso del docente: elegir el paralelo con el que va a trabajar.
 * Hasta que no elija uno, las pestañas de contenido no cargan nada — el
 * contenido siempre pertenece a un paralelo concreto (Negocio.md §31).
 */
export default async function SeleccionarParaleloPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await requireRole(["maestro", "admin"]);
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") ? sp.next : "/admin/lessons";

  const { actual, opciones } = await getParaleloSeleccionado(user.role, user.id);

  const ids = opciones.map((p) => p.id);
  const [lecciones, examenes, tarjetas, inscritos] = await Promise.all([
    prisma.lesson.groupBy({ by: ["paralelo_id"], where: { paralelo_id: { in: ids } }, _count: { _all: true } }),
    prisma.exam.groupBy({ by: ["paralelo_id"], where: { paralelo_id: { in: ids } }, _count: { _all: true } }),
    prisma.arCard.groupBy({ by: ["paralelo_id"], where: { paralelo_id: { in: ids } }, _count: { _all: true } }),
    prisma.inscripcion.groupBy({
      by: ["paralelo_id"],
      where: { paralelo_id: { in: ids }, estado: { in: ["activo", "reincorporado"] } },
      _count: { _all: true },
    }),
  ]);
  const cuenta = (rows: { paralelo_id: number; _count: { _all: number } }[], id: number) =>
    rows.find((r) => r.paralelo_id === id)?._count._all ?? 0;

  const profesores = await prisma.paralelo.findMany({
    where: { id: { in: ids } },
    select: { id: true, profesor: { select: { nombre: true, apellido: true, username: true } } },
  });
  const profeMap = new Map(
    profesores.map((p) => [p.id, p.profesor ? [p.profesor.nombre, p.profesor.apellido].filter(Boolean).join(" ") || p.profesor.username : null]),
  );

  return (
    <div className="space-y-6">
      <Topbar
        title="Elige el paralelo"
        subtitle="El contenido pertenece al paralelo. Selecciona con cuál vas a trabajar para cargar lecciones, ejercicios, exámenes y tarjetas."
      />

      {opciones.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              No tienes ningún paralelo asignado todavía. Pide al administrador que te asigne uno desde <b>Administración → Paralelos</b>.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {opciones.map((p) => {
            const esActual = actual?.id === p.id;
            return (
              <Card key={p.id} className={esActual ? "border-primary/50 shadow-glow" : "hover:shadow-glow"}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between gap-2">
                    <span>{p.nombre}</span>
                    {esActual && <Badge variant="success"><CheckCircle2 className="h-3 w-3 mr-1" />en uso</Badge>}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={p.es_actual ? "secondary" : "outline"}>{p.gestion}</Badge>
                    {!p.es_actual && <span>gestión no vigente</span>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Profesor: {profeMap.get(p.id) ?? "sin asignar"}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-muted-foreground" />{cuenta(inscritos, p.id)} alumnos</span>
                    <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5 text-muted-foreground" />{cuenta(lecciones, p.id)} lecciones</span>
                    <span className="flex items-center gap-1.5"><FileQuestion className="h-3.5 w-3.5 text-muted-foreground" />{cuenta(examenes, p.id)} exámenes</span>
                    <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-muted-foreground" />{cuenta(tarjetas, p.id)} tarjetas</span>
                  </div>
                  <form action={setParaleloSeleccionado}>
                    <input type="hidden" name="paralelo_id" value={p.id} />
                    <input type="hidden" name="back" value={next} />
                    <Button type="submit" variant={esActual ? "secondary" : "gradient"} className="w-full">
                      {esActual ? "Continuar con este" : "Trabajar con este paralelo"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
