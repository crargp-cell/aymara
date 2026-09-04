"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Condor, Burbuja } from "./Condor";
import type { Guion, Linea } from "@/lib/mascota/guion";

/**
 * El cóndor recitando un guion entero, una frase tras otra.
 *
 * Avanza solo cuando termina de "escribir" cada frase, pero deja saltar: quien
 * ya lo leyó no tiene por qué esperar. Las frases dichas se quedan arriba, así
 * que la pantalla acaba siendo una conversación y no un cartel que se sustituye.
 */
export function Conversacion({
  guion,
  accion,
}: {
  guion: Guion;
  accion?: { texto: string; href: string } | null;
}) {
  const [hasta, setHasta] = useState(0);

  // Al cambiar de guion se empieza de nuevo desde la primera frase.
  useEffect(() => setHasta(0), [guion.titulo]);

  const avanzar = useCallback(() => {
    setHasta((n) => Math.min(n + 1, guion.lineas.length - 1));
  }, [guion.lineas.length]);

  const dichas: Linea[] = guion.lineas.slice(0, hasta + 1);
  const ultima = dichas[dichas.length - 1];
  const quedan = hasta < guion.lineas.length - 1;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 sm:gap-4">
        <Condor linea={ultima} size={112} hablando={quedan} className="mt-1" />
        <div className="flex-1 min-w-0 space-y-2">
          {dichas.map((l, i) => (
            <Burbuja
              key={l.id}
              linea={l}
              // Sólo la última encadena: si no, al volver a montar se dispararía
              // el avance de todas las anteriores a la vez.
              onTerminado={i === dichas.length - 1 && quedan ? avanzar : undefined}
              className={i === dichas.length - 1 ? undefined : "opacity-70"}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-[8.5rem]">
        {quedan && (
          <Button size="sm" variant="outline" onClick={() => setHasta(guion.lineas.length - 1)}>
            Ver todo
          </Button>
        )}
        {!quedan && accion && (
          <Link href={accion.href}>
            <Button size="sm" variant="gradient">
              {accion.texto}
            </Button>
          </Link>
        )}
        {!quedan && (
          <Button size="sm" variant="ghost" onClick={() => setHasta(0)}>
            Otra vez
          </Button>
        )}
      </div>
    </div>
  );
}
