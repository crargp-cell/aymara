"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { submitWordMatchExam } from "@/app/(app)/exams/[id]/actions";

type Word = { id: number; text: string; category: string };

const CATEGORY_COLORS = [
  "linear-gradient(90deg,#2563eb,#0ea5a4)",
  "linear-gradient(90deg,#8b5cf6,#7c3aed)",
  "linear-gradient(90deg,#f59e0b,#d97706)",
  "linear-gradient(90deg,#10b981,#059669)",
  "linear-gradient(90deg,#ef4444,#dc2626)",
  "linear-gradient(90deg,#ec4899,#db2777)",
];

export function WordMatchGame({ examId, timeLimitSeconds, words }: { examId: number; timeLimitSeconds: number; words: Word[] }) {
  const router = useRouter();
  const wordsById = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);
  const categories = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const w of words) map.set(w.category, [...(map.get(w.category) ?? []), w.id]);
    return map;
  }, [words]);
  const categoryColor = useMemo(() => {
    const m = new Map<string, string>();
    [...categories.keys()].forEach((cat, i) => m.set(cat, CATEGORY_COLORS[i % CATEGORY_COLORS.length]));
    return m;
  }, [categories]);

  const requiredSelection = useMemo(() => {
    const total = words.length;
    const categoryCount = categories.size || 1;
    const avgPerCategory = total / categoryCount;
    if (total < 8 || avgPerCategory < 2) return 2;
    if (total < 16 || avgPerCategory < 3) return 3;
    return 4;
  }, [words.length, categories.size]);

  const sparseCategories = useMemo(() => [...categories.values()].some((ids) => ids.length < 4), [categories]);

  const [selected, setSelected] = useState<number[]>([]);
  const [shakeIds, setShakeIds] = useState<Set<number>>(new Set());
  const [dragOverCat, setDragOverCat] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Map<number, string>>(new Map());
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState(
    sparseCategories ? "Toca o arrastra cada carta hasta su canasta." : "Selecciona cartas de la misma categoría para conectarlas."
  );
  const [secondsLeft, setSecondsLeft] = useState(timeLimitSeconds);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<{ passed: boolean; percentage: number; arCardId: number | null } | null>(null);
  const startRef = useRef(Date.now());
  const finishedRef = useRef(false);
  const placedRef = useRef(placed);
  placedRef.current = placed;

  const finish = async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const timeSpent = Math.round((Date.now() - startRef.current) / 1000);
    const placedNow = placedRef.current;
    const details = words.map((w) => ({
      ref: w.text,
      expected: w.category,
      respuesta: placedNow.get(w.id) ?? null,
      correct: placedNow.get(w.id) === w.category,
    }));
    const r = await submitWordMatchExam(examId, { totalWords: words.length, correctMatches: placedNow.size, timeSpent, details });
    setResult(r);
    setFinished(true);
  };

  useEffect(() => {
    if (finished) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      const left = timeLimitSeconds - elapsed;
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(interval);
        finish();
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  function toggleSelect(id: number) {
    if (finished || placed.has(id)) return;
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= requiredSelection) return prev;
      return [...prev, id];
    });
  }

  // Coincidencia automática: al juntar exactamente `requiredSelection` cartas de la misma
  // categoría por selección (click), da el bonus grande — igual que el sistema viejo.
  useEffect(() => {
    if (selected.length !== requiredSelection) return;
    const t = setTimeout(() => {
      const cats = selected.map((id) => wordsById.get(id)?.category);
      const allSame = cats.every((c) => c === cats[0]);
      if (allSame) {
        setScore((s) => s + 20);
        setPlaced((prev) => {
          const next = new Map(prev);
          selected.forEach((id) => next.set(id, cats[0]!));
          if (next.size === words.length) setTimeout(() => finish(), 400);
          return next;
        });
        setSelected([]);
        setMessage("¡Excelente! +20 puntos");
      } else {
        setShakeIds(new Set(selected));
        setMessage("Las cartas deben ser de la misma categoría");
        setTimeout(() => {
          setShakeIds(new Set());
          setSelected([]);
        }, 600);
      }
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, requiredSelection]);

  // Arrastrar (o tocar cartas seleccionadas + tocar una canasta): coloca de a una o varias
  // cartas en una categoría específica, sin necesitar juntar el grupo completo. Esto es lo que
  // permite completar categorías con pocas palabras (menos de `requiredSelection`).
  function placeInCategory(ids: number[], category: string) {
    const pending = ids.filter((id) => !placed.has(id));
    if (pending.length === 0) return;
    const allMatch = pending.every((id) => wordsById.get(id)?.category === category);
    if (!allMatch) {
      setShakeIds(new Set(pending));
      setMessage("Esa carta no es de esta categoría");
      setTimeout(() => setShakeIds(new Set()), 600);
      setSelected((prev) => prev.filter((id) => !pending.includes(id)));
      return;
    }
    setScore((s) => s + 10 * pending.length);
    setPlaced((prev) => {
      const next = new Map(prev);
      pending.forEach((id) => next.set(id, category));
      if (next.size === words.length) setTimeout(() => finish(), 400);
      return next;
    });
    setSelected((prev) => prev.filter((id) => !pending.includes(id)));
    setMessage(`¡Bien! +${10 * pending.length} puntos`);
  }

  function handleBasketDrop(e: DragEvent, category: string) {
    e.preventDefault();
    setDragOverCat(null);
    const id = Number(e.dataTransfer.getData("text/plain"));
    if (!Number.isFinite(id)) return;
    placeInCategory([id], category);
  }

  function handleBasketClick(category: string) {
    if (selected.length === 0) return;
    placeInCategory(selected, category);
  }

  const pool = words.filter((w) => !placed.has(w.id));
  const pct = Math.max(0, Math.min(100, (secondsLeft / timeLimitSeconds) * 100));
  const mm = Math.floor(Math.max(0, secondsLeft) / 60);
  const ss = Math.max(0, secondsLeft) % 60;

  if (words.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay suficientes palabras del diccionario para armar este examen todavía.</p>;
  }

  const basketList = [...categories.keys()].map((cat) => {
    const total = categories.get(cat)?.length ?? 0;
    const placedInCat = [...placed.entries()].filter(([, c]) => c === cat);
    return { cat, total, placedInCat };
  });

  return (
    <div className="space-y-4 pb-28 md:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Selecciona <strong>{requiredSelection}</strong> cartas del mismo tipo (seleccionadas: {selected.length}), o arrastrá/tocá una carta y su canasta.
        </p>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">★ {score} pts</Badge>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full transition-all" style={{ width: `${pct}%`, background: pct <= 25 ? "linear-gradient(90deg,#ef4444,#f97316)" : "linear-gradient(90deg,#06b6d4,#0ea5a4)" }} />
            </div>
            <Badge variant={pct <= 25 ? "destructive" : "outline"} className="font-mono">
              {mm}:{String(ss).padStart(2, "0")}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_280px] gap-4">
        <div className="glass rounded-2xl p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 min-h-[200px]">
            {pool.map((w) => {
              const isSelected = selected.includes(w.id);
              const isShaking = shakeIds.has(w.id);
              return (
                <button
                  key={w.id}
                  type="button"
                  draggable={!finished}
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", String(w.id))}
                  onClick={() => toggleSelect(w.id)}
                  disabled={finished}
                  className={`rounded-xl p-3 text-center font-semibold text-sm transition-all glass hover:-translate-y-0.5 cursor-grab active:cursor-grabbing ${isSelected ? "ring-2 ring-primary scale-[1.02]" : ""} ${isShaking ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
                >
                  {w.text}
                  <div className="h-1 rounded-full w-2/3 mx-auto mt-2" style={{ background: categoryColor.get(w.category) }} />
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">{message}</p>
        </div>

        {/* Canastas — escritorio: lista lateral. Móvil: barra fija abajo (ver más adelante). */}
        <aside className="hidden md:flex md:flex-col gap-3">
          {basketList.map(({ cat, total, placedInCat }) => (
            <div
              key={cat}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCat(cat);
              }}
              onDragLeave={() => setDragOverCat((c) => (c === cat ? null : c))}
              onDrop={(e) => handleBasketDrop(e, cat)}
              onClick={() => handleBasketClick(cat)}
              className={`glass rounded-xl p-3 transition-all cursor-pointer ${dragOverCat === cat ? "ring-2 ring-primary scale-[1.02]" : ""} ${selected.length > 0 ? "hover:ring-2 hover:ring-primary/50" : ""}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: categoryColor.get(cat) }} />
                  {cat}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({placedInCat.length}/{total})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                {placedInCat.map(([id]) => (
                  <span key={id} className="text-xs rounded-lg bg-primary/15 border border-primary/30 px-2 py-1">
                    {wordsById.get(id)?.text}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </aside>
      </div>

      {/* Cestas fijas móvil: reemplazan la lista lateral en pantallas chicas. */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-white/10 p-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {basketList.map(({ cat, total, placedInCat }) => (
            <div
              key={cat}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCat(cat);
              }}
              onDragLeave={() => setDragOverCat((c) => (c === cat ? null : c))}
              onDrop={(e) => handleBasketDrop(e, cat)}
              onClick={() => handleBasketClick(cat)}
              className={`shrink-0 w-24 glass rounded-xl p-2 text-center transition-all ${dragOverCat === cat ? "ring-2 ring-primary scale-105" : ""}`}
            >
              <span className="h-2 w-2 rounded-full inline-block mb-1" style={{ background: categoryColor.get(cat) }} />
              <p className="text-[11px] font-medium leading-tight line-clamp-1">{cat}</p>
              <p className="text-[10px] text-muted-foreground">
                {placedInCat.length}/{total}
              </p>
            </div>
          ))}
        </div>
      </div>

      {finished && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-strong rounded-2xl p-8 max-w-sm w-full text-center space-y-3">
            <h2 className="text-xl font-bold">{result.passed ? "¡Examen aprobado! 🎉" : "Examen completado"}</h2>
            <p className="text-sm">Puntuación: {score} pts</p>
            <p className="text-sm">Palabras conectadas: {placed.size}/{words.length}</p>
            <p className="text-sm">Porcentaje: {result.percentage}%</p>
            {result.arCardId && <p className="text-sm text-emerald-400">🎯 ¡Desbloqueaste una tarjeta AR!</p>}
            <p className={`text-sm ${result.passed ? "text-emerald-400" : "text-red-400"}`}>{result.passed ? "Aprobaste el examen." : "No alcanzaste el puntaje mínimo."}</p>
            <div className="flex gap-2 justify-center pt-2">
              <Button variant="gradient" onClick={() => router.push("/map")}>
                Volver al mapa
              </Button>
              <Button variant="outline" onClick={() => router.push("/exams")}>
                Ver exámenes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
