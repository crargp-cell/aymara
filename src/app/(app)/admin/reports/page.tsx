import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/layout/Topbar";
import { recalcExerciseDifficulty } from "@/lib/reports/neural";
import { revalidatePath } from "next/cache";

export default async function ReportsPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "admin") redirect("/dashboard");

  async function recalc() {
    "use server";
    await recalcExerciseDifficulty();
    revalidatePath("/admin/reports");
  }

  const [users, lessons, exercises, exams, attempts, atRisks] = await Promise.all([
    prisma.usuario.count(),
    prisma.lesson.count(),
    prisma.exercise.count(),
    prisma.exam.count(),
    prisma.exerciseAttempt.count(),
    prisma.statisticsAggregated.findMany({ where: { predicted_difficulty: "dificil" }, take: 10 }),
  ]);

  const recent = await prisma.exerciseAttempt.findMany({ orderBy: { created_at: "desc" }, take: 5 });

  return (
    <div className="space-y-6">
      <Topbar title="Reportes" subtitle="Estadísticas agregadas y análisis" />
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{users}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lecciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{lessons}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ejercicios</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{exercises}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Intentos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{attempts}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recientes</CardTitle>
            <CardDescription>Últimos 5 intentos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.map((r) => (
              <div key={r.id} className="glass rounded-xl px-3 py-2 flex items-center justify-between text-sm">
                <span>
                  User {r.user_id} · Ex {r.exercise_id}
                </span>
                <Badge variant={r.is_correct ? "success" : "destructive"}>{r.is_correct ? "✓" : "✗"}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">En riesgo</CardTitle>
            <CardDescription>predicted_difficulty = dificil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {atRisks.map((a) => (
              <div key={a.id} className="glass rounded-xl px-3 py-2 text-sm">
                <p>
                  User {a.user_id ?? "-"} · {a.stat_type} · score {String(a.neural_network_score ?? "-")}
                </p>
                <p className="text-xs text-muted-foreground">{a.most_common_error ?? "sin error"} · {a.predicted_difficulty}</p>
              </div>
            ))}
            {atRisks.length === 0 && <p className="text-sm text-muted-foreground">Sin riesgos detectados</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accesos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <a href="/admin/students" className="text-sm text-primary hover:underline">
            Panel alumnos
          </a>
          <span className="text-muted-foreground">·</span>
          <a href="/api/reports/export" className="text-sm text-primary hover:underline">
            Exportar CSV
          </a>
          <span className="text-muted-foreground">·</span>
          <form action={recalc}>
            <Button type="submit" size="sm" variant="secondary">
              Recalcular estadísticas
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
