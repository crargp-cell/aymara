"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { alumnoPuedeVerLeccion } from "@/lib/rbac";
import { recordExerciseAttempt } from "@/lib/lesson-flow";
import { coincideRespuesta, intentosDe } from "@/lib/exercise-answer";
import { purgarPartidasViejas } from "@/lib/limpieza";

/*
  «Adivina la imagen»: el servidor lleva la partida (ExercisePlay) y decide si lo
  escrito es correcto. El navegador nunca recibe la respuesta mientras se juega
  ni la imagen nítida (ver /api/exercise-media). Cuando la partida termina, el
  intento se registra UNA sola vez en el historial: así los fallos dentro del
  juego no cuentan como fallos del ejercicio (y no disparan antes de tiempo la
  lectura forzada tras 3 fallos).
*/

export type EstadoPartida = {
  playId: number;
  fallos: number;
  intentos: number;
  /** Forma de la palabra con una «x» por letra (los espacios se conservan): sólo la longitud. */
  forma: string;
  terminado: boolean;
  resuelto: boolean;
  /** Sólo cuando la partida terminó. */
  palabra: string | null;
};

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** Valida acceso y que el ejercicio sea un image_guess de esa lección; devuelve lo necesario. */
async function cargar(lessonId: number, exerciseId: number) {
  const user = await requireUser();
  const esDocente = user.role !== "estudiante";
  if (!esDocente && !(await alumnoPuedeVerLeccion(user.id, lessonId))) return null;
  const link = await prisma.lessonExercise.findFirst({ where: { lesson_id: lessonId, exercise_id: exerciseId }, select: { id: true } });
  if (!link) return null;
  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId }, include: { blanks: { orderBy: { id: "asc" } } } });
  if (!exercise || exercise.type !== "image_guess" || !exercise.image_id || exercise.blanks.length === 0) return null;
  return { user, esDocente, exercise };
}

const formaDe = (palabra: string) => [...palabra.trim()].map((c) => (c === " " ? " " : "x")).join("");

function estado(play: { id: number; fallos: number; terminado: boolean; resuelto: boolean }, exercise: { config: unknown; blanks: { answer_text: string }[] }): EstadoPartida {
  return {
    playId: play.id,
    fallos: play.fallos,
    intentos: intentosDe(exercise.config),
    forma: formaDe(exercise.blanks[0].answer_text),
    terminado: play.terminado,
    resuelto: play.resuelto,
    palabra: play.terminado ? exercise.blanks[0].answer_text : null,
  };
}

/** Abre la partida en curso (si el alumno recarga la página sigue donde estaba) o crea una nueva. */
export async function iniciarPartidaAction(lessonId: number, exerciseId: number, nueva = false): Promise<Resultado<{ partida: EstadoPartida }>> {
  const ctx = await cargar(Number(lessonId), Number(exerciseId));
  if (!ctx) return { ok: false, error: "No se pudo abrir el ejercicio." };
  const { user, exercise } = ctx;

  // Barrido barato y ocasional: ~1 de cada 20 aperturas limpia las partidas viejas.
  if (Math.random() < 0.05) void purgarPartidasViejas().catch(() => {});

  const hace12h = new Date(Date.now() - 12 * 3600_000);
  const abierta = nueva
    ? null
    : await prisma.exercisePlay.findFirst({ where: { user_id: user.id, exercise_id: exercise.id, terminado: false, created_at: { gt: hace12h } }, orderBy: { id: "desc" } });
  const play = abierta ?? (await prisma.exercisePlay.create({ data: { user_id: user.id, exercise_id: exercise.id } }));
  return { ok: true, partida: estado(play, exercise) };
}

export type ResultadoJugada = {
  correcto: boolean;
  partida: EstadoPartida;
  /** Sólo al terminar y para alumnos: lo que pasó en la lección al registrar el intento. */
  leccionCompletada: boolean;
  tarjetaAr: boolean;
  logros: string[];
};

export async function adivinarAction(lessonId: number, playId: number, texto: string): Promise<Resultado<ResultadoJugada>> {
  const play = await prisma.exercisePlay.findUnique({ where: { id: Number(playId) } });
  if (!play) return { ok: false, error: "La partida no existe." };
  const ctx = await cargar(Number(lessonId), play.exercise_id);
  if (!ctx || play.user_id !== ctx.user.id) return { ok: false, error: "No se pudo abrir el ejercicio." };
  const { user, esDocente, exercise } = ctx;

  const base = { leccionCompletada: false, tarjetaAr: false, logros: [] as string[] };
  if (play.terminado) return { ok: true, correcto: play.resuelto, partida: estado(play, exercise), ...base };

  const entrada = String(texto ?? "").slice(0, 120);
  if (!entrada.trim()) return { ok: false, error: "Escribe una palabra." };

  const intentos = intentosDe(exercise.config);
  const correcto = coincideRespuesta(entrada, exercise.blanks.map((b) => b.answer_text));
  const fallos = correcto ? play.fallos : play.fallos + 1;
  const terminado = correcto || fallos >= intentos;

  // updateMany con `terminado: false` hace de cerrojo: si llegan dos jugadas a la vez,
  // sólo una de ellas cierra la partida y registra el intento.
  const { count } = await prisma.exercisePlay.updateMany({
    where: { id: play.id, terminado: false },
    data: { fallos, resuelto: correcto, terminado },
  });
  if (count === 0) {
    const actual = await prisma.exercisePlay.findUniqueOrThrow({ where: { id: play.id } });
    return { ok: true, correcto: actual.resuelto, partida: estado(actual, exercise), ...base };
  }

  const partida = estado({ id: play.id, fallos, terminado, resuelto: correcto }, exercise);
  if (!terminado || esDocente) return { ok: true, correcto, partida, ...base };

  // El docente puede jugar para revisar, pero el historial pertenece al alumno (Negocio.md §32).
  const res = await recordExerciseAttempt({
    alumnoId: user.id,
    lessonId: Number(lessonId),
    exerciseId: exercise.id,
    userAnswer: entrada,
    isCorrect: correcto,
    errorType: correcto ? null : "concepto_equivocado",
    timeSpentMs: Math.max(0, Date.now() - play.created_at.getTime()),
    exerciseType: exercise.type,
    dificultad: exercise.dificultad,
  });
  return { ok: true, correcto, partida, leccionCompletada: res.completed, tarjetaAr: !!res.rewardCardId, logros: res.nuevosLogros };
}
