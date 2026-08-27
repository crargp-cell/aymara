import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { lessonCoverUrl } from "@/lib/lesson-cover";

export default async function LessonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lessonId = Number(id);
  if (Number.isNaN(lessonId)) notFound();
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) notFound();
  const topics = await prisma.lessonTopic.findMany({ where: { lesson_id: lessonId, activo: true }, orderBy: { order: "asc" } });
  const exercises = await prisma.exercise.findMany({ where: { lesson_id: lessonId, activo: true }, orderBy: { id: "asc" } });

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl overflow-hidden">
        <div className="relative h-40 w-full">
          <Image src={lessonCoverUrl(lesson.orden)} alt={lesson.title} fill sizes="100vw" priority className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6">
            <h1 className="text-2xl font-bold text-white drop-shadow">{lesson.title}</h1>
            <p className="text-sm text-white/80 mt-1">{lesson.description}</p>
          </div>
        </div>
        <div className="flex gap-2 p-4">
          <Badge variant="outline">Curso {lesson.curso}</Badge>
          <Badge variant="secondary">Orden {lesson.orden}</Badge>
          {lesson.grants_ar_marker && <Badge variant="success">Recompensa AR</Badge>}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Temas ({topics.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topics.length === 0 && <p className="text-sm text-muted-foreground">Sin temas</p>}
            {topics.map((t) => (
              <Link key={t.id} href={`/topics/${t.id}`} className="flex items-center justify-between glass rounded-xl px-4 py-3 hover:shadow-glow transition">
                <div>
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{t.content ? t.content.slice(0, 80) : "Sin contenido"}</p>
                </div>
                <Button size="sm" variant="outline">
                  Ver
                </Button>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ejercicios ({exercises.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {exercises.map((e) => (
              <Link key={e.id} href={`/play/${lesson.id}/${e.id}`} className="flex items-center justify-between glass rounded-xl px-4 py-3 hover:shadow-glow transition">
                <div className="flex-1">
                  <p className="text-sm font-medium line-clamp-1">{e.question}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {e.type}
                    </Badge>
                    <Badge variant={e.dificultad === "dificil" ? "destructive" : e.dificultad === "medio" ? "warning" : "secondary"}>{e.dificultad}</Badge>
                  </div>
                </div>
                <Button size="sm" variant="gradient">
                  Jugar
                </Button>
              </Link>
            ))}
            {exercises.length === 0 && <p className="text-sm text-muted-foreground">Sin ejercicios</p>}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Link href="/lessons">
          <Button variant="outline">Volver</Button>
        </Link>
        <Link href="/map">
          <Button variant="secondary">Ver en mapa</Button>
        </Link>
      </div>
    </div>
  );
}
