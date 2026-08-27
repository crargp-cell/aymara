import { prisma } from "@/lib/prisma";
import { getCurrentCurso } from "@/lib/curso";
import { lessonCoverUrl } from "@/lib/lesson-cover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import Link from "next/link";
import Image from "next/image";

export default async function TopicsPage() {
  const curso = await getCurrentCurso();
  const lessons = await prisma.lesson.findMany({ where: { activo: true, curso }, orderBy: { orden: "asc" } });
  const topics = await prisma.lessonTopic.findMany({
    where: { lesson_id: { in: lessons.map((l) => l.id) }, activo: true },
    orderBy: [{ lesson_id: "asc" }, { order: "asc" }],
  });
  const topicsByLesson = new Map<number, typeof topics>();
  for (const t of topics) {
    const list = topicsByLesson.get(t.lesson_id) ?? [];
    list.push(t);
    topicsByLesson.set(t.lesson_id, list);
  }

  return (
    <div className="space-y-6">
      <Topbar title="Temas" subtitle={`Curso ${curso} — ${topics.length} temas de lectura`} />
      {lessons.length === 0 && <p className="text-sm text-muted-foreground">No hay lecciones activas para este curso todavía.</p>}
      <div className="space-y-6">
        {lessons.map((lesson) => {
          const lessonTopics = topicsByLesson.get(lesson.id) ?? [];
          if (lessonTopics.length === 0) return null;
          return (
            <Card key={lesson.id} className="overflow-hidden">
              <div className="relative h-28 w-full">
                <Image src={lessonCoverUrl(lesson.orden)} alt={lesson.title} fill sizes="100vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
                  <h2 className="text-white font-semibold text-lg drop-shadow">{lesson.title}</h2>
                </div>
              </div>
              <CardContent className="space-y-2 pt-4">
                {lessonTopics.map((t) => (
                  <Link key={t.id} href={`/topics/${t.id}`} className="flex items-center justify-between glass rounded-xl px-4 py-3 hover:shadow-glow transition">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{t.content ? t.content.slice(0, 90) : "Sin contenido"}</p>
                    </div>
                    <Badge variant="outline" className="ml-3 shrink-0">
                      Leer
                    </Badge>
                  </Link>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
