import { cn } from "@/lib/utils";
import { SWATCHES } from "./constantes";

export const tb = "h-8 min-w-8 px-2 inline-flex items-center justify-center gap-1 rounded-md text-xs font-medium border border-transparent hover:bg-muted disabled:opacity-40 disabled:pointer-events-none [&_svg]:size-4";
export const activo = "bg-primary/15 text-primary border-primary/30";

export function Colores({ valor, onPick, etiqueta, quitable }: { valor?: string; onPick: (c: string) => void; etiqueta: string; quitable?: boolean }) {
  return (
    <>
      {SWATCHES.map((c) => (
        <button key={c} type="button" aria-label={`${etiqueta} ${c}`} onClick={() => onPick(c)} className={cn("h-5 w-5 rounded-full border", valor === c ? "ring-2 ring-primary ring-offset-1" : "border-border")} style={{ background: c }} />
      ))}
      <input type="color" aria-label={`${etiqueta} personalizado`} value={valor && valor.startsWith("#") ? valor : "#000000"} onChange={(e) => onPick(e.target.value)} className="h-6 w-7 cursor-pointer rounded border border-border bg-transparent p-0" />
      {quitable && <button type="button" className={cn(tb, valor === "none" && activo)} onClick={() => onPick("none")}>Sin</button>}
    </>
  );
}

export function Deslizador({ etiqueta, valor, min, max, onChange }: { etiqueta: string; valor: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-1 text-xs text-muted-foreground">
      {etiqueta}
      <input type="range" min={min} max={max} value={valor} onChange={(e) => onChange(Number(e.target.value))} className="w-20" aria-label={etiqueta} />
    </label>
  );
}
