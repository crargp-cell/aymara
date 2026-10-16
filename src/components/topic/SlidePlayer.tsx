"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Pause, Play, Volume2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SlideView as SlideData } from "@/lib/topic-slides";
import { SlideView as CanvasView } from "./SlideStage";

/*
  Reproductor de temas didácticos: una diapositiva a la vez, con imagen y audio.

  El audio no arranca solo salvo que el alumno active "Audio automático" (los
  navegadores bloquean el autoplay sin un gesto previo; aquí siempre hay uno, el
  clic en Siguiente). Al cambiar de diapositiva la pista anterior se corta.
*/

function Diapositiva({ slide }: { slide: SlideData }) {
  const sinGrabacion = slide.canvas.elements.some((e) => e.type === "sound" && !e.mediaId);
  return (
    <div className="space-y-2">
      <CanvasView canvas={slide.canvas} interactivo className="rounded-lg border border-border shadow-sm" />
      {sinGrabacion && <p className="text-xs text-muted-foreground">🔊 Toca los botones de sonido para escuchar. El símbolo ≈ indica que la voz es aproximada: la pronunciación exacta te la enseña tu profesor.</p>}
    </div>
  );
}

export function SlidePlayer({
  slides,
  completed = false,
  onFinish,
}: {
  slides: SlideData[];
  completed?: boolean;
  /** Server action que marca el tema como leído (sólo alumnos). */
  onFinish?: () => Promise<void>;
}) {
  const [index, setIndex] = useState(0);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [auto, setAuto] = useState(false);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [hecho, setHecho] = useState(completed);
  const [pendiente, iniciar] = useTransition();
  const contenedor = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement>(null);

  const total = slides.length;
  const actual = slides[index];
  const ultima = index === total - 1;

  const ir = useCallback((i: number) => setIndex(Math.min(Math.max(i, 0), total - 1)), [total]);

  // Al cambiar de diapositiva: corta la pista anterior y, si está activo, lanza la nueva.
  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
    setReproduciendo(false);
    if (auto && actual?.audioUrl) {
      el.load();
      el.play().then(() => setReproduciendo(true)).catch(() => { /* el navegador lo bloqueó: queda el botón manual */ });
    }
  }, [index, auto, actual?.audioUrl]);

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
      if (e.key === "ArrowRight") ir(index + 1);
      if (e.key === "ArrowLeft") ir(index - 1);
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [index, ir]);

  useEffect(() => {
    const cambio = () => setPantallaCompleta(document.fullscreenElement === contenedor.current);
    document.addEventListener("fullscreenchange", cambio);
    return () => document.removeEventListener("fullscreenchange", cambio);
  }, []);

  function alternarAudio() {
    const el = audio.current;
    if (!el) return;
    if (el.paused) el.play().then(() => setReproduciendo(true)).catch(() => setReproduciendo(false));
    else { el.pause(); setReproduciendo(false); }
  }

  function alternarPantallaCompleta() {
    if (document.fullscreenElement) document.exitFullscreen();
    else contenedor.current?.requestFullscreen?.();
  }

  function terminar() {
    if (!onFinish || hecho) return;
    iniciar(async () => {
      await onFinish();
      setHecho(true);
    });
  }

  if (total === 0 || !actual) return null;

  return (
    <div
      ref={contenedor}
      className={cn("panel rounded-2xl flex flex-col", pantallaCompleta && "rounded-none bg-background p-6 overflow-auto")}
      role="region"
      aria-roledescription="presentación"
      aria-label={`Diapositiva ${index + 1} de ${total}`}
    >
      <div className="h-1.5 w-full bg-muted rounded-t-2xl overflow-hidden" aria-hidden>
        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>

      <div className="flex items-center justify-between gap-2 px-4 pt-3 text-xs text-muted-foreground">
        <span>Diapositiva {index + 1} de {total}</span>
        <div className="flex items-center gap-1">
          <label className="flex items-center gap-1.5 mr-2 cursor-pointer select-none">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            Audio automático
          </label>
          <Button type="button" size="icon" variant="ghost" onClick={alternarPantallaCompleta} aria-label={pantallaCompleta ? "Salir de pantalla completa" : "Pantalla completa"}>
            {pantallaCompleta ? <Minimize2 /> : <Maximize2 />}
          </Button>
        </div>
      </div>

      <div key={actual.id} className="flex-1 px-4 md:px-8 py-6">
        <Diapositiva slide={actual} />
      </div>

      {/* Un único <audio>: la fuente cambia con la diapositiva. */}
      <audio ref={audio} src={actual.audioUrl ?? undefined} preload="none" onEnded={() => setReproduciendo(false)} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
        <Button type="button" variant="outline" onClick={() => ir(index - 1)} disabled={index === 0}>
          <ChevronLeft /> Anterior
        </Button>

        <div className="flex items-center gap-3 order-last w-full justify-center md:order-none md:w-auto">
          {actual.audioUrl && (
            <Button type="button" variant="secondary" size="sm" onClick={alternarAudio}>
              {reproduciendo ? <Pause /> : <Play />} <Volume2 /> {reproduciendo ? "Pausar" : "Escuchar"}
            </Button>
          )}
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Diapositivas">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Ir a la diapositiva ${i + 1}`}
                onClick={() => ir(i)}
                className={cn("h-2.5 rounded-full transition-all", i === index ? "w-6 bg-primary" : "w-2.5 bg-border hover:bg-muted-foreground/50")}
              />
            ))}
          </div>
        </div>

        {!ultima ? (
          <Button type="button" onClick={() => ir(index + 1)}>
            Siguiente <ChevronRight />
          </Button>
        ) : onFinish ? (
          <Button type="button" variant="gradient" onClick={terminar} disabled={hecho || pendiente}>
            <CheckCircle2 /> {hecho ? "Tema completado" : pendiente ? "Guardando…" : "Terminar tema"}
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={() => ir(0)}>Volver al inicio</Button>
        )}
      </div>
    </div>
  );
}
