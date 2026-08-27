"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { submitArExam } from "@/app/(app)/exams/[id]/ar-actions";

type Card = { id: number; code: string; title: string; markerImageUrl: string };
type ReqResult = { requestedCode: string; requestedTitle: string; detectedCode: string | null; correct: boolean; timeMs: number };

function buildRequests(cards: Card[], n: number): number[] {
  const out: number[] = [];
  let last = -1;
  for (let i = 0; i < n; i++) {
    let idx = Math.floor(Math.random() * cards.length);
    if (cards.length > 1 && idx === last) idx = (idx + 1) % cards.length;
    out.push(idx);
    last = idx;
  }
  return out;
}

export function ArExamRunner({
  examId,
  cards,
  requestCount,
  timeLimitSeconds,
  minScore,
}: {
  examId: number;
  cards: Card[];
  requestCount: number;
  timeLimitSeconds: number;
  minScore: number;
}) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "manual">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const requests = useMemo(() => buildRequests(cards, requestCount), [cards, requestCount]);
  const [step, setStep] = useState(0);
  const [detectedIndex, setDetectedIndex] = useState<number | null>(null);
  const detectedRef = useRef<number | null>(null);
  detectedRef.current = detectedIndex;

  const [results, setResults] = useState<ReqResult[]>([]);
  const resultsRef = useRef<ReqResult[]>([]);
  resultsRef.current = results;

  const [secondsLeft, setSecondsLeft] = useState(timeLimitSeconds);
  const [finished, setFinished] = useState(false);
  const [finalResult, setFinalResult] = useState<{ passed: boolean; percentage: number; arCardId: number | null } | null>(null);
  const startRef = useRef(Date.now());
  const stepStartRef = useRef(Date.now());
  const finishedRef = useRef(false);

  const finish = useCallback(async () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const timeSpent = Math.round((Date.now() - startRef.current) / 1000);
    const r = await submitArExam(examId, { timeSpent, results: resultsRef.current });
    setFinalResult(r);
    setFinished(true);
  }, [examId]);

  const submitCurrent = useCallback(
    (detected: number | null) => {
      const reqIdx = requests[step];
      const requested = cards[reqIdx];
      const detCard = detected != null ? cards[detected] : null;
      const rr: ReqResult = {
        requestedCode: requested.code,
        requestedTitle: requested.title,
        detectedCode: detCard?.code ?? null,
        correct: detected === reqIdx,
        timeMs: Date.now() - stepStartRef.current,
      };
      const next = [...resultsRef.current, rr];
      setResults(next);
      setDetectedIndex(null);
      if (next.length >= requests.length) {
        void finish();
      } else {
        setStep((s) => s + 1);
        stepStartRef.current = Date.now();
      }
    },
    [requests, step, cards, finish],
  );

  // Cronómetro
  useEffect(() => {
    if (finished) return;
    const t = setInterval(() => {
      const left = timeLimitSeconds - Math.floor((Date.now() - startRef.current) / 1000);
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(t);
        // completa los pasos restantes como incorrectos
        void finish();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [finished, timeLimitSeconds, finish]);

  // Montaje de la escena AR con TODAS las tarjetas como targets
  useEffect(() => {
    let cancelled = false;
    let sceneEl: HTMLElement | null = null;
    let objectUrl: string | null = null;

    async function init() {
      try {
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
          throw new Error("Sin acceso a cámara en este dispositivo.");
        }
        await import("aframe");
        await import("mind-ar/dist/mindar-image-aframe.prod.js");
        const { Compiler } = await import("mind-ar/dist/mindar-image.prod.js");

        const imgs = await Promise.all(
          cards.map(
            (c) =>
              new Promise<HTMLImageElement>((resolve, reject) => {
                const im = new Image();
                im.crossOrigin = "anonymous";
                im.onload = () => resolve(im);
                im.onerror = () => reject(new Error(`No se pudo cargar el marcador de ${c.title}.`));
                im.src = c.markerImageUrl;
              }),
          ),
        );
        if (cancelled) return;

        const compiler = new Compiler();
        await compiler.compileImageTargets(imgs, () => {});
        const buffer = await compiler.exportData();
        if (cancelled || !containerRef.current) return;
        objectUrl = URL.createObjectURL(new Blob([buffer as BlobPart]));

        const targets = cards
          .map(
            (_, i) =>
              `<a-entity mindar-image-target="targetIndex: ${i}" data-idx="${i}"><a-plane color="#10b981" opacity="0.35" width="1" height="1"></a-plane></a-entity>`,
          )
          .join("");

        containerRef.current.innerHTML = `
          <a-scene mindar-image="imageTargetSrc: ${objectUrl}; autoStart: true; uiScanning: no; uiLoading: no; maxTrack: 1"
            vr-mode-ui="enabled: false" device-orientation-permission-ui="enabled: false" embedded style="width:100%;height:100%;">
            <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
            ${targets}
          </a-scene>`;

        sceneEl = containerRef.current.querySelector("a-scene");
        containerRef.current.querySelectorAll("[mindar-image-target]").forEach((el) => {
          const idx = Number((el as HTMLElement).dataset.idx);
          el.addEventListener("targetFound", () => setDetectedIndex(idx));
          el.addEventListener("targetLost", () => setDetectedIndex((cur) => (cur === idx ? null : cur)));
        });
        setStatus("ready");
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : "Error iniciando AR.");
          setStatus("manual");
        }
      }
    }
    init();
    return () => {
      cancelled = true;
      try {
        // @ts-expect-error runtime shape
        sceneEl?.systems?.["mindar-image-system"]?.stop?.();
      } catch {
        /* ignore */
      }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      try {
        if (containerRef.current) containerRef.current.innerHTML = "";
      } catch {
        /* ignore */
      }
    };
  }, [cards]);

  const mm = Math.floor(Math.max(0, secondsLeft) / 60);
  const ss = Math.max(0, secondsLeft) % 60;
  const reqCard = cards[requests[step]];

  if (finished && finalResult) {
    return (
      <div className="glass-strong rounded-2xl p-8 max-w-sm mx-auto text-center space-y-3">
        <h2 className="text-xl font-bold">{finalResult.passed ? "¡Examen AR aprobado! 🎉" : "Examen AR completado"}</h2>
        <p className="text-sm">Aciertos: {results.filter((r) => r.correct).length}/{requests.length}</p>
        <p className="text-sm">Porcentaje: {finalResult.percentage}% (mínimo {minScore}%)</p>
        {finalResult.arCardId && <p className="text-sm text-emerald-400">🎯 Desbloqueaste una tarjeta AR.</p>}
        <div className="flex gap-2 justify-center pt-2">
          <Button variant="gradient" onClick={() => router.push("/map")}>Volver al mapa</Button>
          <Button variant="outline" onClick={() => router.push(`/exams/history`)}>Ver historial</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm">
          Solicitud {step + 1}/{requests.length}: <b>Muestra la tarjeta «{reqCard?.title}»</b>
        </p>
        <Badge variant={secondsLeft <= 20 ? "destructive" : "outline"} className="font-mono">{mm}:{String(ss).padStart(2, "0")}</Badge>
      </div>

      <div className="relative w-full h-80 rounded-xl overflow-hidden bg-black">
        <div ref={containerRef} className="absolute inset-0" />
        {status === "loading" && <div className="absolute inset-0 flex items-center justify-center text-white text-sm">Iniciando cámara AR…</div>}
        {status === "ready" && detectedIndex != null && (
          <div className="absolute bottom-2 inset-x-2 text-center text-xs bg-emerald-600/80 text-white rounded-lg py-1">
            Detectada: {cards[detectedIndex]?.title}
          </div>
        )}
      </div>

      {status === "ready" && (
        <div className="flex gap-2 justify-center">
          <Button variant="gradient" disabled={detectedIndex == null} onClick={() => submitCurrent(detectedRef.current)}>
            Confirmar tarjeta mostrada
          </Button>
          <Button variant="outline" onClick={() => submitCurrent(null)}>No la tengo — saltar</Button>
        </div>
      )}

      {status === "manual" && (
        <div className="glass rounded-xl p-4 space-y-2">
          <p className="text-xs text-amber-300">{errorMsg} Modo sin cámara: indica qué tarjeta estás mostrando.</p>
          <div className="grid grid-cols-2 gap-2">
            {cards.map((c, i) => (
              <Button key={c.id} variant="outline" size="sm" onClick={() => submitCurrent(i)}>{c.title}</Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => submitCurrent(null)}>Ninguna</Button>
          </div>
        </div>
      )}
    </div>
  );
}
