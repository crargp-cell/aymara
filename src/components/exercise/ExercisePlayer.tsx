"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  exercise: { id: number; lesson_id?: number | null; type: string; question: string; answer: string | null };
  options?: { id: number; option_text: string | null; is_correct: boolean }[];
  pairs?: { id: number; aymara_word: string; spanish_word: string }[];
  answers?: { answer_text: string }[];
  action: (formData: FormData) => void;
};

export function ExercisePlayer({ exercise, options, pairs, answers, action }: Props) {
  const startedAt = useRef(Date.now());
  const [matching, setMatching] = useState<string[]>(() => (pairs ? pairs.map(() => "") : []));
  const [fillAnswers, setFillAnswers] = useState<string[]>(() => (answers && answers.length > 1 ? answers.map(() => "") : [""]));

  // Envuelve la acción para adjuntar el tiempo empleado (medido en el cliente).
  const withTiming = (extra?: (fd: FormData) => void) => (fd: FormData) => {
    extra?.(fd);
    fd.set("time_ms", String(Date.now() - startedAt.current));
    fd.set("exercise_id", String(exercise.id));
    fd.set("type", exercise.type);
    action(fd);
  };

  if (exercise.type === "text") {
    return (
      <form action={withTiming()} className="space-y-4">
        <Input name="user_answer" placeholder="Tu respuesta" required autoComplete="off" />
        <Button type="submit" variant="gradient">Enviar</Button>
      </form>
    );
  }

  if (exercise.type === "multiple_choice" && options) {
    return (
      <form action={withTiming()} className="space-y-3">
        {options.map((o) => (
          <label key={o.id} className="flex items-center gap-2 glass rounded-xl px-4 py-2 cursor-pointer hover:shadow-glow">
            <input type="radio" name="user_answer" value={String(o.id)} required className="accent-primary" />
            <span className="text-sm">{o.option_text}</span>
          </label>
        ))}
        <Button type="submit" variant="gradient">Enviar</Button>
      </form>
    );
  }

  if (exercise.type === "matching" && pairs) {
    return (
      <form action={withTiming((fd) => fd.set("user_answer", JSON.stringify(matching)))} className="space-y-3">
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
                  <option key={opt.id} value={opt.aymara_word}>{opt.aymara_word}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <Button type="submit" variant="gradient">Enviar emparejamiento</Button>
      </form>
    );
  }

  if (exercise.type === "fill_in_the_blank") {
    return (
      <form action={withTiming((fd) => fd.set("user_answer", JSON.stringify(fillAnswers)))} className="space-y-3">
        {fillAnswers.map((val, i) => (
          <Input
            key={i}
            value={val}
            placeholder={`Espacio ${i + 1}`}
            autoComplete="off"
            onChange={(e) => setFillAnswers((a) => a.map((v, idx) => (idx === i ? e.target.value : v)))}
          />
        ))}
        <Button type="submit" variant="gradient">Enviar</Button>
      </form>
    );
  }

  return <p className="text-sm text-muted-foreground">Tipo no soportado</p>;
}
