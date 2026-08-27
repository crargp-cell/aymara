import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WordMatchGame } from "@/components/exam/WordMatchGame";
import { ArExamRunner } from "@/components/exam/ArExamRunner";
import { requireUser } from "@/lib/session";
import { alumnoPuedeRendirExamen } from "@/lib/rbac";
import Link from "next/link";

const MIN_POOL = 12;
const MAX_POOL = 40;

export default async function ExamPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const eid = Number(id);
  if (Number.isNaN(eid)) notFound();

  const user = await requireUser();
  const isStaff = user.role !== "estudiante";

  const exam = await prisma.exam.findUnique({
    where: { id: eid },
    include: { details: true, ar_cards: { include: { ar_card: true } } },
  });
  if (!exam) notFound();

  if (!isStaff) {
    const gate = await alumnoPuedeRendirExamen(user.id, eid);
    if (!gate.ok) {
      return (
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader><CardTitle>{exam.title}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{gate.motivo}</p>
              <Link href="/map"><Button variant="outline">Volver al mapa</Button></Link>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // -------- Examen AR --------
  if (exam.type === "ar_exam") {
    const cards = exam.ar_cards
      .map((l) => l.ar_card)
      .filter((c) => c.estado === "activo")
      .map((c) => ({ id: c.id, code: c.card_code, title: c.title ?? c.card_code, markerImageUrl: `/ar/${c.image_file ?? c.marker_file}` }));

    if (cards.length === 0) {
      return (
        <div className="max-w-2xl mx-auto">
          <Card><CardHeader><CardTitle>{exam.title}</CardTitle></CardHeader>
            <CardContent><p className="text-sm text-muted-foreground">Este examen aún no tiene tarjetas configuradas.</p></CardContent>
          </Card>
        </div>
      );
    }

    if (isStaff) {
      return (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader><CardTitle>{exam.title} — AR (vista docente)</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">El alumno debe mostrar a la cámara la tarjeta que el sistema pida al azar.</p>
              <div className="flex flex-wrap gap-2">{cards.map((c) => <Badge key={c.id} variant="outline">{c.title}</Badge>)}</div>
            </CardContent>
          </Card>
        </div>
      );
    }

    const requestCount = Math.max(5, Math.min(10, cards.length * 3));
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">{exam.title} <Badge variant="secondary">mínimo {exam.min_score}%</Badge></CardTitle>
            <p className="text-sm text-muted-foreground">{exam.description}</p>
          </CardHeader>
          <CardContent>
            <ArExamRunner examId={exam.id} cards={cards} requestCount={requestCount} timeLimitSeconds={(exam.time_limit ?? 15) * 60} minScore={exam.min_score} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // -------- Conectar palabras --------
  const detail = exam.details.find((d) => d.config_type === "categories");
  const categories: string[] = detail ? safeParseArray(detail.config_value) : [];

  let rows = categories.length
    ? await prisma.diccionario.findMany({ where: { categoria: { in: categories }, estado: "activo" }, take: MAX_POOL })
    : await prisma.diccionario.findMany({ where: { estado: "activo", categoria: { not: "" } }, take: MAX_POOL });
  if (rows.length < MIN_POOL) {
    const extra = await prisma.diccionario.findMany({
      where: { estado: "activo", categoria: { not: "" }, id: { notIn: rows.map((w) => w.id) } },
      take: MAX_POOL - rows.length,
    });
    rows = [...rows, ...extra];
  }
  const words = rows
    .filter((w) => (w.aymara || w.espanol) && w.categoria)
    .map((w) => ({ id: w.id, text: (w.aymara || w.espanol)!, category: w.categoria }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">{exam.title} <Badge variant="secondary">mínimo {exam.min_score}%</Badge></CardTitle>
          <p className="text-sm text-muted-foreground">{exam.description}</p>
        </CardHeader>
        <CardContent>
          {isStaff ? (
            <p className="text-sm text-muted-foreground">Vista docente — categorías: {categories.join(", ") || "(todas)"} · {words.length} palabras en el pool.</p>
          ) : (
            <WordMatchGame examId={exam.id} timeLimitSeconds={(exam.time_limit ?? 15) * 60} words={words} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function safeParseArray(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
