"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { submitArExam } from "@/app/(app)/exams/[id]/ar-actions";

type Card = { id: number; code: string; title: string; markerImageUrl: string; modelUrl?: string | null };
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
  const camPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camActive, setCamActive] = useState(false);
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

    async function startMiniCam() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } });
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = s;
        if (camPreviewRef.current) { camPreviewRef.current.srcObject = s; await camPreviewRef.current.play().catch(() => {}); setCamActive(true); }
      } catch { setCamActive(false); }
    }

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
          .map((c, i) => {
            const content = c.modelUrl
              ? `<a-entity gltf-model="url(${c.modelUrl})" position="0 0 0.2" scale="0.4 0.4 0.4" animation="property: rotation; to: 0 360 0; loop: true; dur: 8000"></a-entity>`
              : `<a-box position="0 0 0.15" scale="0.9 0.9 0.15" color="#10b981" material="opacity: 0.95; metalness: 0.2"></a-box><a-text value="${c.title.replace(/"/g, "&quot;")} " align="center" position="0 0 0.35" color="#ffffff" width="1.8" shader="msdf"></a-text>`;
            return `<a-entity mindar-image-target="targetIndex: ${i}" data-idx="${i}">${content}</a-entity>`;
          })
          .join("");

        containerRef.current.innerHTML = `
          <a-scene mindar-image="imageTargetSrc: ${objectUrl}; autoStart: true; uiScanning: no; uiLoading: no; maxTrack: 1; filterMinCF:0.0001; filterBeta: 1000; warmupTolerance: 10; missTolerance: 12"
            vr-mode-ui="enabled: false" device-orientation-permission-ui="enabled: false" renderer="colorManagement: true; alpha: true" embedded style="width:100%;height:100%;">
            <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
            ${targets}
          </a-scene>`;

        sceneEl = containerRef.current.querySelector("a-scene");
        const foundTimers = new Map<number, any>();
        const lostTimers = new Map<number, any>();
        let pendingIdx: number | null = null;
        containerRef.current.querySelectorAll("[mindar-image-target]").forEach((el) => {
          const idx = Number((el as HTMLElement).dataset.idx);
          el.addEventListener("targetFound", () => {
            pendingIdx = idx;
            if (lostTimers.get(idx)) { clearTimeout(lostTimers.get(idx)); lostTimers.delete(idx); }
            if (foundTimers.get(idx)) clearTimeout(foundTimers.get(idx));
            const t = setTimeout(() => {
              if (pendingIdx === idx) setDetectedIndex(idx);
              foundTimers.delete(idx);
            }, 320);
            foundTimers.set(idx, t);
          });
          el.addEventListener("targetLost", () => {
            if (pendingIdx !== idx) return;
            if (foundTimers.get(idx)) { clearTimeout(foundTimers.get(idx)); foundTimers.delete(idx); }
            if (lostTimers.get(idx)) clearTimeout(lostTimers.get(idx));
            const t = setTimeout(() => {
              setDetectedIndex((cur) => (cur === idx ? null : cur));
              if (pendingIdx === idx) pendingIdx = null;
              lostTimers.delete(idx);
            }, 700);
            lostTimers.set(idx, t);
          });
        });
        setStatus("ready");
        void startMiniCam();
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
      if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
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
      <div className="panel-strong rounded-2xl p-8 max-w-sm mx-auto text-center space-y-3">
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

  const progressPct = ((step) / requests.length) * 100;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-base sm:text-lg font-semibold">
            Solicitud <span className="text-primary">{step + 1}/{requests.length}</span>: <span className="panel px-2 py-1 rounded-lg text-sm sm:text-base">«{reqCard?.title}»</span>
          </p>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-32 h-2 rounded-full bg-muted overflow-hidden">
              <span className="block h-full transition-all" style={{ width: `${progressPct}%`, background: "var(--ruta-completado)" }} />
            </span>
            <span className="text-muted-foreground">{results.filter((r) => r.correct).length} aciertos</span>
          </div>
        </div>
        <Badge variant={secondsLeft <= 30 ? "destructive" : "outline"} className="font-mono text-sm px-3 py-1 self-start sm:self-auto">{mm}:{String(ss).padStart(2, "0")}</Badge>
      </div>

      <div className="relative w-full h-[62vh] min-h-[420px] max-h-[740px] rounded-2xl overflow-hidden bg-black shadow-2xl border border-border">
        <div ref={containerRef} className="absolute inset-0" />

        <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">
          <div className="relative w-28 h-20 sm:w-36 sm:h-24 rounded-xl overflow-hidden border-2 border-white/80 shadow-lg bg-black">
            <video ref={camPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
            {!camActive && status === "loading" && <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white/70 bg-black/50">cámara…</div>}
            {status === "manual" && <div className="absolute inset-0 flex items-center justify-center text-[10px] text-amber-300 bg-black/60">sin AR</div>}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-8 h-8 border border-white/90 rounded-sm relative">
                <div className="absolute inset-0 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-white rounded-full shadow" /></div>
                <div className="absolute -top-0.5 -left-0.5 w-2 h-2 border-t-2 border-l-2 border-white rounded-tl-sm" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 border-t-2 border-r-2 border-white rounded-tr-sm" />
                <div className="absolute -bottom-0.5 -left-0.5 w-2 h-2 border-b-2 border-l-2 border-white rounded-bl-sm" />
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 border-b-2 border-r-2 border-white rounded-br-sm" />
              </div>
            </div>
            <span className="absolute bottom-0.5 left-1 text-[8px] font-mono bg-black/60 text-white px-1 rounded">mini visor</span>
          </div>
          <span className="text-[10px] text-white/70 bg-black/40 backdrop-blur px-2 py-0.5 rounded-full w-fit">Apuntá al centro</span>
        </div>

        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[58%] h-[58%] max-w-[340px] max-h-[340px] border border-white/15 rounded-2xl relative hidden sm:block">
            <div className="absolute inset-0 border border-dashed border-white/12 rounded-2xl" />
          </div>
        </div>

        {status === "loading" && <div className="absolute inset-0 flex items-center justify-center text-white text-sm bg-black/30 backdrop-blur-[1px]">Iniciando cámara AR…</div>}
        {status === "ready" && detectedIndex != null && (
          <div className="absolute bottom-3 inset-x-3 text-center text-sm font-medium bg-emerald-600 text-white rounded-xl py-2 shadow-lg border border-white/20">
            ✓ Detectada: {cards[detectedIndex]?.title}
          </div>
        )}
        {status === "ready" && detectedIndex == null && (
          <div className="absolute bottom-3 inset-x-3 text-center text-xs bg-black/60 text-white/80 rounded-xl py-1.5 backdrop-blur border border-border px-2">
            Mostrá «{reqCard?.title}» bien iluminada, a 20-30cm, mantené firme 1s. Si parpadea, limpiá la cámara.
          </div>
        )}
      </div>

      {status === "ready" && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="gradient" size="lg" disabled={detectedIndex == null} onClick={() => submitCurrent(detectedRef.current)} className="text-base px-8 py-6 shadow-lg disabled:opacity-50">
            {detectedIndex != null ? `Confirmar «${cards[detectedIndex]?.title}»` : "Esperando tarjeta…"}
          </Button>
          <Button variant="outline" size="lg" onClick={() => submitCurrent(null)} className="px-6">No la tengo — saltar</Button>
        </div>
      )}

      {status === "manual" && (
        <div className="panel rounded-2xl p-5 space-y-3 border border-amber-500/20">
          <p className="text-sm text-amber-300">{errorMsg} — Modo sin cámara: elegí qué tarjeta estás mostrando.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {cards.map((c, i) => (
              <Button key={c.id} variant="outline" onClick={() => submitCurrent(i)} className="justify-start">{c.title}</Button>
            ))}
            <Button variant="ghost" onClick={() => submitCurrent(null)}>Ninguna</Button>
          </div>
        </div>
      )}
    </div>
  );
}
