import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getParaleloActivoAlumno, getParaleloSeleccionado } from "@/lib/paralelo";
import { alumnoPuedeRendirExamen } from "@/lib/rbac";
import { effectiveScore } from "@/lib/exams/engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/layout/Topbar";
import { SinParalelo } from "@/components/layout/SinParalelo";
import Link from "next/link";

export default async function ExamsPage() {
  const user = await requireUser();
  const isStudent = user.role === "estudiante";
  const paralelo = isStudent ? await getParaleloActivoAlumno(user.id) : (await getParaleloSeleccionado(user.role, user.id)).actual;

  if (!paralelo) {
    return (
      <div className="space-y-6">
        <Topbar title="Exámenes" />
        <SinParalelo esDocente={!isStudent} volverA="/exams" />
      </div>
    );
  }

  const exams = await prisma.exam.findMany({ where: { paralelo_id: paralelo.id, estado: "activo" }, orderBy: { id: "asc" } });

  const rows = await Promise.all(
    exams.map(async (e) => {
      const gate = isStudent ? await alumnoPuedeRendirExamen(user.id, e.id) : { ok: true as const };
      const eff = isStudent ? await effectiveScore(e.id, user.id) : null;
      return { exam: e, gate, eff };
    }),
  );

  return (
    <div className="space-y-6">
      <Topbar title="Exámenes" subtitle={`${paralelo.nombre} — ${exams.length} exámenes`} />
      <Link href="/exams/history" className="text-sm text-primary hover:underline">Ver historial de intentos →</Link>
      <div className="grid md:grid-cols-2 gap-4">
        {rows.map(({ exam: e, gate, eff }) => (
          <Card key={e.id} className="hover:shadow-glow">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                {e.title}
                <Badge variant={e.type === "ar_exam" ? "success" : "secondary"}>{e.type === "ar_exam" ? "AR" : "palabras"}</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">{e.description ?? "Sin descripción"}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2 flex-wrap text-xs">
                <Badge variant="outline">{e.time_limit ?? "—"} min</Badge>
                <Badge variant="outline">mínimo {e.min_score}%</Badge>
                <Badge variant="outline">{e.max_attempts ?? "∞"} intentos</Badge>
                {eff && <Badge variant={eff.passed ? "success" : "warning"}>tu nota: {eff.score}%</Badge>}
              </div>
              {isStudent && !gate.ok ? (
                <p className="text-xs" style={{ color: "var(--ruta-futuro)" }}>{gate.motivo}</p>
              ) : (
                <Link href={`/exams/${e.id}`}>
                  <Button variant="gradient" size="sm" className="w-full">{isStudent ? "Rendir" : "Ver"}</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ))}
        {exams.length === 0 && <p className="text-sm text-muted-foreground">No hay exámenes.</p>}
      </div>
    </div>
  );
}
