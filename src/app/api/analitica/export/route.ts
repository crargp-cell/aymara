import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { maestroParaleloIds } from "@/lib/rbac";
import { buildGeneralReportPdf } from "@/lib/reports/pdf";
import Papa from "papaparse";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me || !["maestro", "admin"].includes(me.role)) return new Response("Forbidden", { status: 403 });

  const isAdmin = me.role === "admin";
  const paraleloIds = isAdmin ? [] : await maestroParaleloIds(me.id);
  const statWhere: Prisma.StatisticsAggregatedWhereInput = paraleloIds.length ? { paralelo_id: { in: paraleloIds } } : {};

  const [porEjercicio, porLeccion, porParalelo] = await Promise.all([
    prisma.statisticsAggregated.findMany({ where: { stat_type: "exercise", ...statWhere }, orderBy: { difficulty_score: "desc" }, take: 12 }),
    prisma.statisticsAggregated.findMany({ where: { stat_type: "lesson", ...statWhere }, orderBy: { difficulty_score: "desc" }, take: 12 }),
    prisma.statisticsAggregated.findMany({ where: { stat_type: "paralelo", ...statWhere }, orderBy: { average_score: "asc" }, take: 12 }),
  ]);

  const url = new URL(req.url);
  const format = url.searchParams.get("format");

  if (format === "pdf") {
    const lessonTitles = new Map(
      (await prisma.lesson.findMany({ where: { id: { in: [...porLeccion, ...porEjercicio].map((s) => s.lesson_id).filter(Boolean) } }, select: { id: true, title: true } })).map((l) => [l.id, l.title]),
    );

    const rows = [
      ...porEjercicio.slice(0, 6).map((s, i) => ({
        id: String(i + 1).padStart(2, "0"),
        logro: `Ej. ${s.exercise_id} · ${lessonTitles.get(s.lesson_id) ?? `Lección ${s.lesson_id}`}`.slice(0, 30),
        afectados: `${Math.round(((s.successful_attempts ?? 0) / (s.total_attempts || 1)) * 100)}%`,
        estado: s.predicted_difficulty ?? "medio",
        estadoColor: (s.predicted_difficulty === "dificil" ? "amber" : s.predicted_difficulty === "facil" ? "emerald" : "blue") as "emerald" | "amber" | "blue",
        observaciones: `${s.total_attempts} intentos`,
      })),
      ...porLeccion.slice(0, 4).map((s, i) => ({
        id: String(porEjercicio.slice(0, 6).length + i + 1).padStart(2, "0"),
        logro: `Lección ${lessonTitles.get(s.lesson_id) ?? s.lesson_id}`.slice(0, 30),
        afectados: `${Math.round(((s.successful_attempts ?? 0) / (s.total_attempts || 1)) * 100)}%`,
        estado: s.predicted_difficulty ?? "medio",
        estadoColor: "blue" as const,
        observaciones: `${Math.round(Number(s.average_time_ms) / 1000)}s promedio`,
      })),
    ];

    const pdf = await buildGeneralReportPdf({
      titulo: "Informe de Analítica",
      gestion: "2026",
      rows: rows.length ? rows : [{ id: "01", logro: "Sin datos", afectados: "0%", estado: "Pendiente", estadoColor: "gray", observaciones: "Recalcula la analítica" }],
      generadoPor: `${me.name} / Sistema`,
    });

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="analitica_aymara.pdf"`,
      },
    });
  }

  const csvRows = [
    ...porEjercicio.map((s) => ({ tipo: "ejercicio", id: s.exercise_id, leccion: s.lesson_id, acierto_pct: s.total_attempts ? Math.round(((s.successful_attempts ?? 0) / s.total_attempts) * 100) : 0, intentos: s.total_attempts, dificultad: s.predicted_difficulty })),
    ...porLeccion.map((s) => ({ tipo: "leccion", id: s.lesson_id, acierto_pct: s.total_attempts ? Math.round(((s.successful_attempts ?? 0) / s.total_attempts) * 100) : 0, intentos: s.total_attempts, dificultad: s.predicted_difficulty })),
  ];

  return new Response(Papa.unparse(csvRows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="analitica_aymara.csv"`,
    },
  });
}
