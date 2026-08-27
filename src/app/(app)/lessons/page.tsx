import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getParaleloSeleccionado } from "@/lib/paralelo";
import { getStudentBoard } from "@/lib/student-board";
import { lessonCoverUrl } from "@/lib/lesson-cover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import { SinParalelo } from "@/components/layout/SinParalelo";
import Link from "next/link";
import Image from "next/image";
import { Lock, CheckCircle2 } from "lucide-react";

export default async function LessonsPage() {
  const user = await requireUser();

  if (user.role === "estudiante") {
    const board = await getStudentBoard(user.id);
    if (!board.paralelo) {
      return (
        <div className="space-y-6">
          <Topbar title="Lecciones" />
          <p className="text-sm text-muted-foreground">Aún no estás inscrito en un paralelo. Pide al administrador que te inscriba.</p>
        </div>
      );
    }
    const lessonNodes = board.nodes.filter((n) => n.type === "lesson");
    const lessons = await prisma.lesson.findMany({ where: { id: { in: lessonNodes.map((n) => n.id) } } });
    const lessonMap = new Map(lessons.map((l) => [l.id, l]));
    const counts = await prisma.lessonTopic.groupBy({ by: ["lesson_id"], where: { lesson_id: { in: lessonNodes.map((n) => n.id) }, estado: "activo" }, _count: { id: true } });
    const countMap = new Map(counts.map((c) => [c.lesson_id, c._count.id]));

    return (
      <div className="space-y-6">
        <Topbar title="Lecciones" subtitle={`${board.paralelo.nombre} · ${lessonNodes.length} niveles`} />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lessonNodes.map((n) => {
            const l = lessonMap.get(n.id);
            if (!l) return null;
            const inner = (
              <Card className={`h-full overflow-hidden ${n.unlocked ? "hover:shadow-glow cursor-pointer" : "opacity-60"}`}>
                <div className="relative h-32 w-full">
                  <Image src={lessonCoverUrl(l.orden)} alt={l.title} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {n.done && <Badge variant="success" className="absolute top-2 right-2"><CheckCircle2 className="h-3 w-3 mr-1" />hecho</Badge>}
                  {!n.unlocked && <Badge variant="secondary" className="absolute top-2 right-2"><Lock className="h-3 w-3 mr-1" />bloqueado</Badge>}
                </div>
                <CardHeader>
                  <CardTitle className="text-base line-clamp-2">#{l.orden} · {l.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{l.description ?? "Sin descripción"}</CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>Mínimo {l.min_correct} correctos</span>
                  <Badge variant="outline">{countMap.get(l.id) ?? 0} tema(s)</Badge>
                </CardContent>
              </Card>
            );
            return n.unlocked ? (
              <Link key={n.key} href={`/lessons/${l.id}`}>{inner}</Link>
            ) : (
              <div key={n.key} aria-disabled className="cursor-not-allowed">{inner}</div>
            );
          })}
        </div>
      </div>
    );
  }

  // maestro / admin: vista de sólo lectura del paralelo en foco
  const { actual } = await getParaleloSeleccionado(user.role, user.id);
  if (!actual) {
    return (
      <div className="space-y-6">
        <Topbar title="Lecciones" />
        <SinParalelo esDocente volverA="/lessons" />
      </div>
    );
  }
  const lessons = await prisma.lesson.findMany({
    where: { paralelo_id: actual.id },
    orderBy: { orden: "asc" },
    include: { _count: { select: { topics: true } } },
  });
  return (
    <div className="space-y-6">
      <Topbar title="Lecciones" subtitle={`Vista del paralelo ${actual.nombre}`} />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lessons.map((l) => (
          <Link key={l.id} href={`/lessons/${l.id}`}>
            <Card className="h-full overflow-hidden hover:shadow-glow">
              <CardHeader>
                <CardTitle className="text-base line-clamp-2">#{l.orden} · {l.title}</CardTitle>
                <CardDescription className="line-clamp-2">{l.description ?? ""}</CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">{l._count.topics} tema(s) · estado {l.estado}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
