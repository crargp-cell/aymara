import { requireUser } from "@/lib/session";
import { getStudentBoard } from "@/lib/student-board";
import { Topbar } from "@/components/layout/Topbar";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, Lock, FileQuestion, BookOpen, Sparkles } from "lucide-react";

function position(i: number) {
  const x = 50 + Math.sin(i * 1.1) * 28;
  const y = i * 140;
  return { x, y };
}

export default async function MapPage() {
  const user = await requireUser();
  const board = await getStudentBoard(user.id);

  if (!board.paralelo) {
    return (
      <div className="space-y-6">
        <Topbar title="Mapa de niveles" />
        <p className="text-sm text-muted-foreground">Aún no estás inscrito en un paralelo.</p>
      </div>
    );
  }

  const nodes = board.nodes;
  const total = nodes.length;
  const done = board.totalDone;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const height = Math.max(600, nodes.length * 140 + 120);

  return (
    <div className="space-y-6">
      <Topbar title="Mapa de niveles" subtitle={`${board.paralelo.nombre} · ${done}/${total} completados`} />

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
            const segmentDone = nodes[i - 1].done;
            return (
              <line
                key={n.key}
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
          const isExam = n.type === "exam";
          const href = isExam ? `/exams/${n.id}` : `/lessons/${n.id}`;
          const cls = n.done
            ? "bg-emerald-500 text-white border-emerald-300 shadow-lg"
            : !n.unlocked
              ? "bg-slate-700/80 text-slate-400 border-white/10"
              : isExam
                ? "border-amber-300 text-amber-300 shadow-glow"
                : "border-primary text-foreground shadow-glow";

          const content = (
            <>
              <div className={`relative h-20 w-20 rounded-full flex items-center justify-center text-lg font-bold border-4 transition-all glass ${cls} ${n.unlocked && !n.done ? "animate-float" : ""}`}>
                {n.done ? <CheckCircle2 className="h-8 w-8" /> : !n.unlocked ? <Lock className="h-6 w-6" /> : isExam ? <FileQuestion className="h-7 w-7" /> : <span>{i + 1}</span>}
                {n.unlocked && !n.done && <span className="absolute inset-0 rounded-full border-2 border-primary/50 animate-ping" />}
              </div>
              <div className={`glass rounded-lg px-2 py-1 text-xs text-center max-w-[130px] leading-tight ${!n.unlocked ? "opacity-60" : ""}`}>
                <p className="font-medium line-clamp-1 flex items-center justify-center gap-1">
                  {isExam ? (n.examType === "ar_exam" ? <Sparkles className="h-3 w-3 shrink-0" /> : <FileQuestion className="h-3 w-3 shrink-0" />) : <BookOpen className="h-3 w-3 shrink-0" />}
                  {n.title}
                </p>
              </div>
              {!n.unlocked && <span className="sr-only">Bloqueado — {n.lockReason}</span>}
            </>
          );

          if (!n.unlocked) {
            return (
              <span key={n.key} className="absolute flex flex-col items-center gap-1 cursor-not-allowed" style={{ left: `${pos.x}%`, top: pos.y, transform: "translateX(-50%)" }} aria-disabled="true">
                {content}
              </span>
            );
          }
          return (
            <Link key={n.key} href={href} className="absolute flex flex-col items-center gap-1 transition-all hover:-translate-y-1 hover:scale-105" style={{ left: `${pos.x}%`, top: pos.y, transform: "translateX(-50%)" }}>
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
