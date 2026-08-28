import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getParaleloActivoAlumno, getParalelosDeMaestro, getParaleloSeleccionado } from "@/lib/paralelo";
import { setParaleloSeleccionado } from "@/lib/paralelo-actions";
import { getStudentBoard } from "@/lib/student-board";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { Chaska, Guarda } from "@/components/brand/Andino";
import { Map, BookOpen, Search, Sparkles, Trophy, FileQuestion } from "lucide-react";

// Cada acceso lleva su propio tono del fondo andino: el icono en color hace que
// la fila se reconozca de un vistazo en vez de ser seis botones grises iguales.
const STUDENT_LINKS = [
  { href: "/map", label: "Mapa", icon: Map, tono: "var(--color-andino-verde)" },
  { href: "/lessons", label: "Lecciones", icon: BookOpen, tono: "var(--color-andino-azul)" },
  { href: "/exams", label: "Exámenes", icon: FileQuestion, tono: "var(--color-andino-morado)" },
  { href: "/ar-cards", label: "Tarjetas", icon: Sparkles, tono: "var(--color-andino-coral)" },
  { href: "/logros", label: "Logros", icon: Trophy, tono: "var(--color-andino-oro-tinta)" },
  { href: "/dictionary", label: "Diccionario", icon: Search, tono: "var(--color-andino-terracota)" },
];

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;

  // El administrador gestiona, supervisa y analiza; no crea contenido
  // (Negocio.md §4, §29) — su inicio es institucional, no de autoría.
  if (user.role === "admin") {
    const gestionActual = await prisma.gestion.findFirst({ where: { es_actual: true } });
    const [paralelos, alumnos, maestros, sinInscripcion, observaciones] = await Promise.all([
      prisma.paralelo.count({ where: { gestion: { es_actual: true } } }),
      prisma.inscripcion.count({ where: { estado: { in: ["activo", "reincorporado"] }, paralelo: { gestion: { es_actual: true } } } }),
      prisma.usuario.count({ where: { role: "maestro", activo: true } }),
      prisma.usuario.count({ where: { role: "estudiante", activo: true, inscripciones: { none: { paralelo: { gestion: { es_actual: true } } } } } }),
      prisma.comentarioRevision.count({ where: { resuelto: false } }),
    ]);
    const sinProfesor = await prisma.paralelo.count({ where: { gestion: { es_actual: true }, profesor_id: null } });

    return (
      <div className="space-y-6">
        {/* El saludo es el ancla saturada de la pantalla del administrador. */}
        <div className="panel panel-hero rounded-2xl overflow-hidden">
          <Guarda motivo="escalones" alto={10} opacidad={0.35} color="var(--wiphala-amarillo)" />
          <div className="p-6">
            <h1 className="text-xl font-semibold">Hola, {user.name}</h1>
            <p className="text-sm text-muted-foreground">
              Administración · {gestionActual ? `${gestionActual.nombre} en curso` : "sin gestión actual definida"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {([
            { n: paralelos, l: "Paralelos", a: "azul", href: "/admin/paralelos" },
            { n: alumnos, l: "Alumnos inscritos", a: "verde", href: "/admin/students" },
            { n: maestros, l: "Profesores", a: "morado", href: "/admin/users" },
            { n: observaciones, l: "Observaciones abiertas", a: "coral", href: "/admin/supervision" },
          ] as const).map((s) => (
            <Link key={s.l} href={s.href}>
              <Card acento={s.a} activa className="h-full">
                <CardContent className="pt-7 pb-5 text-center">
                  <p className="text-3xl font-bold tabular-nums" style={{ color: "var(--primary)" }}>{s.n}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.l}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {(sinProfesor > 0 || sinInscripcion > 0 || !gestionActual) && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Requiere tu atención</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {!gestionActual && (
                <div className="panel rounded-xl px-4 py-3 flex items-center justify-between gap-2">
                  <span>No hay ninguna gestión marcada como actual.</span>
                  <Link href="/admin/gestiones"><Button size="sm" variant="outline">Definir</Button></Link>
                </div>
              )}
              {sinProfesor > 0 && (
                <div className="panel rounded-xl px-4 py-3 flex items-center justify-between gap-2">
                  <span>{sinProfesor} paralelo(s) sin profesor asignado.</span>
                  <Link href="/admin/paralelos"><Button size="sm" variant="outline">Asignar</Button></Link>
                </div>
              )}
              {sinInscripcion > 0 && (
                <div className="panel rounded-xl px-4 py-3 flex items-center justify-between gap-2">
                  <span>{sinInscripcion} alumno(s) sin inscripción en la gestión actual.</span>
                  <Link href="/admin/students"><Button size="sm" variant="outline">Inscribir</Button></Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-sm">Accesos rápidos</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: "/admin/gestiones", label: "Gestiones" },
              { href: "/admin/supervision", label: "Supervisión" },
              { href: "/admin/analitica", label: "Analítica" },
              { href: "/admin/reports", label: "Reportes" },
            ].map((l) => (
              <Link key={l.href} href={l.href}><Button variant="outline" className="w-full h-14">{l.label}</Button></Link>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.role === "maestro") {
    const paralelos = await getParalelosDeMaestro(user.id);
    const { actual } = await getParaleloSeleccionado(user.role, user.id);
    // Si llegó redirigido desde una pestaña de contenido, al elegir vuelve allí.
    const volverA = sp.next && sp.next.startsWith("/") ? sp.next : "/dashboard";
    const resumen = actual
      ? await Promise.all([
          prisma.lesson.count({ where: { paralelo_id: actual.id, estado: "activo" } }),
          prisma.exercise.count({ where: { paralelo_id: actual.id, estado: "activo" } }),
          prisma.exam.count({ where: { paralelo_id: actual.id, estado: "activo" } }),
          prisma.inscripcion.count({ where: { paralelo_id: actual.id, estado: { in: ["activo", "reincorporado"] } } }),
        ])
      : null;

    return (
      <div className="space-y-6">
        {/* El saludo es el ancla saturada de la pantalla del profesor. */}
        <div className="panel panel-hero rounded-2xl overflow-hidden">
          <Guarda motivo="escalones" alto={10} opacidad={0.35} color="var(--wiphala-amarillo)" />
          <div className="p-6">
            <h1 className="text-xl font-semibold">Hola, {user.name}</h1>
            <p className="text-sm text-muted-foreground">
              Profesor · {paralelos.length} paralelo(s) asignado(s)
              {actual ? ` · trabajando en ${actual.nombre}` : " · sin paralelo seleccionado"}
            </p>
          </div>
        </div>

        {/* Elegir el paralelo se hace acá mismo: el botón cambia y se queda en Inicio. */}
        <Card className={actual ? undefined : "border-primary/40"}>
          <CardHeader>
            <CardTitle className="text-sm">Tus paralelos</CardTitle>
            {!actual && (
              <p className="text-xs text-muted-foreground">
                Elige con cuál vas a trabajar: el contenido pertenece a un paralelo concreto.
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {paralelos.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin paralelos asignados. Pide al administrador que te asigne uno.</p>
            )}
            {paralelos.map((p) => {
              const enUso = actual?.id === p.id;
              return (
                <div key={p.id} className="panel rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{p.gestion} · {p.nombre}</span>
                    {enUso && <Badge variant="success">en uso</Badge>}
                    {!p.es_actual && <Badge variant="warning">gestión no vigente</Badge>}
                  </span>
                  {enUso ? (
                    <Link href="/admin/lessons"><Button size="sm" variant="secondary">Gestionar contenido</Button></Link>
                  ) : (
                    <form action={setParaleloSeleccionado}>
                      <input type="hidden" name="paralelo_id" value={p.id} />
                      <input type="hidden" name="back" value={volverA} />
                      <Button size="sm" variant="outline" type="submit">Cambiar a este</Button>
                    </form>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {actual && resumen && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {([
                { n: resumen[3], l: "Alumnos", a: "verde", href: "/admin/students" },
                { n: resumen[0], l: "Lecciones", a: "azul", href: "/admin/lessons" },
                { n: resumen[1], l: "Ejercicios", a: "morado", href: "/admin/exercises" },
                { n: resumen[2], l: "Exámenes", a: "coral", href: "/admin/exams" },
              ] as const).map((s) => (
                <Link key={s.l} href={s.href}>
                  <Card acento={s.a} activa className="h-full">
                    <CardContent className="pt-7 pb-5 text-center">
                      <p className="text-3xl font-bold tabular-nums" style={{ color: "var(--primary)" }}>{s.n}</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.l}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            {resumen[0] === 0 && (
              <Card>
                <CardContent className="pt-6 flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Este paralelo todavía no tiene lecciones.</p>
                  <Link href="/admin/lessons"><Button variant="gradient" size="sm">Crear la primera</Button></Link>
                </CardContent>
              </Card>
            )}
          </>
        )}
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
      <div className="panel rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
        <Image src="/mascota/mascota.png" alt="Mascota Aymara" width={90} height={90} className="animate-float shrink-0" />
        <div>
          <h1 className="text-xl font-semibold">Hola, {user.name}</h1>
          <div className="flex items-center justify-center sm:justify-start gap-1.5 text-sm text-muted-foreground">
            {paralelo ? <>Paralelo <Badge variant="secondary">{paralelo.nombre}</Badge></> : <span>Sin inscripción activa</span>}
          </div>
        </div>
      </div>

      {/* Cada cifra lleva su propio acento: el color del fondo entra en la
          interfaz y las tarjetas dejan de ser cinco cajas iguales. */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {([
          { n: lessonsCompleted, l: "Lecciones", a: "azul", href: "/lessons" },
          { n: exercisesCorrect, l: "Aciertos", a: "verde", href: "/map" },
          { n: examsPassed, l: "Exámenes", a: "coral", href: "/exams" },
          { n: tarjetas, l: "Tarjetas AR", a: "morado", href: "/ar-cards" },
          { n: logros, l: "Logros", a: "oro", href: "/logros" },
        ] as const).map((s) => (
          <Link key={s.l} href={s.href}>
            <Card acento={s.a} activa className="h-full">
              <CardContent className="pt-7 pb-5 text-center">
                <p className="text-3xl font-bold tabular-nums" style={{ color: "var(--primary)" }}>{s.n}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.l}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Único bloque saturado de la pantalla: marca dónde seguir. */}
      {nextNode && (
        <Card className="panel-hero overflow-hidden">
          <Guarda motivo="chaska" alto={10} opacidad={0.35} color="var(--wiphala-amarillo)" />
          <CardContent className="pt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Chaska size={34} color="var(--ruta-activo)" className="shrink-0" />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Siguiente objetivo</p>
                <p className="text-sm font-semibold truncate">
                  {nextNode.type === "exam" ? "Examen: " : "Nivel: "}{nextNode.title}
                </p>
              </div>
            </div>
            <Link href={nextNode.type === "exam" ? `/exams/${nextNode.id}` : `/lessons/${nextNode.id}`}>
              <Button size="sm" variant="secondary">Continuar</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Accesos rápidos</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {STUDENT_LINKS.map(({ href, label, icon: Icon, tono }) => (
            <Link key={href} href={href}>
              <Button variant="outline" className="w-full h-16 flex-col gap-1.5">
                <Icon className="h-5 w-5" style={{ color: tono }} />
                <span className="text-xs">{label}</span>
              </Button>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
