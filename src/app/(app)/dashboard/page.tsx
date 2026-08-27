import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentCurso } from "@/lib/curso";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Topbar } from "@/components/layout/Topbar";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { Map, BookOpen, Search, Sparkles } from "lucide-react";

const QUICK_LINKS = [
  { href: "/map", label: "Mapa", icon: Map },
  { href: "/lessons", label: "Lecciones", icon: BookOpen },
  { href: "/dictionary", label: "Diccionario", icon: Search },
  { href: "/ar-cards", label: "AR", icon: Sparkles },
];

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user as any;
  const userId = Number(user?.id ?? 0);
  const cursos = await prisma.curso.findMany({ take: 10 });
  const currentCurso = await getCurrentCurso();
  const role = user?.role;

  const [lessonsCompleted, exercisesCorrect, examsPassed] = await Promise.all([
    prisma.userProgress.count({ where: { user_id: userId, completed: true } }),
    prisma.exerciseAttempt.count({ where: { user_id: userId, is_correct: true } }),
    prisma.examResult.count({ where: { user_id: userId, passed: true } }),
  ]);

  async function setCurso(formData: FormData) {
    "use server";
    const id = Number(formData.get("curso_id"));
    const jar = await cookies();
    jar.set("curso_id", String(id), { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30 });
    revalidatePath("/dashboard");
    revalidatePath("/lessons");
    revalidatePath("/map");
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
        <Image src="/mascota/mascota.png" alt="Mascota Aymara" width={90} height={90} className="animate-float shrink-0" />
        <div>
          <h1 className="text-xl font-semibold">Hola, {user?.name ?? "Usuario"}</h1>
          <div className="flex items-center justify-center sm:justify-start gap-1.5 text-sm text-muted-foreground">
            <span>Rol: {role} · Viendo curso</span>
            <Badge variant="secondary">{currentCurso}</Badge>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-gradient">{lessonsCompleted}</p>
            <p className="text-xs text-muted-foreground mt-1">Lecciones completadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-gradient">{exercisesCorrect}</p>
            <p className="text-xs text-muted-foreground mt-1">Ejercicios correctos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-gradient">{examsPassed}</p>
            <p className="text-xs text-muted-foreground mt-1">Exámenes aprobados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Accesos rápidos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <Button variant="outline" className="w-full h-16 flex-col gap-1.5">
                <Icon className="h-5 w-5" />
                <span className="text-xs">{label}</span>
              </Button>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Cursos disponibles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {cursos.map((c) => {
            const active = c.id_cur === currentCurso;
            return (
              <form key={c.id_cur} action={setCurso} className={`flex items-center justify-between rounded-xl px-4 py-3 ${active ? "glass-strong border border-primary/40" : "glass"}`}>
                <span className="text-sm flex items-center gap-2">
                  {c.nombre} — Doc {c.id_doc}
                  {active && <Badge variant="success">activo</Badge>}
                </span>
                <input type="hidden" name="curso_id" value={c.id_cur} />
                <Button size="sm" variant={active ? "secondary" : "outline"} type="submit" disabled={active}>
                  {active ? "Seleccionado" : "Seleccionar"}
                </Button>
              </form>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
