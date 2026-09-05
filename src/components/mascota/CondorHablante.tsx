"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/*
  El cóndor moviendo el pico mientras habla.

  Son tres dibujos —pico cerrado, medio y abierto— que se recorren en vaivén:
  1, 2, 3, 2, 1, 2, 3… El camino de vuelta importa: saltando de abierto a
  cerrado el pico da un tirón, y con el 2 en medio se lee como una boca que
  articula.

  Los tres van montados a la vez y se turnan por opacidad en lugar de cambiar el
  `src`. Cambiando la ruta, el navegador pide cada imagen la primera vez que le
  toca y el primer ciclo sale a parpadeos.
*/

export const CUADROS = ["/mascota/1.png", "/mascota/2.png", "/mascota/3.png"];

/** Vaivén sobre los índices de CUADROS: cerrado, medio, abierto, medio. */
const SECUENCIA = [0, 1, 2, 1];

/** Ritmo del pico. Más rápido parece un tic; más lento, que mastica. */
export const MS_POR_CUADRO = 120;

/**
 * Qué dibujo toca en el paso `n`. Recorre 1, 2, 3, 2, 1, 2, 3… en bucle.
 *
 * Está fuera del componente para poder comprobarlo: el orden es justo lo que
 * hace que parezca una boca y no un parpadeo, y en pantalla se ve tan rápido
 * que un error de índice pasaría inadvertido.
 */
export function cuadroEn(n: number): number {
  return SECUENCIA[((n % SECUENCIA.length) + SECUENCIA.length) % SECUENCIA.length];
}

export function CondorHablante({
  hablando = false,
  size = 96,
  alt = "",
  className,
  priority = false,
}: {
  hablando?: boolean;
  size?: number;
  alt?: string;
  className?: string;
  priority?: boolean;
}) {
  const [cuadro, setCuadro] = useState(0);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!hablando) {
      setCuadro(0);
      return;
    }

    // Con "reducir movimiento" el pico no se agita: se queda entreabierto, que
    // ya dice que está hablando sin marear a nadie.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setCuadro(1);
      return;
    }

    // Por tiempo transcurrido y no por número de fotogramas: así el ritmo del
    // pico no depende de lo cargado que esté el navegador.
    const inicio = performance.now();
    const paso = () => {
      setCuadro(cuadroEn(Math.floor((performance.now() - inicio) / MS_POR_CUADRO)));
      frameRef.current = requestAnimationFrame(paso);
    };
    frameRef.current = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frameRef.current);
  }, [hablando]);

  return (
    <div
      className={cn("relative shrink-0", hablando ? "animate-float-fast" : "animate-float", className)}
      style={{ width: size, height: size }}
    >
      {CUADROS.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt={i === 0 ? alt : ""}
          width={size}
          height={size}
          priority={priority}
          aria-hidden={i !== 0 || undefined}
          className={cn(
            "absolute inset-0 w-full h-full object-contain",
            i === cuadro ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
    </div>
  );
}
