"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Lesson = { id: number; title: string };

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

  return (
    <form action={action} className="grid md:grid-cols-2 gap-3">
      {paraleloId != null && <input type="hidden" name="paralelo_id" value={paraleloId} />}
      <select name="attach_lesson_id" className="h-10 rounded-xl border border-input glass bg-transparent px-3 text-sm" defaultValue={defaultLessonId || ""}>
        <option value="">No enlazar a ninguna lección (solo al pool)</option>
        {lessons.map((l) => (
          <option key={l.id} value={l.id}>
            Enlazar a: {l.title.slice(0, 36)}
          </option>
        ))}
      </select>
      <select name="type" value={type} onChange={(e) => setType(e.target.value)} className="h-10 rounded-xl border border-input glass bg-transparent px-3 text-sm">
        <option value="text">text</option>
        <option value="multiple_choice">multiple_choice</option>
        <option value="matching">matching</option>
        <option value="fill_in_the_blank">fill_in_the_blank</option>
      </select>
      <Input name="question" placeholder="Pregunta" required className="md:col-span-2" />

      {type === "text" && <Input name="answer" placeholder="Respuesta correcta" required className="md:col-span-2" />}

      {type === "multiple_choice" && (
        <div className="md:col-span-2 space-y-2 glass rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Opciones — marca cuál es la correcta</p>
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name="correct_index" value={i} checked={correctIndex === i} onChange={() => setCorrectIndex(i)} className="shrink-0" />
              <Input
                name="option_text"
                placeholder={`Opción ${i + 1}`}
                required
                value={opt}
                onChange={(e) => setOptions((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))}
              />
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
        <div className="md:col-span-2 space-y-2 glass rounded-xl p-3">
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

      {type === "fill_in_the_blank" && (
        <div className="md:col-span-2 space-y-2 glass rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Respuestas válidas para el espacio en blanco</p>
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

      <select name="dificultad" className="h-10 rounded-xl border border-input glass bg-transparent px-3 text-sm" defaultValue="medio">
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
