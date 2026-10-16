"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImagePicker } from "@/components/exercise/ImagePicker";

type Lesson = { id: number; title: string };

const TIPOS = [
  { value: "text", label: "text — respuesta escrita" },
  { value: "multiple_choice", label: "multiple_choice — opción múltiple" },
  { value: "matching", label: "matching — emparejar" },
  { value: "fill_in_the_blank", label: "fill_in_the_blank — completar" },
  { value: "image_guess", label: "image_guess — adivina la imagen (borrosa)" },
  { value: "drag_card", label: "drag_card — arrastra la tarjeta" },
];

export function CreateExerciseForm({
  lessons,
  defaultLessonId,
  action,
  paraleloId,
}: {
  lessons: Lesson[];
  defaultLessonId: number | string;
  action: (formData: FormData) => void;
  paraleloId?: number;
}) {
  const [type, setType] = useState("text");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [pairs, setPairs] = useState<{ aymara: string; spanish: string }[]>([{ aymara: "", spanish: "" }]);
  const [blanks, setBlanks] = useState<string[]>([""]);
  // Tarjetas de drag_card: sólo se necesita la imagen (se numeran por posición).
  const [tarjetas, setTarjetas] = useState<number[]>([0, 1, 2]);

  const conImagenes = paraleloId != null;
  const tiposDisponibles = TIPOS.filter((t) => conImagenes || (t.value !== "image_guess" && t.value !== "drag_card"));

  return (
    <form action={action} className="grid md:grid-cols-2 gap-3">
      {paraleloId != null && <input type="hidden" name="paralelo_id" value={paraleloId} />}
      <select name="attach_lesson_id" className="h-10 rounded-md border border-input bg-card px-3 text-sm" defaultValue={defaultLessonId || ""}>
        <option value="">No enlazar a ninguna lección (solo al pool)</option>
        {lessons.map((l) => (
          <option key={l.id} value={l.id}>
            Enlazar a: {l.title.slice(0, 36)}
          </option>
        ))}
      </select>
      <select name="type" value={type} onChange={(e) => setType(e.target.value)} className="h-10 rounded-md border border-input bg-card px-3 text-sm">
        {tiposDisponibles.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <Input
        name="question"
        placeholder={type === "image_guess" ? "Consigna (ej. ¿Qué palabra es?)" : type === "drag_card" ? "Palabra a ilustrar (ej. inti)" : "Pregunta"}
        required
        className="md:col-span-2"
      />

      {type === "text" && <Input name="answer" placeholder="Respuesta correcta" required className="md:col-span-2" />}

      {type === "multiple_choice" && (
        <div className="md:col-span-2 space-y-2 panel rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Opciones — marca cuál es la correcta (la imagen es opcional)</p>
          {options.map((opt, i) => (
            <div key={i} className="flex items-start gap-2">
              <input type="radio" name="correct_index" value={i} checked={correctIndex === i} onChange={() => setCorrectIndex(i)} className="mt-3 shrink-0" />
              <div className="flex-1 space-y-2">
                <Input
                  name="option_text"
                  placeholder={`Opción ${i + 1}`}
                  required
                  value={opt}
                  onChange={(e) => setOptions((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))}
                />
                {conImagenes && <ImagePicker paraleloId={paraleloId!} name="option_image_id" label="Agregar imagen" />}
              </div>
              {options.length > 2 && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}>
                  ✕
                </Button>
              )}
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => setOptions((prev) => [...prev, ""])}>
            + Agregar opción
          </Button>
        </div>
      )}

      {type === "matching" && (
        <div className="md:col-span-2 space-y-2 panel rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Pares aymara ↔ español</p>
          {pairs.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input name="pair_aymara" placeholder="Palabra aymara" required value={p.aymara} onChange={(e) => setPairs((prev) => prev.map((x, idx) => (idx === i ? { ...x, aymara: e.target.value } : x)))} />
              <Input name="pair_spanish" placeholder="Palabra español" required value={p.spanish} onChange={(e) => setPairs((prev) => prev.map((x, idx) => (idx === i ? { ...x, spanish: e.target.value } : x)))} />
              {pairs.length > 1 && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setPairs((prev) => prev.filter((_, idx) => idx !== i))}>
                  ✕
                </Button>
              )}
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => setPairs((prev) => [...prev, { aymara: "", spanish: "" }])}>
            + Agregar par
          </Button>
        </div>
      )}

      {(type === "fill_in_the_blank" || type === "image_guess") && (
        <div className="md:col-span-2 space-y-2 panel rounded-xl p-3">
          <p className="text-xs text-muted-foreground">
            {type === "image_guess" ? "Palabras que se aceptan como respuesta (se ignoran mayúsculas, tildes y el tipo de apóstrofo)" : "Respuestas válidas para el espacio en blanco"}
          </p>
          {blanks.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input name="answer_text" placeholder={`Respuesta válida ${i + 1}`} required value={b} onChange={(e) => setBlanks((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))} />
              {blanks.length > 1 && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setBlanks((prev) => prev.filter((_, idx) => idx !== i))}>
                  ✕
                </Button>
              )}
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => setBlanks((prev) => [...prev, ""])}>
            + Agregar respuesta
          </Button>
        </div>
      )}

      {type === "image_guess" && conImagenes && (
        <div className="md:col-span-2 grid gap-3 panel rounded-xl p-3 sm:grid-cols-[1fr_12rem]">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Imagen que se debe adivinar (empieza borrosa y se aclara con cada fallo)</p>
            <ImagePicker paraleloId={paraleloId!} name="image_id" label="Elegir imagen" />
          </div>
          <label className="space-y-1 text-xs text-muted-foreground">
            Intentos (2 a 8)
            <Input name="max_intentos" type="number" min={2} max={8} defaultValue={5} />
          </label>
        </div>
      )}

      {type === "drag_card" && conImagenes && (
        <div className="md:col-span-2 space-y-2 panel rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Tarjetas con imagen — marca la que corresponde a la palabra; las demás son distractoras</p>
          {tarjetas.map((n, i) => (
            <div key={n} className="flex items-center gap-2">
              <input type="radio" name="correct_index" value={i} checked={correctIndex === i} onChange={() => setCorrectIndex(i)} className="shrink-0" aria-label={`La tarjeta ${i + 1} es la correcta`} />
              <ImagePicker paraleloId={paraleloId!} name="option_image_id" label={`Imagen de la tarjeta ${i + 1}`} />
              {tarjetas.length > 2 && (
                <Button type="button" size="sm" variant="ghost" onClick={() => { setTarjetas((prev) => prev.filter((_, idx) => idx !== i)); setCorrectIndex(0); }}>
                  ✕
                </Button>
              )}
            </div>
          ))}
          {tarjetas.length < 6 && (
            <Button type="button" size="sm" variant="outline" onClick={() => setTarjetas((prev) => [...prev, Math.max(...prev) + 1])}>
              + Agregar tarjeta
            </Button>
          )}
        </div>
      )}

      <select name="dificultad" className="h-10 rounded-md border border-input bg-card px-3 text-sm" defaultValue="medio">
        <option value="facil">facil</option>
        <option value="medio">medio</option>
        <option value="dificil">dificil</option>
      </select>
      <Button type="submit" variant="gradient" className="md:col-span-2">
        Crear
      </Button>
    </form>
  );
}
