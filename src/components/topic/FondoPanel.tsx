"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, RotateCcw, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GRADIENTES, PATTERNS, canvasBackgroundStyle, type PatternKind, type SlideCanvas,
} from "@/lib/slide-canvas";

/*
  Panel de fondo de la diapositiva: color, degradado, patrón e imagen. Las capas
  se combinan (p. ej. degradado + patrón, o imagen + velo de color) y se pueden
  copiar a todas las diapositivas para que el tema tenga una identidad visual.
*/

type Tab = "color" | "degradado" | "patron" | "imagen";

const COLORES = [
  "#ffffff", "#f8fafc", "#f1f5f9", "#e2e8f0", "#94a3b8", "#334155", "#1a1a2e", "#000000",
  "#fef3c7", "#fde68a", "#facc15", "#f59e0b", "#fed7aa", "#fb923c", "#ef4444", "#be185d",
  "#fbcfe8", "#ec4899", "#ddd6fe", "#8b5cf6", "#4c1d95", "#dbeafe", "#3b82f6", "#1e3a8a",
  "#a7f3d0", "#22c55e", "#166534", "#67e8f9", "#0ea5e9", "#0f766e", "#d6c3a3", "#7c4a1e",
];

const caja = "h-8 rounded-md border border-input bg-card px-2 text-xs";
const boton = "h-8 px-2.5 inline-flex items-center justify-center gap-1 rounded-md text-xs font-medium border border-transparent hover:bg-muted [&_svg]:size-4";
const activo = "bg-primary/15 text-primary border-primary/30";

function Slider({ etiqueta, valor, min, max, paso = 1, onChange, sufijo }: { etiqueta: string; valor: number; min: number; max: number; paso?: number; onChange: (v: number) => void; sufijo?: string }) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="w-20 shrink-0">{etiqueta}</span>
      <input type="range" min={min} max={max} step={paso} value={valor} onChange={(e) => onChange(Number(e.target.value))} className="w-32" aria-label={etiqueta} />
      <span className="w-10 tabular-nums">{Math.round(valor * (sufijo === "%" ? 100 : 1))}{sufijo}</span>
    </label>
  );
}

function ColorCampo({ etiqueta, valor, onChange }: { etiqueta: string; valor: string; onChange: (c: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="w-20 shrink-0">{etiqueta}</span>
      <input type="color" value={valor} onChange={(e) => onChange(e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-border bg-transparent p-0" aria-label={etiqueta} />
      <span className="font-mono">{valor}</span>
    </label>
  );
}

export function FondoPanel({
  canvas, onPatch, onReset, onApplyAll, onUpload, subiendo, totalDiapositivas,
}: {
  canvas: SlideCanvas;
  onPatch: (patch: Partial<SlideCanvas>, clave?: string) => void;
  onReset: () => void;
  onApplyAll: () => void;
  onUpload: (file: File) => void;
  subiendo: boolean;
  totalDiapositivas: number;
}) {
  const [tab, setTab] = useState<Tab>(canvas.bgMediaId ? "imagen" : canvas.background2 ? "degradado" : canvas.pattern ? "patron" : "color");
  const file = useRef<HTMLInputElement>(null);
  const tipo = canvas.gradType ?? "linear";

  const tabs: { id: Tab; label: string }[] = [
    { id: "color", label: "Color" },
    { id: "degradado", label: "Degradado" },
    { id: "patron", label: "Patrón" },
    { id: "imagen", label: "Imagen" },
  ];

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-3" aria-label="Opciones de fondo">
      <div className="flex flex-wrap items-center gap-1" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={cn(boton, tab === t.id && activo)} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <button type="button" className={boton} onClick={onApplyAll} disabled={totalDiapositivas < 2} title="Copia el fondo de esta diapositiva a todas las demás"><Layers /> Aplicar a todas</button>
          <button type="button" className={boton} onClick={onReset}><RotateCcw /> Restablecer</button>
        </div>
      </div>

      {tab === "color" && (
        <div className="flex flex-wrap items-center gap-1.5">
          {COLORES.map((c) => (
            <button key={c} type="button" aria-label={`Color ${c}`} onClick={() => onPatch({ background: c }, "bg")} className={cn("h-7 w-7 rounded-md border", canvas.background === c ? "ring-2 ring-primary ring-offset-1" : "border-border")} style={{ background: c }} />
          ))}
          <input type="color" aria-label="Color personalizado" value={canvas.background} onChange={(e) => onPatch({ background: e.target.value }, "bg")} className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent p-0" />
          <input
            aria-label="Código de color"
            className={cn(caja, "w-24 font-mono")}
            defaultValue={canvas.background}
            key={canvas.background}
            maxLength={7}
            onBlur={(e) => { const v = e.target.value.trim(); if (/^#[0-9a-fA-F]{6}$/.test(v)) onPatch({ background: v.toLowerCase() }, "bg"); else e.target.value = canvas.background; }}
          />
        </div>
      )}

      {tab === "degradado" && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {GRADIENTES.map((g) => {
              const estilo = canvasBackgroundStyle({ background: g.a, background2: g.b, gradType: g.tipo ?? "linear", gradAngle: g.angulo ?? 135, elements: [] });
              const elegido = canvas.background === g.a && canvas.background2 === g.b;
              return (
                <button
                  key={g.nombre}
                  type="button"
                  title={g.nombre}
                  aria-label={`Degradado ${g.nombre}`}
                  onClick={() => onPatch({ background: g.a, background2: g.b, gradType: g.tipo ?? "linear", gradAngle: g.angulo ?? 135, bgMediaId: undefined, bgOverlay: undefined, bgOverlayOpacity: undefined })}
                  className={cn("h-12 rounded-md border text-[10px] font-medium text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,.5)]", elegido ? "ring-2 ring-primary ring-offset-1" : "border-border")}
                  style={estilo}
                >
                  {g.nombre}
                </button>
              );
            })}
          </div>
          {canvas.background2 ? (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <ColorCampo etiqueta="Color inicial" valor={canvas.background} onChange={(c) => onPatch({ background: c }, "g1")} />
              <ColorCampo etiqueta="Color final" valor={canvas.background2} onChange={(c) => onPatch({ background2: c }, "g2")} />
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Tipo
                <select value={tipo} onChange={(e) => onPatch({ gradType: e.target.value as "linear" | "radial" })} className={caja} aria-label="Tipo de degradado">
                  <option value="linear">Lineal</option>
                  <option value="radial">Radial</option>
                </select>
              </label>
              {tipo === "linear" && <Slider etiqueta="Ángulo" valor={canvas.gradAngle ?? 135} min={0} max={360} onChange={(v) => onPatch({ gradAngle: v }, "ang")} sufijo="°" />}
              <button type="button" className={boton} onClick={() => onPatch({ background2: undefined, gradType: undefined, gradAngle: undefined })}>Quitar degradado</button>
            </div>
          ) : (
            <button type="button" className={boton} onClick={() => onPatch({ background2: "#dbeafe", gradType: "linear", gradAngle: 135 })}>+ Crear degradado con el color actual</button>
          )}
        </div>
      )}

      {tab === "patron" && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-9">
            <button type="button" onClick={() => onPatch({ pattern: undefined })} className={cn("h-14 rounded-md border bg-background text-[10px]", !canvas.pattern ? "ring-2 ring-primary ring-offset-1" : "border-border")}>Ninguno</button>
            {(Object.keys(PATTERNS) as PatternKind[]).map((k) => {
              const estilo = canvasBackgroundStyle({ background: "#ffffff", pattern: k, patternColor: "#1e3a8a", patternOpacity: 0.55, patternSize: 24, elements: [] });
              return (
                <button key={k} type="button" title={PATTERNS[k]} aria-label={`Patrón ${PATTERNS[k]}`} onClick={() => onPatch({ pattern: k, patternColor: canvas.patternColor ?? "#1e3a8a", patternOpacity: canvas.patternOpacity ?? 0.2, patternSize: canvas.patternSize ?? 48 })} className={cn("h-14 rounded-md border", canvas.pattern === k ? "ring-2 ring-primary ring-offset-1" : "border-border")} style={estilo} />
              );
            })}
          </div>
          {canvas.pattern && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <ColorCampo etiqueta="Color" valor={canvas.patternColor ?? "#000000"} onChange={(c) => onPatch({ patternColor: c }, "pc")} />
              <Slider etiqueta="Intensidad" valor={canvas.patternOpacity ?? 0.12} min={0.02} max={1} paso={0.01} onChange={(v) => onPatch({ patternOpacity: v }, "po")} sufijo="%" />
              <Slider etiqueta="Tamaño" valor={canvas.patternSize ?? 48} min={12} max={160} onChange={(v) => onPatch({ patternSize: v }, "ps")} sufijo=" px" />
            </div>
          )}
        </div>
      )}

      {tab === "imagen" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={cn(boton, "border-border")} onClick={() => file.current?.click()} disabled={subiendo}>
              {subiendo ? <Loader2 className="animate-spin" /> : <ImageIcon />} {canvas.bgMediaId ? "Cambiar imagen" : "Subir imagen de fondo"}
            </button>
            {canvas.bgMediaId && <button type="button" className={boton} onClick={() => onPatch({ bgMediaId: undefined, bgOverlay: undefined, bgOverlayOpacity: undefined })}>Quitar imagen</button>}
            <span className="text-xs text-muted-foreground">Se recorta para cubrir toda la diapositiva. JPG, PNG o WebP.</span>
          </div>
          {canvas.bgMediaId && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <ColorCampo etiqueta="Velo de color" valor={canvas.bgOverlay ?? "#000000"} onChange={(c) => onPatch({ bgOverlay: c }, "vc")} />
              <Slider etiqueta="Intensidad" valor={canvas.bgOverlayOpacity ?? 0} min={0} max={0.9} paso={0.01} onChange={(v) => onPatch({ bgOverlayOpacity: v }, "vo")} sufijo="%" />
              <span className="text-xs text-muted-foreground">Un velo oscuro o claro ayuda a que el texto se lea sobre la foto.</span>
            </div>
          )}
          <input ref={file} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onUpload(f); }} />
        </div>
      )}
    </div>
  );
}
