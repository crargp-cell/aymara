import { prisma } from "@/lib/prisma";

/**
 * Evalúa el catálogo de logros para un alumno y crea los `LogroAlumno` que
 * correspondan. Es idempotente (unique alumno+logro) y se dispara por evento:
 * al completar una lección, enviar un examen o desbloquear una tarjeta
 * (Negocio.md §24, §34 — automáticos, sin configuración manual).
 */
export async function evaluateLogros(alumnoId: number): Promise<string[]> {
  const [logros, yaObtenidos, leccionesCompletadas, examenesRendidos, examenesAprobados, tarjetas] = await Promise.all([
    prisma.logro.findMany({ where: { activo: true } }),
    prisma.logroAlumno.findMany({ where: { alumno_id: alumnoId }, select: { logro_id: true } }),
    prisma.userProgress.count({ where: { alumno_id: alumnoId, completed: true } }),
    prisma.examAttempt.count({ where: { alumno_id: alumnoId, completed_at: { not: null } } }),
    prisma.examAttempt.count({ where: { alumno_id: alumnoId, passed: true } }),
    prisma.userArCard.count({ where: { alumno_id: alumnoId, revocado: false } }),
  ]);

  const obtenidos = new Set(yaObtenidos.map((o) => o.logro_id));
  const nuevos: string[] = [];

  for (const logro of logros) {
    if (obtenidos.has(logro.id)) continue;
    let valor = 0;
    switch (logro.criterio_tipo) {
      case "lecciones_completadas":
        valor = leccionesCompletadas;
        break;
      case "examenes_rendidos":
        valor = examenesRendidos;
        break;
      case "examenes_aprobados":
        valor = examenesAprobados;
        break;
      case "tarjetas_desbloqueadas":
        valor = tarjetas;
        break;
      case "racha_dias":
        valor = await rachaDias(alumnoId);
        break;
      default:
        valor = 0;
    }
    if (valor >= logro.criterio_valor) {
      await prisma.logroAlumno.create({
        data: { alumno_id: alumnoId, logro_id: logro.id, progreso: valor, contexto: { valor, criterio: logro.criterio_tipo } },
      });
      nuevos.push(logro.nombre);
    }
  }
  return nuevos;
}

/** Días consecutivos (incluyendo hoy) con al menos un intento de ejercicio. */
async function rachaDias(alumnoId: number): Promise<number> {
  const rows = await prisma.exerciseAttempt.findMany({
    where: { alumno_id: alumnoId },
    select: { created_at: true },
    orderBy: { created_at: "desc" },
    take: 400,
  });
  const dias = new Set(rows.map((r) => r.created_at.toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (dias.has(key)) {
      streak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else if (streak === 0 && key === new Date().toISOString().slice(0, 10)) {
      // permitir que "hoy" sin actividad no rompa una racha que venía de ayer
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    } else {
      break;
    }
    if (streak > 400) break;
  }
  return streak;
}
