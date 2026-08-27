import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!["maestro", "admin"].includes(role)) redirect("/dashboard");
  const myCurso = Number((session?.user as any)?.curso ?? 1);

  const { id } = await params;
  const uid = Number(id);
  if (Number.isNaN(uid)) notFound();
  const user = await prisma.usuario.findUnique({ where: { id: uid } });
  if (!user) notFound();
  if (role !== "admin" && user.curso !== myCurso) notFound();

  const progress = await prisma.userProgress.findMany({ where: { user_id: uid }, orderBy: { date: "desc" }, take: 10 });
  const attempts = await prisma.exerciseAttempt.findMany({ where: { user_id: uid }, orderBy: { created_at: "desc" }, take: 10 });
  const arCards = await prisma.userArCard.findMany({ where: { user_id: uid } });
  const examResults = await prisma.examResult.findMany({ where: { user_id: uid }, orderBy: { created_at: "desc" }, take: 10 });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="glass rounded-2xl p-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{user.username}</h1>
          <p className="text-sm text-muted-foreground">{user.email ?? "sin email"} · {user.role} · Curso {user.curso}</p>
        </div>
        <a href={`/api/reports/student/${uid}/pdf`}>
          <Button variant="gradient">Generar PDF</Button>
        </a>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progreso ({progress.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {progress.map((p) => (
              <div key={p.id} className="glass rounded-xl px-4 py-3 text-sm flex items-center justify-between">
                <span>Lección {p.lesson_id} · {p.date.toISOString().slice(0, 10)}</span>
                <Badge variant={p.completed ? "success" : "secondary"}>{p.completed ? "completado" : "en curso"}</Badge>
              </div>
            ))}
            {progress.length === 0 && <p className="text-sm text-muted-foreground">Sin progreso</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tarjetas AR ({arCards.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {arCards.map((c) => (
              <div key={c.id} className="glass rounded-xl px-4 py-3 text-sm">
                Card {c.ar_card_id} · {c.unlocked_by} · {c.unlocked_at?.toISOString().slice(0, 10)}
              </div>
            ))}
            {arCards.length === 0 && <p className="text-sm text-muted-foreground">Sin tarjetas</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Intentos ejercicios ({attempts.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {attempts.map((a) => (
            <div key={a.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between text-sm">
              <span>Ex {a.exercise_id} · {a.exercise_type}</span>
              <Badge variant={a.is_correct ? "success" : "destructive"}>{a.is_correct ? "correcto" : a.error_type ?? "fallo"}</Badge>
            </div>
          ))}
          {attempts.length === 0 && <p className="text-sm text-muted-foreground">Sin intentos</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exámenes ({examResults.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {examResults.map((e) => (
            <div key={e.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between text-sm">
              <span>Exam {e.exam_id} · Score {e.score}</span>
              <Badge variant={e.passed ? "success" : "destructive"}>{e.passed ? "aprobado" : "reprobado"}</Badge>
            </div>
          ))}
          {examResults.length === 0 && <p className="text-sm text-muted-foreground">Sin exámenes</p>}
        </CardContent>
      </Card>
    </div>
  );
}
