"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chiptune } from "@/lib/chiptune";
import { reproducirSonido } from "@/lib/slide-sound";
import { useArrastrar } from "@/lib/hooks/useArrastrar";
import { MallkuJuego } from "@/components/mascota/MallkuJuego";
import { cn } from "@/lib/utils";

/*
  Ejercicio «arrastra la tarjeta»: se da una palabra y se arrastra a ella la tarjeta
  con la imagen que le corresponde (con ratón, con el dedo, o tocando la tarjeta y
  luego el hueco). Lo elegido se comprueba en el servidor como una opción más: el
  navegador no sabe cuál es la correcta.
*/

export type Tarjeta = { id: number; imageId: number | null };

const DESTINO = "palabra";

export function DragCardGame({
  palabra, tarjetas, onEnviar, enviando, sinMallku = false,
}: {
  palabra: string;
  tarjetas: Tarjeta[];
  onEnviar: (opcionId: number) => void;
  enviando: boolean;
  sinMallku?: boolean;
}) {
  // Barajar al azar en el primer render daría un orden distinto en servidor y cliente
  // (error de hidratación): el orden sólo existe tras montar.
  const [orden, setOrden] = useState<Tarjeta[] | null>(null);
  const [colocada, setColocada] = useState<number | null>(null);
  const [elegida, setElegida] = useState<number | null>(null);
  const [sonando, setSonando] = useState(false);
  const audio = useRef<Chiptune | null>(null);

  useEffect(() => {
    const a = [...tarjetas];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrden(a);
    const c = new Chiptune();
    audio.current = c;
    return () => c.dispose();
  }, [tarjetas]);

  const poner = useCallback((id: number) => {
    audio.current?.unlock();
    audio.current?.sfx("select");
    setColocada(id);
    setElegida(null);
  }, []);

  const { fantasma, sobre, props } = useArrastrar({
    habilitado: !enviando,
    alSoltar: (id, destino) => { if (destino === DESTINO) poner(Number(id)); },
    // Un toque elige la tarjeta; otro toque en el hueco la coloca.
    alTocar: (id) => setElegida((e) => (e === Number(id) ? null : Number(id))),
  });

  const porId = new Map(tarjetas.map((t) => [t.id, t]));
  const enHueco = colocada !== null ? porId.get(colocada) : null;
  const libres = (orden ?? []).filter((t) => t.id !== colocada);

  const imagen = (t: Tarjeta, cls: string) =>
    t.imageId ? (
      // <img> a propósito: /api/exercise-media pide sesión y el optimizador de next/image no manda cookies.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`/api/exercise-media/${t.imageId}`} alt="" draggable={false} className={cn("select-none object-contain", cls)} />
    ) : <span className="text-xs text-muted-foreground">Sin imagen</span>;

  return (
    <div className="space-y-4">
      {!sinMallku && <MallkuJuego estado={colocada === null ? { tipo: "pensando", palabra } : { tipo: "pensando" }} />}

      {/* La palabra y su hueco */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-primary px-5 py-3 text-2xl font-bold text-primary-foreground shadow">{palabra}</span>
          <button
            type="button"
            onClick={() => { setSonando(true); void reproducirSonido(palabra).finally(() => setSonando(false)); }}
            className="inline-flex h-10 items-center gap-1 rounded-full border border-input bg-card px-3 text-xs font-medium hover:bg-muted"
            aria-label={`Escuchar «${palabra}»`}
            title="Pronunciación aproximada"
          >
            <Volume2 className="h-4 w-4" /> {sonando ? "…" : "≈"}
          </button>
        </div>
        <span aria-hidden className="text-2xl text-muted-foreground">→</span>
        <button
          type="button"
          data-destino={DESTINO}
          onClick={() => { if (elegida !== null) poner(elegida); }}
          aria-label={enHueco ? "Tarjeta colocada" : "Hueco para la tarjeta"}
          className={cn(
            "relative flex h-36 w-36 items-center justify-center rounded-2xl border-2 border-dashed bg-card p-2 transition-colors sm:h-44 sm:w-44",
            sobre === DESTINO || (elegida !== null && !enHueco) ? "border-primary bg-primary/10" : "border-border",
            enHueco && "border-solid border-primary",
          )}
        >
          {enHueco ? imagen(enHueco, "h-full w-full") : <span className="px-2 text-center text-xs text-muted-foreground">{elegida !== null ? "Toca aquí para colocarla" : "Suelta aquí la tarjeta"}</span>}
          {enHueco && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Quitar la tarjeta"
              onClick={(e) => { e.stopPropagation(); setColocada(null); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); setColocada(null); } }}
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
            >
              <X className="h-4 w-4" />
            </span>
          )}
        </button>
      </div>

      {/* Las tarjetas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Tarjetas">
        {orden === null
          ? tarjetas.map((t) => <div key={t.id} className="aspect-square animate-pulse rounded-2xl border border-border panel" />)
          : libres.map((t) => (
              <button
                key={t.id}
                type="button"
                {...props(String(t.id))}
                onClick={(e) => { if (e.detail === 0) setElegida((x) => (x === t.id ? null : t.id)); /* teclado */ }}
                aria-pressed={elegida === t.id}
                aria-label={`Tarjeta ${tarjetas.findIndex((x) => x.id === t.id) + 1}`}
                className={cn(
                  "flex aspect-square cursor-grab items-center justify-center rounded-2xl border-2 bg-card p-2 shadow-sm transition-transform hover:-translate-y-0.5 active:cursor-grabbing",
                  elegida === t.id ? "border-primary ring-2 ring-primary scale-[1.03]" : "border-border",
                  fantasma?.id === String(t.id) && "opacity-30",
                )}
                style={props(String(t.id)).style}
              >
                {imagen(t, "h-full w-full")}
              </button>
            ))}
      </div>

      {fantasma && porId.get(Number(fantasma.id)) && (
        <div className="pointer-events-none fixed z-[70] h-28 w-28 -translate-x-1/2 -translate-y-1/2 rotate-3 rounded-2xl border-2 border-primary bg-card p-2 shadow-xl" style={{ left: fantasma.x, top: fantasma.y }}>
          {imagen(porId.get(Number(fantasma.id))!, "h-full w-full")}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="gradient" disabled={colocada === null || enviando} onClick={() => colocada !== null && onEnviar(colocada)}>
          {enviando ? "Comprobando…" : "Comprobar"}
        </Button>
        {colocada === null && <p className="self-center text-xs text-muted-foreground">Arrastra una tarjeta al hueco, o tócala y toca el hueco.</p>}
      </div>
    </div>
  );
}
