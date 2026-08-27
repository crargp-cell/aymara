import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getCurrentCurso } from "@/lib/curso";
import { ensureContentOrder } from "@/lib/content-order";
import { Topbar } from "@/components/layout/Topbar";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Lock, FileQuestion, BookOpen } from "lucide-react";

type Node = {
  id: string;
  type: "lesson" | "exam";
  dbId: number;
  title: string;
  orden: number;
  examLessonId: number | null;
};

function position(i: number) {
  const x = 50 + Math.sin(i * 1.1) * 28;
  const y = i * 140;
  return { x, y };
}

export default async function MapPage() {
  const session = await auth();
  const userId = Number((session?.user as any)?.id ?? 0);
  const curso = await getCurrentCurso();

  await ensureContentOrder(curso);
  const ordered = await prisma.contentOrder.findMany({ where: { curso_id: curso }, orderBy: { orden: "asc" } });
  const nodes: Node[] = [];
  const now = new Date();

  for (const o of ordered) {
    if (o.content_type === "lesson") {
      const l = await prisma.lesson.findUnique({ where: { id: o.content_id } });
      if (l) nodes.push({ id: `lesson-${l.id}`, type: "lesson", dbId: l.id, title: l.title, orden: o.orden, examLessonId: null });
    } else {
      const e = await prisma.exam.findUnique({ where: { id: o.content_id } });
      if (!e) continue;
      // Ventana de disponibilidad: el examen desaparece del mapa fuera de start_date/end_date.
      if (e.start_date && now < e.start_date) continue;
      if (now > e.end_date) continue;
      nodes.push({ id: `exam-${e.id}`, type: "exam", dbId: e.id, title: e.title, orden: o.orden, examLessonId: e.lesson_id ?? null });
    }
  }

  const progress = await prisma.userProgress.findMany({ where: { user_id: userId, completed: true } });
  const completedLessonIds = new Set(progress.map((p) => p.lesson_id));
  const attempts = await prisma.examAttempt.findMany({ where: { user_id: userId, passed: true } });
  const passedExamIds = new Set(attempts.map((a) => a.exam_id));

  const isNodeDone = (n: Node) => (n.type === "lesson" ? completedLessonIds.has(n.dbId) : passedExamIds.has(n.dbId));

  // Los exámenes no bloquean el progreso: solo las lecciones anteriores cuentan para desbloquear
  // el siguiente nodo. Un examen con "lesson_id" (requisito) se desbloquea cuando esa lección
  // puntual está completada, sin importar su posición en la secuencia.
  const isNodeUnlocked = (n: Node, i: number) => {
    if (isNodeDone(n)) return true;
    if (n.type === "exam" && n.examLessonId) return completedLessonIds.has(n.examLessonId);
    const previousLessons = nodes.slice(0, i).filter((p) => p.type === "lesson");
    return previousLessons.every((p) => completedLessonIds.has(p.dbId));
  };

  const total = nodes.length;
  const done = nodes.filter(isNodeDone).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const height = Math.max(600, nodes.length * 140 + 120);

  return (
    <div className="space-y-6">
      <Topbar title="Mapa de Juego" subtitle={`${done}/${total} completados`} />
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm">Progreso</span>
          <span className="text-sm font-medium">{pct}%</span>
        </div>
        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full transition-all" style={{ width: `${pct}%`, background: "var(--gradient-primary)" }} />
        </div>
      </div>

      <div className="relative glass rounded-2xl p-6 overflow-hidden" style={{ height }}>
        <div className="absolute inset-0 -z-10">
          <Image src="/covers/1.jpg" alt="" fill sizes="100vw" className="object-cover opacity-[0.08] blur-sm" />
        </div>

        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ height }}>
          {nodes.map((n, i) => {
            if (i === 0) return null;
            const a = position(i - 1);
            const b = position(i);
            const segmentDone = isNodeDone(nodes[i - 1]);
            return (
              <line
                key={n.id}
                x1={`${a.x}%`}
                y1={a.y + 44}
                x2={`${b.x}%`}
                y2={b.y + 44}
                stroke={segmentDone ? "#10b981" : "rgba(255,255,255,0.18)"}
                strokeWidth={6}
                strokeLinecap="round"
                strokeDasharray={segmentDone ? undefined : "2 14"}
              />
            );
          })}
        </svg>
        {nodes.map((n, i) => {
          const pos = position(i);
          const isDone = isNodeDone(n);
          const locked = !isNodeUnlocked(n, i);
          const isExam = n.type === "exam";
          const href = n.type === "lesson" ? `/lessons/${n.dbId}` : `/exams/${n.dbId}`;

          const nodeClasses = isDone
            ? "bg-emerald-500 text-white border-emerald-300 shadow-lg"
            : locked
              ? "bg-slate-700/80 text-slate-400 border-white/10"
              : isExam
                ? "border-amber-300 text-amber-300 shadow-glow"
                : "border-primary text-foreground shadow-glow";

          const content = (
            <>
              <div className={`relative h-20 w-20 rounded-full flex items-center justify-center text-lg font-bold border-4 transition-all glass ${nodeClasses} ${!locked && !isDone ? "animate-float" : ""}`}>
                {isDone ? <CheckCircle2 className="h-8 w-8" /> : locked ? <Lock className="h-6 w-6" /> : isExam ? <FileQuestion className="h-7 w-7" /> : <span>{i + 1}</span>}
                {!locked && !isDone && <span className="absolute inset-0 rounded-full border-2 border-primary/50 animate-ping" />}
              </div>
              <div className={`glass rounded-lg px-2 py-1 text-xs text-center max-w-[130px] leading-tight ${locked ? "opacity-60" : ""}`}>
                <p className="font-medium line-clamp-1 flex items-center justify-center gap-1">
                  {isExam ? <FileQuestion className="h-3 w-3 shrink-0" /> : <BookOpen className="h-3 w-3 shrink-0" />}
                  {n.title}
                </p>
              </div>
              {locked && <span className="sr-only">Bloqueado — completa el contenido anterior primero</span>}
            </>
          );
          if (locked) {
            return (
              <span
                key={n.id}
                className="absolute flex flex-col items-center gap-1 cursor-not-allowed"
                style={{ left: `${pos.x}%`, top: pos.y, transform: "translateX(-50%)" }}
                aria-disabled="true"
              >
                {content}
              </span>
            );
          }
          return (
            <Link
              key={n.id}
              href={href}
              className="absolute flex flex-col items-center gap-1 transition-all hover:-translate-y-1 hover:scale-105"
              style={{ left: `${pos.x}%`, top: pos.y, transform: "translateX(-50%)" }}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
