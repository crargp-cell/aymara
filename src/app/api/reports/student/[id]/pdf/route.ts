import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildStudentReportPdf } from "@/lib/reports/pdf";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const myCurso = Number((session?.user as any)?.curso ?? 0);
  if (!["maestro", "admin"].includes(role)) return new Response("Forbidden", { status: 403 });

  const { id } = await params;
  const uid = Number(id);
  if (Number.isNaN(uid)) return new Response("Bad request", { status: 400 });

  const user = await prisma.usuario.findUnique({ where: { id: uid } });
  if (!user) return new Response("Not found", { status: 404 });
  if (role !== "admin" && user.curso !== myCurso) return new Response("Forbidden", { status: 403 });

  const [progress, attempts, arCards, examResults] = await Promise.all([
    prisma.userProgress.findMany({ where: { user_id: uid }, orderBy: { date: "desc" }, take: 20 }),
    prisma.exerciseAttempt.findMany({ where: { user_id: uid }, orderBy: { created_at: "desc" }, take: 20 }),
    prisma.userArCard.findMany({ where: { user_id: uid } }),
    prisma.examResult.findMany({ where: { user_id: uid }, orderBy: { created_at: "desc" }, take: 20 }),
  ]);

  const bytes = await buildStudentReportPdf({ user, progress, attempts, arCards, examResults });

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte_${user.username}.pdf"`,
    },
  });
}
