import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/layout/Topbar";
import Link from "next/link";

export default async function ExamsPage() {
  const exams = await prisma.exam.findMany({ where: { active: true }, orderBy: { id: "asc" } });
  const details = await prisma.examDetail.findMany();
  const map = new Map(details.map((d) => [d.exam_id, d]));

  return (
    <div className="space-y-6">
      <Topbar title="Exámenes" subtitle={`${exams.length} exámenes disponibles`} />
      <Link href="/exams/history" className="text-sm text-primary hover:underline">
        Ver historial de exámenes →
      </Link>
      <div className="grid md:grid-cols-2 gap-4">
        {exams.map((e) => {
          const d = map.get(e.id);
          return (
            <Card key={e.id} className="hover:shadow-glow">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  {e.title}
                  <Badge variant={e.type === "ar_exam" ? "success" : "secondary"}>{e.type}</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">{e.description ?? "Sin descripción"}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-2 text-xs">
                  <Badge variant="outline">Tiempo {e.time_limit ?? 5} min</Badge>
                  <Badge variant="outline">Min {e.min_score ?? 70}%</Badge>
                </div>
                {d && <p className="text-xs text-muted-foreground">Config: {d.config_type} — {d.config_value.slice(0, 50)}</p>}
                <Link href={`/exams/${e.id}`}>
                  <Button variant="gradient" size="sm" className="w-full">
                    {e.type === "ar_exam" ? "Examen AR" : "Iniciar"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
