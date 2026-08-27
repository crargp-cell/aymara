import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function ExamHistoryPage() {
  const user = await requireUser();

  const attempts = await prisma.examAttempt.findMany({
    where: { alumno_id: user.id, completed_at: { not: null } },
    orderBy: { completed_at: "desc" },
    take: 60,
    include: { exam: { select: { id: true, title: true, type: true, min_score: true } } },
  });

  return (
    <div className="space-y-6">
      <Topbar title="Historial de exámenes" subtitle={`${attempts.length} intentos`} />
      <Link href="/exams" className="text-sm text-primary hover:underline">← Volver a exámenes</Link>
      <Card>
        <CardHeader><CardTitle className="text-base">Intentos</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {attempts.length === 0 && <p className="text-sm text-muted-foreground">Todavía no rendiste ningún examen.</p>}
          {attempts.map((a) => (
            <div key={a.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-medium">{a.exam.title} <span className="text-xs text-muted-foreground">· intento {a.attempt_no}</span></p>
                <p className="text-xs text-muted-foreground">{a.exam.type} · {Math.round(a.time_spent_ms / 1000)}s · {a.completed_at?.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{Number(a.score)}%</Badge>
                <Badge variant={a.passed ? "success" : "destructive"}>{a.passed ? "Aprobado" : "No aprobado"}</Badge>
                <Link href={`/exams/${a.exam.id}/review/${a.id}`}><Button size="sm" variant="outline">Revisar</Button></Link>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
