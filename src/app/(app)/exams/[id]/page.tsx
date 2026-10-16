import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WordMatchGame } from "@/components/exam/WordMatchGame";
import { ArExamRunner } from "@/components/exam/ArExamRunner";
import { requireUser } from "@/lib/session";
import { alumnoPuedeRendirExamen, assertMaestroOwnsContent } from "@/lib/rbac";
import { getWordMatchPool, mezclar } from "@/lib/exams/word-match";
import Link from "next/link";

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

  // Un maestro sólo puede probar los exámenes de sus propios paralelos.
  if (isStaff) {
    const { ok } = await assertMaestroOwnsContent(user.role, user.id, "exam", eid);
    if (!ok) notFound();
  }

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
      .map((c) => ({
        id: c.id,
        code: c.card_code,
        title: c.title ?? c.card_code,
        // Por la ruta que lee de la base, no del disco: en Railway el sistema de
        // archivos del contenedor se borra en cada despliegue y estos marcadores
        // se suben desde el panel, así que en disco ya no están.
        markerImageUrl: `/api/ar/file?code=${c.card_code}&type=image`,
        modelUrl: c.card_data ? `/api/ar/file?code=${c.card_code}&type=model` : null,
      }));

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
      <div className="max-w-6xl mx-auto space-y-6 px-2 sm:px-0">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xl sm:text-2xl">{exam.title} <Badge variant="secondary" className="w-fit">mínimo {exam.min_score}%</Badge></CardTitle>
            <p className="text-sm text-muted-foreground">{exam.description}</p>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <ArExamRunner examId={exam.id} cards={cards} requestCount={requestCount} timeLimitSeconds={(exam.time_limit ?? 15) * 60} minScore={exam.min_score} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // -------- Conectar palabras --------
  const { words, categories } = await getWordMatchPool(exam.details);
  // Al alumno se le manda sólo el texto de cada carta y cuántas hay por categoría: a qué categoría
  // pertenece cada una lo decide el servidor al comprobar cada grupo. El maestro (modo prueba) sí las ve.
  const mezcladas = mezclar(words).map((w) => (isStaff ? w : { id: w.id, text: w.text }));
  const porCategoria = new Map<string, string[]>();
  for (const w of words) porCategoria.set(w.category, [...(porCategoria.get(w.category) ?? []), w.text]);
  const categorias = [...porCategoria.entries()].map(([nombre, items]) => ({ nombre, total: items.length }));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">{exam.title} <Badge variant="secondary">mínimo {exam.min_score}%</Badge></CardTitle>
          <p className="text-sm text-muted-foreground">{exam.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <WordMatchGame
            examId={exam.id}
            timeLimitSeconds={(exam.time_limit ?? 15) * 60}
            words={mezcladas}
            categorias={categorias}
            minScore={exam.min_score}
            preview={isStaff}
          />
          {isStaff && (
            <details className="panel rounded-xl p-3 text-sm">
              <summary className="cursor-pointer font-medium">
                Palabras del examen ({words.length}) · categorías: {categories.join(", ") || "(todas)"}
              </summary>
              <div className="grid gap-3 pt-3 sm:grid-cols-2 lg:grid-cols-3">
                {[...porCategoria.entries()].map(([cat, items]) => (
                  <div key={cat}>
                    <p className="font-semibold">{cat} <span className="font-normal text-muted-foreground">({items.length})</span></p>
                    <p className="text-muted-foreground">{items.join(", ")}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
