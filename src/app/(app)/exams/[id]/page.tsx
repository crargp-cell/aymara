import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WordMatchGame } from "@/components/exam/WordMatchGame";
import Link from "next/link";

export default async function ExamPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const eid = Number(id);
  if (Number.isNaN(eid)) notFound();
  const exam = await prisma.exam.findUnique({ where: { id: eid } });
  if (!exam) notFound();

  const session = await auth();
  const userId = Number((session?.user as any)?.id ?? 0);
  const role = (session?.user as any)?.role;
  const isStaff = role === "maestro" || role === "admin";

  // El mapa oculta el examen fuera de su ventana o sin el requisito cumplido,
  // pero eso es solo UI — hay que exigirlo también aquí para que no se pueda
  // sortear entrando directo por la URL.
  if (!isStaff) {
    const now = new Date();
    const outOfWindow = (exam.start_date && now < exam.start_date) || (exam.end_date && now > exam.end_date);
    if (outOfWindow) {
      return (
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{exam.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Este examen no está disponible en este momento.</p>
              <Link href="/map">
                <Button variant="outline">Volver al mapa</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      );
    }
    if (exam.lesson_id) {
      const prereqDone = await prisma.userProgress.findFirst({ where: { user_id: userId, lesson_id: exam.lesson_id, completed: true } });
      if (!prereqDone) {
        return (
          <div className="max-w-2xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{exam.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Debes completar la lección requerida antes de rendir este examen.</p>
                <Link href={`/lessons/${exam.lesson_id}`}>
                  <Button variant="outline">Ir a la lección</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        );
      }
    }
  }

  const detail = await prisma.examDetail.findFirst({ where: { exam_id: eid } });
  const categories: string[] = detail?.config_type === "categories" ? JSON.parse(detail.config_value) : [];

  if (exam.type === "ar_exam") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{exam.title} — AR</CardTitle>
            <p className="text-sm text-muted-foreground">Examen con marcadores AR — requiere cámara</p>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Marcadores requeridos: {detail?.config_value ?? "[]"} </p>
            <a href={`/ar-cards`}>
              <Button variant="outline" className="mt-4">
                Ver tarjetas AR
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const MIN_POOL = 12;
  const MAX_POOL = 40;
  let rows = categories.length
    ? await prisma.diccionario.findMany({ where: { categoria: { in: categories }, activo: true }, take: MAX_POOL })
    : await prisma.diccionario.findMany({ where: { activo: true, categoria: { not: "" } }, take: MAX_POOL });

  if (rows.length < MIN_POOL) {
    const extra = await prisma.diccionario.findMany({
      where: { activo: true, categoria: { not: "" }, id: { notIn: rows.map((w) => w.id) } },
      take: MAX_POOL - rows.length,
    });
    rows = [...rows, ...extra];
  }

  const words = rows
    .filter((w) => (w.aymara || w.espanol) && w.categoria)
    .map((w) => ({ id: w.id, text: (w.aymara || w.espanol)!, category: w.categoria! }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {exam.title} <Badge variant="secondary">Mínimo {exam.min_score ?? 70}%</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">{exam.description}</p>
        </CardHeader>
        <CardContent>
          <WordMatchGame examId={exam.id} timeLimitSeconds={(exam.time_limit ?? 5) * 60} words={words} />
        </CardContent>
      </Card>
    </div>
  );
}
