import { memo } from "react";
import { Headphones } from "lucide-react";
import { cn } from "@/lib/utils";
import { SlideView } from "../SlideStage";
import type { Slide } from "./tipos";

export const Miniatura = memo(function Miniatura({
  slide, i, activa, arrastrando, onElegir, onDragStart, onDrop, onDragEnd,
}: {
  slide: Slide; i: number; activa: boolean; arrastrando: boolean;
  onElegir: (i: number) => void; onDragStart: (i: number) => void; onDrop: (i: number) => void; onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(i)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(i)}
      onDragEnd={onDragEnd}
      className="shrink-0 w-32 md:w-full"
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 72px" }}
    >
      <button
        type="button"
        onClick={() => onElegir(i)}
        aria-label={`Diapositiva ${i + 1}`}
        aria-current={activa}
        className={cn("relative block w-full rounded-md overflow-hidden border-2 transition-colors", activa ? "border-primary" : "border-border hover:border-primary/50", arrastrando && "opacity-40")}
      >
        <div className="pointer-events-none"><SlideView canvas={slide.canvas} /></div>
        <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-[10px] font-semibold text-white">{i + 1}</span>
        {slide.audioId && <Headphones className="absolute right-1 top-1 h-3.5 w-3.5 rounded bg-black/60 p-0.5 text-white" aria-label="Tiene audio" />}
      </button>
    </div>
  );
});
