import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/session";
import { maestroParaleloIds } from "@/lib/rbac";
import Link from "next/link";

export default async function ExamReviewPage({ params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const { attemptId } = await params;
  const aid = Number(attemptId);
  if (Number.isNaN(aid)) notFound();

  const user = await requireUser();
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: aid },
    include: {
      exam: { select: { id: true, title: true, min_score: true, paralelo_id: true } },
      details: { orderBy: { id: "asc" } },
      alumno: { select: { nombre: true, apellido: true, username: true } },
    },
  });
  if (!attempt) notFound();

  // El alumno ve sólo lo suyo; el maestro/admin, lo de sus paralelos (Negocio.md §23).
  const isOwner = attempt.alumno_id === user.id;
  const isStaff = user.role !== "estudiante" && (user.role === "admin" || (await maestroParaleloIds(user.id)).includes(attempt.exam.paralelo_id));
  if (!isOwner && !isStaff) notFound();

  const correct = attempt.details.filter((d) => d.is_correct).length;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {attempt.exam.title}
            <Badge variant={attempt.passed ? "success" : "destructive"}>{attempt.passed ? "Aprobado" : "No aprobado"}</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isStaff && !isOwner ? `${attempt.alumno.nombre ?? attempt.alumno.username} · ` : ""}
            Intento {attempt.attempt_no} · nota {Number(attempt.score)}% (mínimo {attempt.exam.min_score}%) · {Math.round(attempt.time_spent_ms / 1000)}s · {correct}/{attempt.details.length} correctas
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {attempt.details.map((d) => (
            <div key={d.id} className="glass rounded-xl px-4 py-2 flex items-center justify-between text-sm">
              <span>{d.item_ref}</span>
              <span className="flex items-center gap-2 text-xs">
                {d.respuesta && <span className="text-muted-foreground">respondió: {d.respuesta}</span>}
                {!d.is_correct && d.expected && <span className="text-muted-foreground">esperado: {d.expected}</span>}
                <Badge variant={d.is_correct ? "success" : "destructive"}>{d.is_correct ? "✓" : "✗"}</Badge>
              </span>
            </div>
          ))}
          {attempt.details.length === 0 && <p className="text-sm text-muted-foreground">Sin detalle por ítem para este intento.</p>}
        </CardContent>
      </Card>
      <Link href="/exams/history"><Button variant="outline">Volver al historial</Button></Link>
    </div>
  );
}
