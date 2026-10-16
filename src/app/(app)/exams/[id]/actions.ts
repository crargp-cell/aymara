"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { startOrGetExamAttempt, finishExamAttempt } from "@/lib/exams/engine";
import { getWordMatchPool } from "@/lib/exams/word-match";
import { GRUPO, wordMatchPct } from "@/lib/exams/word-match-score";

/*
  Examen de unir palabras: el servidor lleva la partida.

  El navegador nunca recibe la categoría de cada palabra: manda grupos de GRUPO
  cartas y el servidor responde si son de la misma categoría. Lo ya validado vive
  en `ExamAttempt.progreso` y el reloj corre desde `started_at`, que también pone
  el servidor al pulsar «Jugar». Recargar la página no reinicia ni el tiempo ni lo
  avanzado, y nada de lo que diga el navegador cambia la nota.
*/

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string };
type Progreso = { placed: Record<string, string> };

/** Segundos de cortesía tras el límite (latencia de red) antes de rechazar jugadas. */
const GRACIA_S = 3;

async function cargar(examId: number) {
  const user = await requireUser();
  if (user.role !== "estudiante") return null;
  const exam = await prisma.exam.findUnique({ where: { id: examId }, include: { details: true } });
  if (!exam || exam.type === "ar_exam") return null;
  return { user, exam };
}

const progresoDe = (v: unknown): Progreso => {
  const placed = (v as Progreso | null)?.placed;
  return { placed: placed && typeof placed === "object" ? placed : {} };
};

const restanteSeg = (startedAt: Date, limiteMin: number | null) => (limiteMin ?? 15) * 60 - Math.floor((Date.now() - startedAt.getTime()) / 1000);

async function intentoAbierto(userId: number, examId: number) {
  return prisma.examAttempt.findFirst({ where: { exam_id: examId, alumno_id: userId, completed_at: null }, orderBy: { started_at: "desc" } });
}

/** Pulsar «Jugar»: abre (o recupera) el intento y devuelve lo que queda de tiempo y lo ya colocado. */
export async function iniciarWordMatchAction(examId: number): Promise<Resultado<{ restante: number; colocadas: Record<string, string>; errores: number }>> {
  const ctx = await cargar(Number(examId));
  if (!ctx) return { ok: false, error: "Examen no disponible." };
  const start = await startOrGetExamAttempt(ctx.user.id, ctx.exam.id);
  if (!start.ok) return { ok: false, error: start.motivo };
  const intento = await prisma.examAttempt.findUniqueOrThrow({ where: { id: start.attemptId } });
  return { ok: true, restante: restanteSeg(intento.started_at, ctx.exam.time_limit), colocadas: progresoDe(intento.progreso).placed, errores: intento.errores };
}

export type ResultadoGrupo = { correcto: boolean; categoria: string | null; colocadas: number; total: number; errores: number; restante: number };

/** El alumno eligió GRUPO cartas: el servidor dice si son de una misma categoría y, si lo son, las deja colocadas. */
export async function comprobarGrupoAction(examId: number, ids: number[]): Promise<Resultado<ResultadoGrupo>> {
  const ctx = await cargar(Number(examId));
  if (!ctx) return { ok: false, error: "Examen no disponible." };
  const intento = await intentoAbierto(ctx.user.id, ctx.exam.id);
  if (!intento) return { ok: false, error: "Pulsa «Jugar» para empezar." };

  const restante = restanteSeg(intento.started_at, ctx.exam.time_limit);
  if (restante < -GRACIA_S) return { ok: false, error: "Se acabó el tiempo." };

  const { words } = await getWordMatchPool(ctx.exam.details);
  const porId = new Map(words.map((w) => [w.id, w]));
  const elegidas = [...new Set((Array.isArray(ids) ? ids : []).map(Number))];
  const progreso = progresoDe(intento.progreso);
  if (elegidas.length !== GRUPO || elegidas.some((id) => !porId.has(id) || String(id) in progreso.placed)) {
    return { ok: false, error: "Esas cartas no son válidas." };
  }

  const categorias = new Set(elegidas.map((id) => porId.get(id)!.category));
  const categoria = categorias.size === 1 ? [...categorias][0] : null;
  if (categoria) {
    for (const id of elegidas) progreso.placed[String(id)] = categoria;
    await prisma.examAttempt.update({ where: { id: intento.id }, data: { progreso } });
  } else {
    await prisma.examAttempt.update({ where: { id: intento.id }, data: { errores: { increment: 1 } } });
  }
  return {
    ok: true,
    correcto: !!categoria,
    categoria,
    colocadas: Object.keys(progreso.placed).length,
    total: words.length,
    errores: intento.errores + (categoria ? 0 : 1),
    restante,
  };
}

/** Cierra el intento con lo validado por el servidor y el tiempo que él midió. */
export async function finalizarWordMatchAction(examId: number) {
  const vacio = { passed: false, percentage: 0, arCardId: null as number | null, faltantes: [] as { id: number; categoria: string }[] };
  const ctx = await cargar(Number(examId));
  if (!ctx) return vacio;
  const intento = await intentoAbierto(ctx.user.id, ctx.exam.id);
  if (!intento) return vacio;

  const { words } = await getWordMatchPool(ctx.exam.details);
  const { placed } = progresoDe(intento.progreso);
  const filas = words.map((w) => {
    const respuesta = placed[String(w.id)] ?? null;
    return { ref: w.text, expected: w.category, respuesta, correct: respuesta === w.category };
  });
  const correctas = filas.filter((f) => f.correct).length;
  const percentage = wordMatchPct(words.length, correctas, intento.errores);

  const res = await finishExamAttempt({
    attemptId: intento.id,
    alumnoId: ctx.user.id,
    scorePct: percentage,
    timeSpentMs: Math.max(0, Date.now() - intento.started_at.getTime()),
    details: filas.map((d) => ({ item_ref: d.ref, expected: d.expected, respuesta: d.respuesta, is_correct: d.correct })),
  });

  revalidatePath("/exams");
  revalidatePath("/exams/history");
  revalidatePath("/map");
  // Cerrado el intento ya no hay nada que proteger: se revelan las categorías de las cartas que faltaron.
  const faltantes = words.filter((w) => !(String(w.id) in placed)).map((w) => ({ id: w.id, categoria: w.category }));
  return { passed: res.passed, percentage: res.scorePct, arCardId: res.rewardCardId, faltantes };
}
