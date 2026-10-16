import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { recomputeAnalytics } from "@/lib/analytics/aggregate";
import { trainRiskModel } from "@/lib/ml/model";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/layout/Topbar";

export default async function ReportsPage() {
  await requireRole(["admin"]);

  async function recalc() {
    "use server";
    await requireRole(["admin"]);
    await recomputeAnalytics();
    await trainRiskModel();
    revalidatePath("/admin/reports");
  }

  const [usuarios, alumnos, paralelos, lessons, exams, attempts, examAttempts, arCards, logros] = await Promise.all([
    prisma.usuario.count(),
    prisma.usuario.count({ where: { role: "estudiante" } }),
    prisma.paralelo.count(),
    prisma.lesson.count(),
    prisma.exam.count(),
    prisma.exerciseAttempt.count(),
    prisma.examAttempt.count({ where: { completed_at: { not: null } } }),
    prisma.userArCard.count({ where: { revocado: false } }),
    prisma.logroAlumno.count(),
  ]);

  const stats = [
    { l: "Usuarios", n: usuarios },
    { l: "Alumnos", n: alumnos },
    { l: "Paralelos", n: paralelos },
    { l: "Lecciones", n: lessons },
    { l: "Exámenes", n: exams },
    { l: "Intentos ejercicio", n: attempts },
    { l: "Intentos examen", n: examAttempts },
    { l: "Tarjetas otorgadas", n: arCards },
    { l: "Logros otorgados", n: logros },
  ];

  return (
    <div className="space-y-6">
      <Topbar title="Reportes" subtitle="Resumen institucional. La analítica detallada está en «Analítica»." />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <Card key={s.l}><CardHeader><CardTitle className="text-sm">{s.l}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{s.n}</p></CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Acciones</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <a href="/api/reports/export" className="text-sm text-primary hover:underline">Exportar CSV</a>
          <span className="text-muted-foreground">·</span>
          <a href="/api/reports/export?format=pdf" className="text-sm text-primary hover:underline">Exportar PDF</a>
          <span className="text-muted-foreground">·</span>
          <a href="/admin/analitica" className="text-sm text-primary hover:underline">Analítica y predicción</a>
          <span className="text-muted-foreground">·</span>
          <form action={recalc}><Button type="submit" size="sm" variant="secondary">Recalcular analítica + reentrenar modelo</Button></form>
        </CardContent>
      </Card>
    </div>
  );
}
