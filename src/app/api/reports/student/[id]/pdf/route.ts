import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { maestroParaleloIds } from "@/lib/rbac";
import { getHistorialInscripciones } from "@/lib/paralelo";
import { buildStudentReportPdf } from "@/lib/reports/pdf";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSessionUser();
  if (!me || !["maestro", "admin"].includes(me.role)) return new Response("Forbidden", { status: 403 });

  const { id } = await params;
  const uid = Number(id);
  if (Number.isNaN(uid)) return new Response("Bad request", { status: 400 });

  const user = await prisma.usuario.findUnique({ where: { id: uid } });
  if (!user || user.role !== "estudiante") return new Response("Not found", { status: 404 });

  if (me.role === "maestro") {
    const ids = await maestroParaleloIds(me.id);
    const has = await prisma.inscripcion.count({ where: { alumno_id: uid, paralelo_id: { in: ids } } });
    if (has === 0) return new Response("Forbidden", { status: 403 });
  }

  const [historial, progress, lessonAttempts, examAttempts, arCards, logros] = await Promise.all([
    getHistorialInscripciones(uid),
    prisma.userProgress.findMany({ where: { alumno_id: uid }, orderBy: { updated_at: "desc" }, take: 30 }),
    prisma.lessonAttempt.findMany({ where: { alumno_id: uid }, orderBy: { started_at: "desc" }, take: 20, include: { lesson: { select: { title: true } } } }),
    prisma.examAttempt.findMany({ where: { alumno_id: uid, completed_at: { not: null } }, orderBy: { completed_at: "desc" }, take: 20, include: { exam: { select: { title: true } } } }),
    prisma.userArCard.findMany({ where: { alumno_id: uid }, include: { ar_card: { select: { title: true, card_code: true } } } }),
    prisma.logroAlumno.findMany({ where: { alumno_id: uid }, include: { logro: { select: { nombre: true } } } }),
  ]);

  const bytes = await buildStudentReportPdf({
    user,
    historial: historial.map((h) => ({
      paralelo: `${h.paralelo.gestion.nombre} · ${h.paralelo.grado.nombre} "${h.paralelo.nombre}"`,
      estado: h.estado,
      desde: h.fecha_inscripcion.toISOString().slice(0, 10),
      hasta: h.fecha_baja ? h.fecha_baja.toISOString().slice(0, 10) : null,
    })),
    progress: progress.map((p) => ({ lesson_id: p.lesson_id, completed: p.completed, current_index: p.current_index, total_exercises: p.total_exercises })),
    lessonAttempts: lessonAttempts.map((a) => ({ lesson: a.lesson.title, attempt_no: a.attempt_no, passed: a.passed, correct_count: a.correct_count, min_required: a.min_required })),
    examAttempts: examAttempts.map((e) => ({ exam: e.exam.title, attempt_no: e.attempt_no, score: Number(e.score), passed: e.passed })),
    arCards: arCards.map((c) => ({ title: c.ar_card.title ?? c.ar_card.card_code, via: c.unlocked_by, revoked: c.revocado })),
    logros: logros.map((l) => l.logro.nombre),
  });

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte_${user.username}.pdf"`,
    },
  });
}
