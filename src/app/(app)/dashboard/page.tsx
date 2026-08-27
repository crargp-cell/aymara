import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getParaleloActivoAlumno, getParalelosDeMaestro } from "@/lib/paralelo";
import { getStudentBoard } from "@/lib/student-board";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { Map, BookOpen, Search, Sparkles, Trophy, FileQuestion } from "lucide-react";

const STUDENT_LINKS = [
  { href: "/map", label: "Mapa", icon: Map },
  { href: "/lessons", label: "Lecciones", icon: BookOpen },
  { href: "/exams", label: "Exámenes", icon: FileQuestion },
  { href: "/ar-cards", label: "Tarjetas", icon: Sparkles },
  { href: "/logros", label: "Logros", icon: Trophy },
  { href: "/dictionary", label: "Diccionario", icon: Search },
];

export default async function DashboardPage() {
  const user = await requireUser();

  if (user.role !== "estudiante") {
    const paralelos = await getParalelosDeMaestro(user.id);
    return (
      <div className="space-y-6">
        <div className="glass rounded-2xl p-6">
          <h1 className="text-xl font-semibold">Hola, {user.name}</h1>
          <p className="text-sm text-muted-foreground">Rol: {user.role}</p>
        </div>
        <Card>
          <CardHeader><CardTitle className="text-sm">Tus paralelos ({paralelos.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {paralelos.length === 0 && <p className="text-sm text-muted-foreground">Sin paralelos asignados.</p>}
            {paralelos.map((p) => (
              <div key={p.id} className="glass rounded-xl px-4 py-3 text-sm flex items-center justify-between">
                <span>{p.gestion} · {p.nombre}</span>
                <Link href="/admin/lessons"><Button size="sm" variant="outline">Gestionar contenido</Button></Link>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/admin/lessons", label: "Lecciones" },
            { href: "/admin/exercises", label: "Ejercicios" },
            { href: "/admin/exams", label: "Exámenes" },
            { href: "/admin/analitica", label: "Analítica" },
          ].map((l) => (
            <Link key={l.href} href={l.href}><Button variant="outline" className="w-full h-16">{l.label}</Button></Link>
          ))}
        </div>
      </div>
    );
  }

  const paralelo = await getParaleloActivoAlumno(user.id);
  const board = paralelo ? await getStudentBoard(user.id) : null;
  const nextNode = board?.nodes.find((n) => n.unlocked && !n.done) ?? null;

  const [lessonsCompleted, exercisesCorrect, examsPassed, tarjetas, logros] = await Promise.all([
    prisma.userProgress.count({ where: { alumno_id: user.id, completed: true } }),
    prisma.exerciseAttempt.count({ where: { alumno_id: user.id, is_correct: true } }),
    prisma.examAttempt.count({ where: { alumno_id: user.id, passed: true } }),
    prisma.userArCard.count({ where: { alumno_id: user.id, revocado: false } }),
    prisma.logroAlumno.count({ where: { alumno_id: user.id } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
        <Image src="/mascota/mascota.png" alt="Mascota Aymara" width={90} height={90} className="animate-float shrink-0" />
        <div>
          <h1 className="text-xl font-semibold">Hola, {user.name}</h1>
          <div className="flex items-center justify-center sm:justify-start gap-1.5 text-sm text-muted-foreground">
            {paralelo ? <>Paralelo <Badge variant="secondary">{paralelo.nombre}</Badge></> : <span>Sin inscripción activa</span>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {[
          { n: lessonsCompleted, l: "Lecciones" },
          { n: exercisesCorrect, l: "Aciertos" },
          { n: examsPassed, l: "Exámenes" },
          { n: tarjetas, l: "Tarjetas AR" },
          { n: logros, l: "Logros" },
        ].map((s) => (
          <Card key={s.l}><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-gradient">{s.n}</p><p className="text-xs text-muted-foreground mt-1">{s.l}</p></CardContent></Card>
        ))}
      </div>

      {nextNode && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Siguiente objetivo</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-sm">{nextNode.type === "exam" ? "Examen: " : "Nivel: "}{nextNode.title}</span>
            <Link href={nextNode.type === "exam" ? `/exams/${nextNode.id}` : `/lessons/${nextNode.id}`}>
              <Button size="sm" variant="gradient">Continuar</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Accesos rápidos</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {STUDENT_LINKS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <Button variant="outline" className="w-full h-16 flex-col gap-1.5"><Icon className="h-5 w-5" /><span className="text-xs">{label}</span></Button>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
