import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import { revalidatePath } from "next/cache";
import { lessonCoverUrl } from "@/lib/lesson-cover";
import { getAlphabetCards } from "@/lib/alphabet-gallery";

export default async function TopicViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const topicId = Number(id);
  if (Number.isNaN(topicId)) notFound();
  const topic = await prisma.lessonTopic.findUnique({ where: { id: topicId } });
  if (!topic) notFound();
  const lesson = await prisma.lesson.findUnique({ where: { id: topic.lesson_id } });

  const session = await auth();
  const userId = Number((session?.user as any)?.id ?? 0);
  const reading = userId ? await prisma.topicReading.findFirst({ where: { user_id: userId, topic_id: topicId } }) : null;
  const completed = !!reading?.reading_completed;

  const isAlphabetTopic = /alfabeto/i.test(topic.title);
  const alphabetCards = isAlphabetTopic ? await getAlphabetCards() : [];

  async function markCompleted() {
    "use server";
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) return;
    const existing = await prisma.topicReading.findFirst({ where: { user_id: Number(userId), topic_id: topicId } });
    if (existing) {
      await prisma.topicReading.update({ where: { id: existing.id }, data: { reading_completed: true, reading_completed_at: new Date() } });
    } else {
      await prisma.topicReading.create({
        data: {
          user_id: Number(userId),
          topic_id: topicId,
          lesson_id: topic!.lesson_id,
          reading_completed: true,
          reading_started_at: new Date(),
          reading_completed_at: new Date(),
        },
      });
    }
    revalidatePath(`/topics/${topicId}`);
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Card className="overflow-hidden">
        <div className="relative h-32 w-full">
          <Image src={lessonCoverUrl(lesson?.orden ?? 1)} alt={topic.title} fill sizes="768px" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        </div>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {topic.title}
            {completed && <Badge variant="success">Completado</Badge>}
          </CardTitle>
          <p className="text-sm text-muted-foreground">Lección: {lesson?.title ?? topic.lesson_id}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {topic.content ? <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">{topic.content}</div> : <p className="text-sm text-muted-foreground">Sin contenido textual</p>}

          {isAlphabetTopic && (
            <div className="space-y-3">
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-2">El aparato fonador — dónde se pronuncia cada consonante</p>
                <div className="relative w-full aspect-[4/5] max-w-xs mx-auto">
                  <Image src="/alphabet/aparato_fonador.png" alt="Diagrama del aparato fonador con los puntos de articulación del aymara" fill sizes="320px" className="object-contain" />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Abecedario ilustrado — una palabra por letra</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {alphabetCards.map((c) => (
                    <div key={c.url} className="glass rounded-lg overflow-hidden relative aspect-[1/2]">
                      <Image src={c.url} alt={c.label} fill sizes="150px" className="object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!completed && (
            <form action={markCompleted}>
              <Button variant="gradient" type="submit">
                Marcar como completado
              </Button>
            </form>
          )}
          <Link href={`/lessons/${topic.lesson_id}`} className="inline-block mt-2">
            <Button variant="outline">Volver a lección</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
