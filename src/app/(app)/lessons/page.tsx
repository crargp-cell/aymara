import { prisma } from "@/lib/prisma";
import { getCurrentCurso } from "@/lib/curso";
import { lessonCoverUrl } from "@/lib/lesson-cover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import Link from "next/link";
import Image from "next/image";

export default async function LessonsPage() {
  const curso = await getCurrentCurso();
  const lessons = await prisma.lesson.findMany({
    where: { activo: true, curso },
    orderBy: { orden: "asc" },
  });

  const topicsCount = await prisma.lessonTopic.groupBy({ by: ["lesson_id"], _count: { id: true } });
  const countMap = new Map(topicsCount.map((t) => [t.lesson_id, t._count.id]));

  return (
    <div className="space-y-6">
      <Topbar title="Lecciones" subtitle={`Curso ${curso} — ${lessons.length} lecciones`} />
      {lessons.length === 0 && <p className="text-sm text-muted-foreground">No hay lecciones activas para este curso todavía.</p>}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lessons.map((l) => (
          <Link key={l.id} href={`/lessons/${l.id}`}>
            <Card className="h-full overflow-hidden hover:shadow-glow cursor-pointer">
              <div className="relative h-32 w-full">
                <Image src={lessonCoverUrl(l.orden)} alt={l.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                {l.grants_ar_marker && (
                  <Badge variant="success" className="absolute top-2 right-2">
                    AR
                  </Badge>
                )}
              </div>
              <CardHeader>
                <CardTitle className="text-base line-clamp-2">{l.title}</CardTitle>
                <CardDescription className="line-clamp-2">{l.description ?? "Sin descripción"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Orden {l.orden}</span>
                  <Badge variant="outline">{countMap.get(l.id) ?? 0} temas</Badge>
                </div>
                {l.ar_card_id && <p className="text-xs mt-2 text-primary">Otorga tarjeta AR #{l.ar_card_id}</p>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
