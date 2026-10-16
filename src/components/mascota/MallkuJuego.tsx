"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";
import { guionJuego, type EstadoJuego } from "@/lib/mascota/guion";
import { reproducirSonido } from "@/lib/slide-sound";
import { cn } from "@/lib/utils";
import { Condor } from "./Condor";

/*
  Mallku dentro de un juego, ejercicio o pantalla: la pose y la frase salen de
  `guionJuego` según lo que está pasando (ver EstadoJuego en lib/mascota/guion).

  A diferencia del acompañante flotante, aquí no hay animación de escritura: en un
  juego la reacción tiene que llegar al instante. Tampoco habla solo: la voz sólo
  suena si el alumno pulsa el altavoz (en un aula, sonar sin permiso sería lo peor).
*/
export function MallkuJuego({
  estado,
  semilla = 0,
  size = 84,
  className,
  oscuro = false,
}: {
  estado: EstadoJuego;
  /** Elige entre las variantes de una misma frase; fíjala por partida para que no cambie al repintar. */
  semilla?: number;
  size?: number;
  className?: string;
  /** Burbuja para fondos oscuros (juegos arcade). */
  oscuro?: boolean;
}) {
  const linea = guionJuego(estado, semilla);
  const [sonando, setSonando] = useState(false);

  return (
    <div className={cn("flex items-end gap-3", className)} role="status" aria-live="polite">
      {/* La pose cambia con una pequeña sacudida: se nota la reacción sin ser molesta. */}
      <div key={linea.pose} className="motion-safe:animate-[mallkuPop_0.35s_ease-out]">
        <Condor linea={linea} size={size} hablando={sonando} />
      </div>
      <div
        key={linea.id}
        className={cn(
          "relative max-w-sm rounded-2xl px-3.5 py-2 text-sm leading-snug shadow-sm motion-safe:animate-[mallkuPop_0.35s_ease-out]",
          oscuro ? "bg-[#151d3b] text-[#e8ecff] border border-[#2a3a8c]" : "panel",
        )}
      >
        <span>{linea.texto}</span>
        {linea.termino && (
          <button
            type="button"
            onClick={() => { setSonando(true); void reproducirSonido(linea.termino!.aymara).finally(() => setSonando(false)); }}
            className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 align-middle text-xs font-medium text-primary hover:bg-primary/25"
            aria-label={`Escuchar «${linea.termino.aymara}»`}
            title="Pronunciación aproximada"
          >
            <Volume2 className="h-3.5 w-3.5" /> ≈
          </button>
        )}
      </div>
      <style>{`@keyframes mallkuPop{0%{transform:scale(.85) translateY(6px);opacity:0}100%{transform:none;opacity:1}}`}</style>
    </div>
  );
}
