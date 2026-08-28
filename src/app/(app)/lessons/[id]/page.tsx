import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { lessonCoverUrl } from "@/lib/lesson-cover";
import { PdfViewer } from "@/components/topic/PdfViewer";
import { requireUser } from "@/lib/session";
import { alumnoPuedeVerLeccion } from "@/lib/rbac";
import { getOrStartAttempt, lessonExerciseIds } from "@/lib/lesson-flow";

export default async function LessonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lessonId = Number(id);
  if (Number.isNaN(lessonId)) notFound();

  const user = await requireUser();
  const isStaff = user.role !== "estudiante";
  if (!isStaff && !(await alumnoPuedeVerLeccion(user.id, lessonId))) {
    return <p className="text-sm text-muted-foreground">No tienes acceso a esta lección.</p>;
  }

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson) notFound();

  const topics = await prisma.lessonTopic.findMany({
    where: { lesson_id: lessonId, estado: "activo" },
    orderBy: { order: "asc" },
    include: { archivo: true },
  });

  const linkedIds = await lessonExerciseIds(lessonId);
  const exercises = await prisma.exercise.findMany({ where: { id: { in: linkedIds } } });
  const exOrder = new Map(linkedIds.map((id, i) => [id, i]));
  exercises.sort((a, b) => (exOrder.get(a.id) ?? 0) - (exOrder.get(b.id) ?? 0));

  let presentedIds = linkedIds;
  let progress: { completed: boolean; current_index: number; total_exercises: number } | null = null;
  if (!isStaff) {
    const attempt = await getOrStartAttempt(user.id, lessonId);
    presentedIds = attempt.presented_exercise_ids.length ? attempt.presented_exercise_ids : linkedIds;
    progress = await prisma.userProgress.findUnique({
      where: { alumno_id_lesson_id: { alumno_id: user.id, lesson_id: lessonId } },
      select: { completed: true, current_index: true, total_exercises: true },
    });
  }
  const firstExerciseId = presentedIds[0];

  return (
    <div className="space-y-6">
      <div className="panel rounded-2xl overflow-hidden">
        <div className="relative h-40 w-full">
          <Image src={lessonCoverUrl(lesson.orden)} alt={lesson.title} fill sizes="100vw" priority className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6">
            <h1 className="text-2xl font-bold text-white drop-shadow">{lesson.title}</h1>
            <p className="text-sm text-white/80 mt-1">{lesson.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 p-4">
          <Badge variant="secondary">Nivel {lesson.orden}</Badge>
          <Badge variant="outline">Mínimo {lesson.min_correct} correctos</Badge>
          {lesson.present_count ? <Badge variant="outline">Presenta {lesson.present_count}{lesson.random_selection ? " al azar" : ""}</Badge> : null}
          {progress?.completed && <Badge variant="success">Completada</Badge>}
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Teoría</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {topics.length === 0 && <p className="text-sm text-muted-foreground">Sin material teórico.</p>}
            {topics.map((t) => (
              <div key={t.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{t.title}</h3>
                  <Link href={`/topics/${t.id}`}><Button size="sm" variant="outline">Abrir tema</Button></Link>
                </div>
                {t.content && <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">{t.content}</p>}
                {t.archivo && <PdfViewer url={t.archivo.ruta} title={t.archivo.nombre} />}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ejercicios</CardTitle>
            {progress && <p className="text-xs text-muted-foreground">Progreso: {progress.current_index}/{Math.max(progress.total_exercises, presentedIds.length)} correctos</p>}
          </CardHeader>
          <CardContent className="space-y-3">
            {firstExerciseId ? (
              <Link href={`/play/${lesson.id}/${firstExerciseId}`}>
                <Button variant="gradient">{progress?.completed ? "Repasar ejercicios" : progress?.current_index ? "Continuar" : "Comenzar ejercicios"}</Button>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">Esta lección todavía no tiene ejercicios.</p>
            )}
            {isStaff && (
              <div className="space-y-1 pt-2">
                {exercises.map((e, i) => (
                  <Link key={e.id} href={`/play/${lesson.id}/${e.id}`} className="flex items-center justify-between panel rounded-xl px-4 py-2 text-sm hover:shadow-glow">
                    <span className="line-clamp-1">{i + 1}. {e.question}</span>
                    <Badge variant="outline">{e.type}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Link href="/lessons"><Button variant="outline">Volver</Button></Link>
        <Link href="/map"><Button variant="secondary">Ver en mapa</Button></Link>
      </div>
    </div>
  );
}
