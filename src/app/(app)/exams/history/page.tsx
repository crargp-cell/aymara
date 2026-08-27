import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import Link from "next/link";

export default async function ExamHistoryPage() {
  const session = await auth();
  const userId = Number((session?.user as any)?.id ?? 0);
  if (!userId) redirect("/login");

  const results = await prisma.examResult.findMany({
    where: { user_id: userId },
    orderBy: { id: "desc" },
    take: 50,
  });
  const examIds = [...new Set(results.map((r) => r.exam_id).filter((id): id is number => id != null))];
  const exams = await prisma.exam.findMany({ where: { id: { in: examIds } } });
  const examMap = new Map(exams.map((e) => [e.id, e]));

  return (
    <div className="space-y-6">
      <Topbar title="Historial de exámenes" subtitle={`${results.length} intentos registrados`} />
      <Link href="/exams" className="text-sm text-primary hover:underline">
        ← Volver a exámenes
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {results.length === 0 && <p className="text-sm text-muted-foreground">Todavía no rendiste ningún examen.</p>}
          {results.map((r) => {
            const exam = r.exam_id ? examMap.get(r.exam_id) : undefined;
            return (
              <div key={r.id} className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium">{exam?.title ?? `Examen #${r.exam_id ?? "?"}`}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.correct_matches ?? 0}/{r.total_words ?? 0} correctas · {Number(r.time_spent ?? 0)}s
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{r.score ?? 0}%</Badge>
                  <Badge variant={r.passed ? "success" : "destructive"}>{r.passed ? "Aprobado" : "No aprobado"}</Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
