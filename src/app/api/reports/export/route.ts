import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { maestroParaleloIds } from "@/lib/rbac";
import Papa from "papaparse";

export async function GET() {
  const me = await getSessionUser();
  if (!me || !["maestro", "admin"].includes(me.role)) return new Response("Forbidden", { status: 403 });

  const paraleloIds = me.role === "admin" ? null : await maestroParaleloIds(me.id);

  const inscripciones = await prisma.inscripcion.findMany({
    where: paraleloIds ? { paralelo_id: { in: paraleloIds } } : {},
    include: { alumno: true, paralelo: { include: { grado: true, gestion: true } } },
    orderBy: [{ paralelo_id: "asc" }, { alumno: { apellido: "asc" } }],
  });

  const rows = await Promise.all(
    inscripciones.map(async (i) => {
      const [attempts, correct, exams, cards, lecciones] = await Promise.all([
        prisma.exerciseAttempt.count({ where: { alumno_id: i.alumno_id } }),
        prisma.exerciseAttempt.count({ where: { alumno_id: i.alumno_id, is_correct: true } }),
        prisma.examAttempt.findMany({ where: { alumno_id: i.alumno_id, completed_at: { not: null } }, select: { passed: true } }),
        prisma.userArCard.count({ where: { alumno_id: i.alumno_id, revocado: false } }),
        prisma.userProgress.count({ where: { alumno_id: i.alumno_id, completed: true } }),
      ]);
      return {
        alumno_id: i.alumno_id,
        nombre: [i.alumno.nombre, i.alumno.apellido].filter(Boolean).join(" ") || i.alumno.username,
        codigo: i.alumno.codigo_estudiante ?? "",
        gestion: i.paralelo.gestion.nombre,
        paralelo: `${i.paralelo.grado.nombre} ${i.paralelo.nombre}`,
        estado_inscripcion: i.estado,
        lecciones_completadas: lecciones,
        intentos_ejercicios: attempts,
        aciertos: correct,
        tasa_acierto_pct: attempts ? Math.round((correct / attempts) * 100) : 0,
        examenes_rendidos: exams.length,
        examenes_aprobados: exams.filter((e) => e.passed).length,
        tarjetas_ar: cards,
      };
    }),
  );

  return new Response(Papa.unparse(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reporte_aymara.csv"`,
    },
  });
}
