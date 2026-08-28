"use client";
import { useEffect, useRef, useState } from "react";
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
  const [fillAnswers, setFillAnswers] = useState<string[]>(() => (answers && answers.length > 1 ? answers.map(() => "") : [""]));

  const withTiming = (extra?: (fd: FormData) => void) => async (fd: FormData) => {
    extra?.(fd);
    fd.set("time_ms", String(Date.now() - startedAt.current));
    fd.set("exercise_id", String(exercise.id));
    fd.set("type", exercise.type);
    await action(fd);
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
          <label key={o.id} className="flex items-center gap-2 panel rounded-xl px-4 py-2 cursor-pointer transition-colors hover:bg-muted">
            <input type="radio" name="user_answer" value={String(o.id)} required className="accent-primary" />
            <span className="text-sm">{o.option_text}</span>
          </label>
        ))}
        <Button type="submit" variant="gradient">Enviar</Button>
      </form>
    );
  }

  if (exercise.type === "matching" && pairs) {
    return <MemoryMatching pairs={pairs} withTiming={withTiming} />;
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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

type MemoryCard = { uid: string; pairId: number; label: string; lang: "ay" | "es" };

function MemoryMatching({ pairs, withTiming }: { pairs: { id: number; aymara_word: string; spanish_word: string }[]; withTiming: (extra?: (fd: FormData) => void) => (fd: FormData) => void }) {
  const [deck, setDeck] = useState<MemoryCard[]>([]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const cards: MemoryCard[] = [];
    for (const p of pairs) {
      cards.push({ uid: `${p.id}-ay`, pairId: p.id, label: p.aymara_word, lang: "ay" });
      cards.push({ uid: `${p.id}-es`, pairId: p.id, label: p.spanish_word, lang: "es" });
    }
    setDeck(shuffle(cards));
    setHydrated(true);
  }, [pairs]);

  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [matchedPairs, setMatchedPairs] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const [shakeUid, setShakeUid] = useState<string | null>(null);
  const [message, setMessage] = useState("Volteá dos cartas — si son traducción correcta se quedan, si no vuelven.");

  const totalPairs = pairs.length;
  const won = matchedPairs.size === totalPairs;

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{totalPairs} pares</span>
          <span className="px-2 py-1 rounded-full text-xs bg-muted">Cargando cartas…</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {pairs.flatMap(() => [0, 1]).map((_, i) => (
            <div key={i} className="h-24 sm:h-28 rounded-xl panel border border-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  function handleFlip(uid: string) {
    if (matched.has(uid) || flipped.includes(uid) || flipped.length >= 2) return;
    const next = [...flipped, uid];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [aUid, bUid] = next;
      const a = deck.find((c) => c.uid === aUid)!;
      const b = deck.find((c) => c.uid === bUid)!;
      const isMatch = a.pairId === b.pairId && a.lang !== b.lang;
      setTimeout(() => {
        if (isMatch) {
          setMatched((prev) => new Set([...prev, aUid, bUid]));
          setMatchedPairs((prev) => new Set([...prev, a.pairId]));
          setMessage("¡Par correcto! ✓");
          setFlipped([]);
        } else {
          setShakeUid(bUid);
          setMessage("No es la traducción — se voltean");
          setTimeout(() => {
            setShakeUid(null);
            setFlipped([]);
          }, 650);
        }
      }, 700);
    }
  }

  const handleSubmit = withTiming((fd) => {
    fd.set("user_answer", JSON.stringify(won ? pairs.map((p) => p.aymara_word) : []));
  });

  const handleSurrender = () => {
    const fd = new FormData();
    handleSubmit(fd);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{matchedPairs.size}/{totalPairs} pares · {moves} movimientos</span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${won ? "bg-emerald-500 text-white" : "bg-muted"}`}>{won ? "¡Completado!" : message}</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {deck.map((card) => {
          const isFlipped = flipped.includes(card.uid) || matched.has(card.uid);
          const isMatched = matched.has(card.uid);
          const isShaking = shakeUid === card.uid;
          return (
            <button
              key={card.uid}
              type="button"
              onClick={() => handleFlip(card.uid)}
              disabled={isMatched}
              className={`relative h-24 sm:h-28 rounded-xl select-none [perspective:800px] ${isShaking ? "animate-[shake_0.4s_ease]" : ""} ${isMatched ? "opacity-70" : "hover:scale-[1.02]"}`}
            >
              <div className={`absolute inset-0 rounded-xl transition-all duration-500 [transform-style:preserve-3d] ${isFlipped ? "[transform:rotateY(180deg)]" : ""}`}>
                <div className="absolute inset-0 rounded-xl panel border border-border flex flex-col items-center justify-center gap-1 [backface-visibility:hidden]">
                  <span className="text-[10px] tracking-widest text-muted-foreground">{card.lang === "ay" ? "AYM" : "ESP"}</span>
                  <span className="text-xl">?</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${card.lang === "ay" ? "bg-sky-500/20 text-sky-300" : "bg-amber-500/20 text-amber-300"}`}>{card.lang === "ay" ? "Aymara" : "Español"}</span>
                </div>
                <div className={`absolute inset-0 rounded-xl flex flex-col items-center justify-center p-2 text-center [transform:rotateY(180deg)] [backface-visibility:hidden] border shadow ${isMatched ? "bg-emerald-500/15 border-emerald-500/30" : card.lang === "ay" ? "bg-sky-50 border-sky-200 text-zinc-900" : "bg-amber-50 border-amber-200 text-zinc-900"}`}>
                  <span className="text-xs font-bold leading-tight line-clamp-3">{card.label}</span>
                  <span className="text-[9px] mt-1 opacity-60">{card.lang === "ay" ? "Aymara" : "Español"}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <form action={handleSubmit} className="flex gap-2">
        <Button type="submit" variant={won ? "gradient" : "outline"} disabled={!won} className="flex-1">
          {won ? "Enviar — ¡todo emparejado!" : `Faltan ${totalPairs - matchedPairs.size} pares`}
        </Button>
        {!won && (
          <Button type="button" variant="ghost" onClick={handleSurrender}>Rendirse</Button>
        )}
      </form>

      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}`}</style>
    </div>
  );
}
