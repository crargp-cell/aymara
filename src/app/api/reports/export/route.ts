import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Papa from "papaparse";

export async function GET() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "admin") return new Response("Forbidden", { status: 403 });

  const users = await prisma.usuario.findMany({ orderBy: { id: "asc" } });

  const rows = await Promise.all(
    users.map(async (u) => {
      const [totalAttempts, correctAttempts, examResults, arCards] = await Promise.all([
        prisma.exerciseAttempt.count({ where: { user_id: u.id } }),
        prisma.exerciseAttempt.count({ where: { user_id: u.id, is_correct: true } }),
        prisma.examResult.findMany({ where: { user_id: u.id } }),
        prisma.userArCard.count({ where: { user_id: u.id } }),
      ]);
      const examsPassed = examResults.filter((e) => e.passed).length;
      return {
        id: u.id,
        username: u.username,
        email: u.email ?? "",
        role: u.role,
        curso: u.curso,
        intentos_ejercicios: totalAttempts,
        aciertos: correctAttempts,
        tasa_acierto_pct: totalAttempts ? Math.round((correctAttempts / totalAttempts) * 100) : 0,
        examenes_rendidos: examResults.length,
        examenes_aprobados: examsPassed,
        tarjetas_ar: arCards,
      };
    })
  );

  const csv = Papa.unparse(rows);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reporte_aymara.csv"`,
    },
  });
}
