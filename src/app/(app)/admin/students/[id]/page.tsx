import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/session";
import { maestroParaleloIds } from "@/lib/rbac";
import { getHistorialInscripciones } from "@/lib/paralelo";
import { badgeVariantAlumno } from "@/lib/estado";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["maestro", "admin"]);
  const { id } = await params;
  const uid = Number(id);
  if (Number.isNaN(uid)) notFound();

  const alumno = await prisma.usuario.findUnique({ where: { id: uid } });
  if (!alumno || alumno.role !== "estudiante") notFound();

  // Un maestro sólo ve alumnos que estén (o hayan estado) en alguno de sus paralelos.
  if (user.role === "maestro") {
    const misParalelos = await maestroParaleloIds(user.id);
    const enMisParalelos = await prisma.inscripcion.count({ where: { alumno_id: uid, paralelo_id: { in: misParalelos } } });
    if (enMisParalelos === 0) notFound();
  }

  const [historial, progreso, lessonAttempts, examAttempts, arCards, logros] = await Promise.all([
    getHistorialInscripciones(uid),
    prisma.userProgress.findMany({ where: { alumno_id: uid }, orderBy: { updated_at: "desc" }, take: 20 }),
    prisma.lessonAttempt.findMany({ where: { alumno_id: uid }, orderBy: { started_at: "desc" }, take: 15, include: { lesson: { select: { title: true } } } }),
    prisma.examAttempt.findMany({ where: { alumno_id: uid, completed_at: { not: null } }, orderBy: { completed_at: "desc" }, take: 15, include: { exam: { select: { title: true } } } }),
    prisma.userArCard.findMany({ where: { alumno_id: uid }, include: { ar_card: { select: { title: true, card_code: true } } } }),
    prisma.logroAlumno.findMany({ where: { alumno_id: uid }, include: { logro: true } }),
  ]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="glass rounded-2xl p-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{[alumno.nombre, alumno.apellido].filter(Boolean).join(" ") || alumno.username}</h1>
          <p className="text-sm text-muted-foreground">@{alumno.username} · {alumno.email ?? "sin email"} · {alumno.codigo_estudiante ?? "sin código"}</p>
        </div>
        <a href={`/api/reports/student/${uid}/pdf`}><Button variant="gradient">Reporte PDF</Button></a>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Historial académico ({historial.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {historial.map((h) => (
            <div key={h.id} className="glass rounded-xl px-4 py-2 flex items-center justify-between text-sm">
              <span>{h.paralelo.gestion.nombre} · {h.paralelo.grado.nombre} "{h.paralelo.nombre}"</span>
              <span className="flex items-center gap-2">
                <Badge variant={badgeVariantAlumno(h.estado)}>{h.estado}</Badge>
                <span className="text-xs text-muted-foreground">{h.fecha_inscripcion.toLocaleDateString()}{h.fecha_baja ? ` – ${h.fecha_baja.toLocaleDateString()}` : ""}</span>
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Lecciones ({progreso.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {progreso.map((p) => (
              <div key={p.id} className="glass rounded-xl px-4 py-2 text-sm flex items-center justify-between">
                <span>Lección {p.lesson_id}</span>
                <Badge variant={p.completed ? "success" : "secondary"}>{p.completed ? "completada" : `${p.current_index}/${p.total_exercises}`}</Badge>
              </div>
            ))}
            {progreso.length === 0 && <p className="text-sm text-muted-foreground">Sin progreso.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Tarjetas y logros</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {arCards.map((c) => (
              <div key={c.id} className="glass rounded-xl px-4 py-2 flex items-center justify-between">
                <span>{c.ar_card.title ?? c.ar_card.card_code}</span>
                <Badge variant={c.revocado ? "destructive" : "success"}>{c.revocado ? "revocada" : c.unlocked_by}</Badge>
              </div>
            ))}
            {logros.map((l) => (
              <div key={l.id} className="glass rounded-xl px-4 py-2 flex items-center justify-between">
                <span>🏆 {l.logro.nombre}</span>
                <span className="text-xs text-muted-foreground">{l.unlocked_at.toLocaleDateString()}</span>
              </div>
            ))}
            {arCards.length + logros.length === 0 && <p className="text-muted-foreground">Sin recompensas.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Intentos de lección ({lessonAttempts.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {lessonAttempts.map((a) => (
            <div key={a.id} className="glass rounded-xl px-4 py-2 flex items-center justify-between text-sm">
              <span>{a.lesson.title} · intento {a.attempt_no}</span>
              <Badge variant={a.passed ? "success" : "secondary"}>{a.correct_count}/{a.min_required}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Exámenes ({examAttempts.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {examAttempts.map((e) => (
            <div key={e.id} className="glass rounded-xl px-4 py-2 flex items-center justify-between text-sm">
              <span>{e.exam.title} · intento {e.attempt_no}</span>
              <span className="flex items-center gap-2">
                <Badge variant="outline">{Number(e.score)}%</Badge>
                <Badge variant={e.passed ? "success" : "destructive"}>{e.passed ? "aprobado" : "reprobado"}</Badge>
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
