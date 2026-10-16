import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import { requireRole } from "@/lib/session";
import { assertMaestroOwnsContent } from "@/lib/rbac";
import { Dificultad } from "@/generated/prisma/enums";
import Link from "next/link";
import { ImagePicker } from "@/components/exercise/ImagePicker";
import { intentosDe } from "@/lib/exercise-answer";
import { purgarImagenesEjercicio } from "@/lib/limpieza";

const DIFICULTADES = Object.values(Dificultad);
const esDificultad = (v: string): v is Dificultad => (DIFICULTADES as string[]).includes(v);

async function assertCanEditExercise(exerciseId: number) {
  const user = await requireRole(["maestro", "admin"]);
  const { ok } = await assertMaestroOwnsContent(user.role, user.id, "exercise", exerciseId);
  if (!ok) return null;
  return prisma.exercise.findUnique({ where: { id: exerciseId } });
}

export default async function AdminExerciseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["maestro", "admin"]);

  const { id } = await params;
  const exerciseId = Number(id);
  const { ok } = await assertMaestroOwnsContent(user.role, user.id, "exercise", exerciseId);
  if (!ok) notFound();
  const exercise = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!exercise) notFound();

  const path = `/admin/exercises/${exerciseId}`;

  const [options, pairs, answers] = await Promise.all([
    (exercise.type === "multiple_choice" || exercise.type === "drag_card") ? prisma.multipleChoiceOption.findMany({ where: { exercise_id: exerciseId }, orderBy: { id: "asc" } }) : Promise.resolve([]),
    exercise.type === "matching" ? prisma.matchingPair.findMany({ where: { exercise_id: exerciseId }, orderBy: { id: "asc" } }) : Promise.resolve([]),
    (exercise.type === "fill_in_the_blank" || exercise.type === "image_guess") ? prisma.fillInTheBlankAnswer.findMany({ where: { exercise_id: exerciseId }, orderBy: { id: "asc" } }) : Promise.resolve([]),
  ]);

  async function updateExercise(formData: FormData) {
    "use server";
    if (!(await assertCanEditExercise(exerciseId))) return;
    const question = String(formData.get("question") ?? "");
    const answer = String(formData.get("answer") ?? "") || null;
    const dificultadRaw = String(formData.get("dificultad") ?? "medio");
    const dificultad = esDificultad(dificultadRaw) ? dificultadRaw : "medio";
    if (!question) return;
    await prisma.exercise.update({ where: { id: exerciseId }, data: { question, answer, dificultad } });
    revalidatePath(path);
  }

  async function addOption(formData: FormData) {
    "use server";
    if (!(await assertCanEditExercise(exerciseId))) return;
    const option_text = String(formData.get("option_text") ?? "").trim();
    const is_correct = formData.get("is_correct") === "on";
    const imagenId = Number(formData.get("image_id"));
    // La imagen debe ser de este mismo paralelo.
    const imagen = Number.isInteger(imagenId) && imagenId > 0 ? await prisma.exerciseMedia.findFirst({ where: { id: imagenId, paralelo_id: exercise!.paralelo_id }, select: { id: true } }) : null;
    if (!option_text && !imagen) return;
    if (exercise!.type === "drag_card" && !imagen) return;
    if (is_correct) await prisma.multipleChoiceOption.updateMany({ where: { exercise_id: exerciseId }, data: { is_correct: false } });
    await prisma.multipleChoiceOption.create({ data: { exercise_id: exerciseId, option_text: option_text || null, image_id: imagen?.id ?? null, is_correct } });
    revalidatePath(path);
  }

  async function setCorrectOption(formData: FormData) {
    "use server";
    if (!(await assertCanEditExercise(exerciseId))) return;
    const optId = Number(formData.get("option_id"));
    const opt = await prisma.multipleChoiceOption.findUnique({ where: { id: optId } });
    if (!opt || opt.exercise_id !== exerciseId) return;
    await prisma.$transaction([
      prisma.multipleChoiceOption.updateMany({ where: { exercise_id: exerciseId }, data: { is_correct: false } }),
      prisma.multipleChoiceOption.update({ where: { id: optId }, data: { is_correct: true } }),
    ]);
    revalidatePath(path);
  }

  async function deleteOption(formData: FormData) {
    "use server";
    if (!(await assertCanEditExercise(exerciseId))) return;
    const optId = Number(formData.get("option_id"));
    const opt = await prisma.multipleChoiceOption.findUnique({ where: { id: optId } });
    if (!opt || opt.exercise_id !== exerciseId) return;
    await prisma.multipleChoiceOption.delete({ where: { id: optId } });
    await purgarImagenesEjercicio(exercise!.paralelo_id);
    revalidatePath(path);
  }

  async function updateImagen(formData: FormData) {
    "use server";
    const ex = await assertCanEditExercise(exerciseId);
    if (!ex || ex.type !== "image_guess") return;
    const imagenId = Number(formData.get("image_id"));
    const imagen = Number.isInteger(imagenId) && imagenId > 0 ? await prisma.exerciseMedia.findFirst({ where: { id: imagenId, paralelo_id: ex.paralelo_id }, select: { id: true } }) : null;
    if (!imagen) return;
    const maxIntentos = Math.min(8, Math.max(2, Math.round(Number(formData.get("max_intentos")) || 5)));
    await prisma.exercise.update({ where: { id: exerciseId }, data: { image_id: imagen.id, config: { maxIntentos } } });
    await purgarImagenesEjercicio(ex.paralelo_id);
    revalidatePath(path);
  }

  async function addPair(formData: FormData) {
    "use server";
    if (!(await assertCanEditExercise(exerciseId))) return;
    const aymara_word = String(formData.get("aymara_word") ?? "");
    const spanish_word = String(formData.get("spanish_word") ?? "");
    if (!aymara_word || !spanish_word) return;
    await prisma.matchingPair.create({ data: { exercise_id: exerciseId, aymara_word, spanish_word } });
    revalidatePath(path);
  }

  async function deletePair(formData: FormData) {
    "use server";
    if (!(await assertCanEditExercise(exerciseId))) return;
    const pairId = Number(formData.get("pair_id"));
    const pair = await prisma.matchingPair.findUnique({ where: { id: pairId } });
    if (!pair || pair.exercise_id !== exerciseId) return;
    await prisma.matchingPair.delete({ where: { id: pairId } });
    revalidatePath(path);
  }

  async function addAnswer(formData: FormData) {
    "use server";
    if (!(await assertCanEditExercise(exerciseId))) return;
    const answer_text = String(formData.get("answer_text") ?? "");
    if (!answer_text) return;
    await prisma.fillInTheBlankAnswer.create({ data: { exercise_id: exerciseId, answer_text } });
    revalidatePath(path);
  }

  async function deleteAnswer(formData: FormData) {
    "use server";
    if (!(await assertCanEditExercise(exerciseId))) return;
    const ansId = Number(formData.get("answer_id"));
    const ans = await prisma.fillInTheBlankAnswer.findUnique({ where: { id: ansId } });
    if (!ans || ans.exercise_id !== exerciseId) return;
    await prisma.fillInTheBlankAnswer.delete({ where: { id: ansId } });
    revalidatePath(path);
  }

  return (
    <div className="space-y-6">
      <Topbar title={`Ejercicio #${exercise.id}`} subtitle={`Tipo: ${exercise.type} · dificultad ${exercise.dificultad}`} />
      <Link href="/admin/exercises" className="text-sm text-primary hover:underline">
        ← Volver a ejercicios
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos base</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateExercise} className="grid md:grid-cols-2 gap-3">
            <Input name="question" placeholder="Pregunta" defaultValue={exercise.question} required className="md:col-span-2" />
            <Input name="answer" placeholder="Respuesta (text/fill)" defaultValue={exercise.answer ?? ""} />
            <select name="dificultad" className="h-10 rounded-md border border-input bg-card px-3 text-sm" defaultValue={exercise.dificultad}>
              <option value="facil">facil</option>
              <option value="medio">medio</option>
              <option value="dificil">dificil</option>
            </select>
            <Button type="submit" variant="gradient" className="md:col-span-2">
              Guardar
            </Button>
          </form>
        </CardContent>
      </Card>

      {(exercise.type === "multiple_choice" || exercise.type === "drag_card") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{exercise.type === "drag_card" ? "Tarjetas" : "Opciones"} ({options.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {options.map((o) => (
              <div key={o.id} className="panel rounded-xl px-4 py-3 flex items-center justify-between gap-2">
                <div className="flex-1 flex items-center gap-3">
                  {o.image_id ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/exercise-media/${o.image_id}`} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-border bg-muted/40 object-contain" />
                  ) : null}
                  <span className="text-sm">{o.option_text}</span>
                  {o.is_correct && <Badge variant="success">correcta</Badge>}
                </div>
                <div className="flex gap-2">
                  {!o.is_correct && (
                    <form action={setCorrectOption}>
                      <input type="hidden" name="option_id" value={o.id} />
                      <Button size="sm" variant="outline" type="submit">
                        Marcar correcta
                      </Button>
                    </form>
                  )}
                  <form action={deleteOption}>
                    <input type="hidden" name="option_id" value={o.id} />
                    <Button size="sm" variant="destructive" type="submit">
                      Borrar
                    </Button>
                  </form>
                </div>
              </div>
            ))}
            <form action={addOption} className="flex flex-wrap gap-2 items-center pt-2">
              <ImagePicker paraleloId={exercise.paralelo_id} name="image_id" label={exercise.type === "drag_card" ? "Imagen de la tarjeta" : "Agregar imagen"} />
              <Input name="option_text" placeholder={exercise.type === "drag_card" ? "Texto (opcional)" : "Nueva opción"} required={exercise.type !== "drag_card"} className="flex-1 min-w-40" />
              <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                <input type="checkbox" name="is_correct" className="rounded" /> Correcta
              </label>
              <Button type="submit" variant="secondary">
                Agregar
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {exercise.type === "matching" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pares ({pairs.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pairs.map((p) => (
              <div key={p.id} className="panel rounded-xl px-4 py-3 flex items-center justify-between gap-2">
                <span className="text-sm">
                  {p.aymara_word} ↔ {p.spanish_word}
                </span>
                <form action={deletePair}>
                  <input type="hidden" name="pair_id" value={p.id} />
                  <Button size="sm" variant="destructive" type="submit">
                    Borrar
                  </Button>
                </form>
              </div>
            ))}
            <form action={addPair} className="flex gap-2 items-center pt-2">
              <Input name="aymara_word" placeholder="Palabra aymara" required className="flex-1" />
              <Input name="spanish_word" placeholder="Palabra español" required className="flex-1" />
              <Button type="submit" variant="secondary">
                Agregar
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {exercise.type === "image_guess" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Imagen a adivinar</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateImagen} className="grid gap-3 sm:grid-cols-[1fr_12rem]">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Empieza borrosa para el alumno y se aclara con cada fallo.</p>
                <ImagePicker paraleloId={exercise.paralelo_id} name="image_id" initialId={exercise.image_id} label="Elegir imagen" />
              </div>
              <label className="space-y-1 text-xs text-muted-foreground">
                Intentos (2 a 8)
                <Input name="max_intentos" type="number" min={2} max={8} defaultValue={intentosDe(exercise.config)} />
              </label>
              <Button type="submit" variant="gradient" className="sm:col-span-2">Guardar imagen</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {(exercise.type === "fill_in_the_blank" || exercise.type === "image_guess") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Respuestas válidas ({answers.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {answers.map((a) => (
              <div key={a.id} className="panel rounded-xl px-4 py-3 flex items-center justify-between gap-2">
                <span className="text-sm">{a.answer_text}</span>
                <form action={deleteAnswer}>
                  <input type="hidden" name="answer_id" value={a.id} />
                  <Button size="sm" variant="destructive" type="submit">
                    Borrar
                  </Button>
                </form>
              </div>
            ))}
            <form action={addAnswer} className="flex gap-2 items-center pt-2">
              <Input name="answer_text" placeholder="Respuesta válida" required className="flex-1" />
              <Button type="submit" variant="secondary">
                Agregar
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
