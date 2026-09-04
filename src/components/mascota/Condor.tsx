"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Volume2, Square } from "lucide-react";
import { ARCHIVO_POSE, type Linea } from "@/lib/mascota/guion";
import { useVozCondor } from "./vozCondor";
import { cn } from "@/lib/utils";

/** Ritmo de escritura de la burbuja. Es también lo que usa quien calcula
 *  cuánto dejarla en pantalla, así que se exporta en vez de repetirse. */
export const MS_POR_LETRA = 26;

/**
 * El cóndor con su pose. Flota siempre; al hablar se mueve un poco más rápido,
 * que es lo que hace que parezca que está diciendo algo y no sólo colgado ahí.
 */
export function Condor({
  linea,
  size = 96,
  hablando = false,
  className,
}: {
  linea: Linea;
  size?: number;
  hablando?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={ARCHIVO_POSE[linea.pose]}
      alt=""
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", hablando ? "animate-float-fast" : "animate-float", className)}
      priority={false}
    />
  );
}

/**
 * Burbuja de diálogo: el texto aparece letra a letra, como si lo estuviera
 * diciendo. Un clic salta al final — a nadie le gusta esperar a una animación
 * dos veces —, y quien tenga activado "reducir movimiento" lo ve entero de una.
 */
export function Burbuja({
  linea,
  onTerminado,
  className,
}: {
  linea: Linea;
  onTerminado?: () => void;
  className?: string;
}) {
  const [visible, setVisible] = useState("");
  const [completo, setCompleto] = useState(false);
  const voz = useVozCondor();
  const avisado = useRef(false);

  /*
    La escritura va por tiempo transcurrido, no por número de ticks.

    Con `setInterval` cada 26 ms la frase salía a un carácter por segundo en
    cuanto la pestaña dejaba de estar visible: el navegador limita los
    temporizadores de las pestañas de fondo a un tick por segundo, y contar
    ticks convertía ese límite en una frase que tardaba un minuto. Midiendo el
    tiempo real, la velocidad es la misma esté la pestaña donde esté, y al
    volver de segundo plano el texto aparece ya en su punto en vez de arrastrar
    el retraso.
  */
  useEffect(() => {
    avisado.current = false;
    let frame = 0;

    const deGolpe = () => {
      setVisible(linea.texto);
      setCompleto(true);
    };

    const sinMovimiento = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // Animar lo que nadie mira no tiene sentido, y además el navegador congela
    // `requestAnimationFrame` en las pestañas de fondo: sin esto, quien vuelve a
    // la pestaña se encuentra la burbuja vacía hasta el siguiente fotograma.
    if (sinMovimiento || document.hidden) {
      deGolpe();
      return;
    }

    setVisible("");
    setCompleto(false);
    const inicio = performance.now();
    const paso = () => {
      const cuantos = Math.floor((performance.now() - inicio) / MS_POR_LETRA);
      if (cuantos >= linea.texto.length) {
        deGolpe();
        return;
      }
      setVisible(linea.texto.slice(0, cuantos));
      frame = requestAnimationFrame(paso);
    };
    frame = requestAnimationFrame(paso);

    // Si se cambia de pestaña a media frase, se da por dicha.
    const alOcultar = () => document.hidden && deGolpe();
    document.addEventListener("visibilitychange", alOcultar);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", alOcultar);
    };
  }, [linea.id, linea.texto]);

  useEffect(() => {
    if (completo && !avisado.current) {
      avisado.current = true;
      onTerminado?.();
    }
  }, [completo, onTerminado]);

  const saltar = () => {
    setVisible(linea.texto);
    setCompleto(true);
  };

  const sonando = voz.hablando === linea.id;

  return (
    <div className={cn("panel rounded-2xl rounded-bl-sm px-4 py-3 relative", className)}>
      <p
        className="text-sm leading-relaxed cursor-default"
        onClick={completo ? undefined : saltar}
        lang={linea.idioma === "ay" ? "ay" : "es"}
      >
        {visible}
        {!completo && <span className="inline-block w-1.5 h-4 align-text-bottom bg-primary/60 ml-0.5 animate-pulse" />}
      </p>

      {linea.termino && completo && (
        <p className="text-xs text-muted-foreground mt-1.5">
          <span className="font-medium text-foreground">{linea.termino.aymara}</span> — {linea.termino.espanol}
        </p>
      )}

      {voz.disponible && completo && (
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => (sonando ? voz.callar() : voz.hablar(linea))}
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline underline-offset-2"
            aria-label={sonando ? "Detener" : "Escuchar"}
          >
            {sonando ? <Square className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            {sonando ? "Detener" : "Escuchar"}
          </button>
          {/* Sin voz aymara, leer aymara con acento español enseñaría a decirlo
              mal. Se puede oír, pero avisando de qué es lo que se está oyendo. */}
          {voz.esAproximada(linea) && (
            <span className="text-xs text-muted-foreground">pronunciación aproximada</span>
          )}
        </div>
      )}
    </div>
  );
}
