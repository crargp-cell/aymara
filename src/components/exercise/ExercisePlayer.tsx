"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  exercise: { id: number; lesson_id: number; type: string; question: string; answer: string | null };
  options?: { id: number; option_text: string | null; is_correct: boolean }[];
  pairs?: { id: number; aymara_word: string; spanish_word: string }[];
  answers?: { answer_text: string }[];
  action: (formData: FormData) => void;
};

export function ExercisePlayer({ exercise, options, pairs, answers, action }: Props) {
  const [matching, setMatching] = useState<string[]>(() => (pairs ? pairs.map(() => "") : []));
  const [fillAnswers, setFillAnswers] = useState<string[]>([""]);

  if (exercise.type === "text") {
    return (
      <form action={action} className="space-y-4">
        <p className="text-sm">{exercise.question}</p>
        <Input name="user_answer" placeholder="Tu respuesta" required />
        <input type="hidden" name="exercise_id" value={exercise.id} />
        <input type="hidden" name="type" value="text" />
        <Button type="submit" variant="gradient">
          Enviar
        </Button>
      </form>
    );
  }
  if (exercise.type === "multiple_choice" && options) {
    return (
      <form action={action} className="space-y-3">
        <p className="text-sm font-medium">{exercise.question}</p>
        {options.map((o) => (
          <label key={o.id} className="flex items-center gap-2 glass rounded-xl px-4 py-2 cursor-pointer hover:shadow-glow">
            <input type="radio" name="user_answer" value={String(o.id)} required className="accent-primary" />
            <span className="text-sm">{o.option_text}</span>
          </label>
        ))}
        <input type="hidden" name="exercise_id" value={exercise.id} />
        <input type="hidden" name="type" value="multiple_choice" />
        <Button type="submit" variant="gradient">
          Enviar
        </Button>
      </form>
    );
  }
  if (exercise.type === "matching" && pairs) {
    return (
      <form
        action={(fd) => {
          fd.set("user_answer", JSON.stringify(matching));
          action(fd);
        }}
        className="space-y-3"
      >
        <p className="text-sm">{exercise.question}</p>
        <div className="space-y-2">
          {pairs.map((p, i) => (
            <div key={p.id} className="grid grid-cols-2 gap-3 items-center">
              <div className="glass rounded-xl px-3 py-2 text-sm">{p.spanish_word}</div>
              <select
                value={matching[i] ?? ""}
                onChange={(e) => setMatching((m) => m.map((v, idx) => (idx === i ? e.target.value : v)))}
                className="w-full h-10 rounded-xl border border-input glass bg-transparent px-3 text-sm"
              >
                <option value="">— elegir —</option>
                {pairs.map((opt) => (
                  <option key={opt.id} value={opt.aymara_word}>
                    {opt.aymara_word}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <input type="hidden" name="exercise_id" value={exercise.id} />
        <input type="hidden" name="type" value="matching" />
        <Button type="submit" variant="gradient">
          Enviar emparejamiento
        </Button>
      </form>
    );
  }
  if (exercise.type === "fill_in_the_blank") {
    return (
      <form action={action} className="space-y-3">
        <p className="text-sm">{exercise.question}</p>
        <p className="text-xs text-muted-foreground">Respuestas esperadas: {answers?.map((a) => a.answer_text).join(", ")}</p>
        {fillAnswers.map((_, i) => (
          <Input key={i} name={`fill_${i}`} placeholder={`Espacio ${i + 1}`} onChange={(e) => setFillAnswers((a) => a.map((v, idx) => (idx === i ? e.target.value : v)))} />
        ))}
        <input type="hidden" name="user_answer" value={JSON.stringify(fillAnswers)} />
        <input type="hidden" name="exercise_id" value={exercise.id} />
        <input type="hidden" name="type" value="fill_in_the_blank" />
        <Button type="submit" variant="gradient">
          Enviar
        </Button>
      </form>
    );
  }
  return <p className="text-sm text-muted-foreground">Tipo no soportado</p>;
}
