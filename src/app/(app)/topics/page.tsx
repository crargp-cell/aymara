import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getParaleloActivoAlumno, getParaleloSeleccionado } from "@/lib/paralelo";
import { lessonCoverUrl } from "@/lib/lesson-cover";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import { SinParalelo } from "@/components/layout/SinParalelo";
import Link from "next/link";
import Image from "next/image";

export default async function TopicsPage() {
  const user = await requireUser();
  const paralelo = user.role === "estudiante" ? await getParaleloActivoAlumno(user.id) : (await getParaleloSeleccionado(user.role, user.id)).actual;

  if (!paralelo) {
    return (
      <div className="space-y-6">
        <Topbar title="Temas" />
        <SinParalelo esDocente={user.role !== "estudiante"} volverA="/topics" />
      </div>
    );
  }

  const lessons = await prisma.lesson.findMany({ where: { paralelo_id: paralelo.id, estado: "activo" }, orderBy: { orden: "asc" } });
  const topics = await prisma.lessonTopic.findMany({
    where: { lesson_id: { in: lessons.map((l) => l.id) }, estado: "activo" },
    orderBy: [{ lesson_id: "asc" }, { order: "asc" }],
    include: { archivo: true },
  });
  const byLesson = new Map<number, typeof topics>();
  for (const t of topics) {
    const list = byLesson.get(t.lesson_id) ?? [];
    list.push(t);
    byLesson.set(t.lesson_id, list);
  }

  return (
    <div className="space-y-6">
      <Topbar title="Temas" subtitle={`${paralelo.nombre} — ${topics.length} temas de lectura`} />
      <div className="space-y-6">
        {lessons.map((lesson) => {
          const list = byLesson.get(lesson.id) ?? [];
          if (list.length === 0) return null;
          return (
            <Card key={lesson.id} className="overflow-hidden">
              <div className="relative h-28 w-full">
                <Image src={lessonCoverUrl(lesson.orden)} alt={lesson.title} fill sizes="100vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
                  <h2 className="text-white font-semibold text-lg drop-shadow">{lesson.title}</h2>
                </div>
              </div>
              <CardContent className="space-y-2 pt-4">
                {list.map((t) => (
                  <Link key={t.id} href={`/topics/${t.id}`} className="flex items-center justify-between panel rounded-xl px-4 py-3 tarjeta-activa">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{t.content ? t.content.slice(0, 90) : "Material PDF"}</p>
                    </div>
                    <div className="flex gap-2 shrink-0 ml-3">
                      {t.archivo && <Badge variant="outline">PDF</Badge>}
                      <Badge variant="outline">Leer</Badge>
                    </div>
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
