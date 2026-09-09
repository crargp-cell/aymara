import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { maestroParaleloIds } from "@/lib/rbac";
import { recomputeAnalytics } from "@/lib/analytics/aggregate";
import { trainRiskModel, getPredicciones } from "@/lib/ml/model";
import { trainScoreModel, getScorePredicciones } from "@/lib/ml/linear";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/layout/Topbar";
import type { Prisma } from "@/generated/prisma/client";

export default async function AnaliticaPage() {
  const user = await requireRole(["maestro", "admin"]);
  const isAdmin = user.role === "admin";
  const paraleloIds = isAdmin ? [] : await maestroParaleloIds(user.id);

  // `StatisticsAggregated` es una tabla plana sin relaciones: se acota por su
  // propia columna paralelo_id (que ahora también llevan las filas de ejercicio).
  const statWhere: Prisma.StatisticsAggregatedWhereInput = paraleloIds.length ? { paralelo_id: { in: paraleloIds } } : {};

  const [porEjercicio, porLeccion, porParalelo, porAlumno, predicciones, modelo, prediccionesLineal, modeloLineal] = await Promise.all([
    prisma.statisticsAggregated.findMany({ where: { stat_type: "exercise", ...statWhere }, orderBy: { difficulty_score: "desc" }, take: 12 }),
    prisma.statisticsAggregated.findMany({ where: { stat_type: "lesson", ...statWhere }, orderBy: { difficulty_score: "desc" }, take: 12 }),
    prisma.statisticsAggregated.findMany({ where: { stat_type: "paralelo", ...statWhere }, orderBy: { average_score: "asc" }, take: 12 }),
    prisma.statisticsAggregated.findMany({ where: { stat_type: "student", ...statWhere }, orderBy: { average_score: "asc" }, take: 20 }),
    getPredicciones(paraleloIds),
    prisma.mlModelo.findFirst({ where: { activo: true, tipo: "logistic_regression_risk" }, orderBy: { entrenado_at: "desc" } }),
    getScorePredicciones(paraleloIds),
    prisma.mlModelo.findFirst({ where: { activo: true, tipo: "linear_regression_score" }, orderBy: { entrenado_at: "desc" } }),
  ]);

  const lessonTitles = new Map(
    (await prisma.lesson.findMany({ where: { id: { in: [...porLeccion, ...porEjercicio].map((s) => s.lesson_id).filter(Boolean) } }, select: { id: true, title: true } })).map((l) => [l.id, l.title]),
  );
  const paraleloNames = new Map(
    (
      await prisma.paralelo.findMany({
        where: { id: { in: [...porParalelo, ...porAlumno].map((s) => s.paralelo_id).filter(Boolean) } },
        include: { grado: true, gestion: true },
      })
    ).map((p) => [p.id, `${p.gestion.nombre} · ${p.grado.nombre} "${p.nombre}"`]),
  );
  const alumnoNames = new Map(
    (await prisma.usuario.findMany({ where: { id: { in: porAlumno.map((s) => s.alumno_id) } }, select: { id: true, nombre: true, apellido: true, username: true } })).map((u) => [
      u.id,
      [u.nombre, u.apellido].filter(Boolean).join(" ") || u.username,
    ]),
  );

  const riesgoTodos = predicciones.filter((p) => p.tipo === "riesgo_bajo_rendimiento");
  const riesgo = riesgoTodos.filter((p) => p.etiqueta !== "sin_datos").sort((a, b) => Number(b.valor) - Number(a.valor));
  const sinDatos = riesgoTodos.filter((p) => p.etiqueta === "sin_datos");
  const tendencias = predicciones.filter((p) => p.tipo === "tendencia" && p.etiqueta === "negativa");

  async function recompute() {
    "use server";
    await requireRole(["maestro", "admin"]);
    await recomputeAnalytics();
    await Promise.all([trainRiskModel(), trainScoreModel()]);
    revalidatePath("/admin/analitica");
  }

  const pct = (ok: number | null, total: number | null) => (total ? Math.round(((ok ?? 0) / total) * 100) : 0);

  return (
    <div className="space-y-6">
      <Topbar title="Analítica" subtitle={isAdmin ? "Vista institucional" : "Tus paralelos"} />

      <Card>
        <CardHeader><CardTitle className="text-base">Modelo predictivo</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            {modelo
              ? `Logística ${modelo.version} · ${modelo.n_muestras} alumnos · exactitud ${(modelo.metricas as { accuracy?: number })?.accuracy ?? "—"}`
              : "Sin modelo logístico."}
            {" · "}
            {modeloLineal
              ? `Lineal ${modeloLineal.version} · R² ${(modeloLineal.metricas as { r2?: number })?.r2 ?? "—"} · RMSE ${(modeloLineal.metricas as { rmse?: number })?.rmse ?? "—"}`
              : "Sin modelo lineal."}
          </span>
          <form action={recompute}><Button size="sm" variant="secondary" type="submit">Recalcular analítica + reentrenar (logística + lineal)</Button></form>
          <a href="/api/reports/export" className="text-primary hover:underline text-sm">Exportar CSV</a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Nota predicha — Regresión lineal</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {prediccionesLineal.length === 0 && <p className="text-sm text-muted-foreground">Sin predicciones lineales. Reentrena.</p>}
          {prediccionesLineal.slice(0, 12).map((p) => (
            <div key={p.id} className="panel rounded-xl px-4 py-2 flex items-center justify-between text-sm">
              <span>{[p.alumno.nombre, p.alumno.apellido].filter(Boolean).join(" ") || p.alumno.username}</span>
              <Badge variant={p.etiqueta === "aprobado" ? "default" : p.etiqueta === "en_riesgo" ? "warning" : "destructive"}>
                {Math.round(Number(p.valor) * 100)}/100 · {p.etiqueta}
              </Badge>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">y = w·x + b con x estandarizado (9 features). R² y RMSE en modelo lineal.</p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alumnos en riesgo (predicción)</CardTitle>
            {sinDatos.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {sinDatos.length} alumno(s) sin actividad suficiente quedan fuera de la predicción: {sinDatos.slice(0, 4).map((p) => [p.alumno.nombre, p.alumno.apellido].filter(Boolean).join(" ") || p.alumno.username).join(", ")}
                {sinDatos.length > 4 ? "…" : ""}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {riesgo.length === 0 && <p className="text-sm text-muted-foreground">Sin predicciones. Reentrena el modelo.</p>}
            {riesgo.slice(0, 12).map((p) => (
              <div key={p.id} className="panel rounded-xl px-4 py-2 flex items-center justify-between text-sm">
                <span>{[p.alumno.nombre, p.alumno.apellido].filter(Boolean).join(" ") || p.alumno.username}</span>
                <Badge variant={p.etiqueta === "alto" ? "destructive" : p.etiqueta === "medio" ? "warning" : "secondary"}>{Math.round(Number(p.valor) * 100)}% · {p.etiqueta}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Tendencia negativa</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {tendencias.length === 0 && <p className="text-sm text-muted-foreground">Ningún alumno con tendencia negativa marcada.</p>}
            {tendencias.map((p) => (
              <div key={p.id} className="panel rounded-xl px-4 py-2 flex items-center justify-between text-sm">
                <span>{[p.alumno.nombre, p.alumno.apellido].filter(Boolean).join(" ") || p.alumno.username}</span>
                <Badge variant="warning">{Math.round(Number(p.valor) * 100)}%</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Ejercicios más difíciles</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {porEjercicio.map((s) => (
            <div key={s.id} className="panel rounded-lg px-3 py-1.5 flex items-center justify-between">
              <span>Ejercicio {s.exercise_id} · {lessonTitles.get(s.lesson_id) ?? `lección ${s.lesson_id}`}</span>
              <span className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">{pct(s.successful_attempts, s.total_attempts)}% acierto · {s.total_attempts} intentos</span>
                <Badge variant={s.predicted_difficulty === "dificil" ? "destructive" : s.predicted_difficulty === "medio" ? "warning" : "secondary"}>{s.predicted_difficulty}</Badge>
              </span>
            </div>
          ))}
          {porEjercicio.length === 0 && <p className="text-muted-foreground">Sin datos. Recalcula la analítica.</p>}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Rendimiento por lección</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {porLeccion.map((s) => (
              <div key={s.id} className="panel rounded-lg px-3 py-1.5 flex items-center justify-between">
                <span>{lessonTitles.get(s.lesson_id) ?? `Lección ${s.lesson_id}`}</span>
                <span className="text-xs text-muted-foreground">{pct(s.successful_attempts, s.total_attempts)}% · {Math.round(Number(s.average_time_ms) / 1000)}s</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{isAdmin ? "Comparativa entre paralelos" : "Tus paralelos"}</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {porParalelo.map((s) => (
              <div key={s.id} className="panel rounded-lg px-3 py-1.5 flex items-center justify-between">
                <span>{paraleloNames.get(s.paralelo_id) ?? `Paralelo ${s.paralelo_id}`}</span>
                <span className="text-xs text-muted-foreground">{pct(s.successful_attempts, s.total_attempts)}% acierto · {s.total_attempts} intentos</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Alumnos con menor rendimiento (descriptivo)</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {porAlumno.map((s) => (
            <div key={s.id} className="panel rounded-lg px-3 py-1.5 flex items-center justify-between">
              <span>{alumnoNames.get(s.alumno_id) ?? `Alumno ${s.alumno_id}`}</span>
              <span className="text-xs text-muted-foreground">{pct(s.successful_attempts, s.total_attempts)}% acierto · {s.failed_attempts} fallos</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
