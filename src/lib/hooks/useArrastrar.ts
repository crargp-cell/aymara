"use client";

import { useCallback, useRef, useState } from "react";

/*
  Arrastrar con puntero (ratón y dedo). El arrastre nativo de HTML5 no funciona en
  pantallas táctiles, así que se hace con eventos de puntero y captura.

  Un toque sin mover (menos de 6 px) NO es un arrastre: llama a `alTocar`. Con eso
  el mismo elemento sirve para «arrastrar a su sitio» y para «tocar y luego tocar el
  destino», que es lo que necesita quien no puede arrastrar con precisión.

  Los destinos son cualquier elemento con `data-destino="<clave>"`.
*/

export type Fantasma = { id: string; x: number; y: number };

export function useArrastrar({
  habilitado = true,
  alSoltar,
  alTocar,
}: {
  habilitado?: boolean;
  /** `destino` es la clave del `data-destino` bajo el puntero, o null si se soltó fuera. */
  alSoltar: (id: string, destino: string | null) => void;
  alTocar?: (id: string) => void;
}) {
  const [fantasma, setFantasma] = useState<Fantasma | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const gesto = useRef<{ id: string; sx: number; sy: number; activo: boolean } | null>(null);

  const destinoBajo = (x: number, y: number) =>
    (document.elementsFromPoint(x, y).map((e) => (e as HTMLElement).closest?.("[data-destino]") as HTMLElement | null).find(Boolean)?.dataset.destino) ?? null;

  const cancelar = useCallback(() => {
    gesto.current = null;
    setFantasma(null);
    setSobre(null);
  }, []);

  /** Props para el elemento arrastrable `id`. */
  const props = useCallback((id: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (!habilitado || e.button > 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      gesto.current = { id, sx: e.clientX, sy: e.clientY, activo: false };
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const g = gesto.current;
      if (!g) return;
      if (!g.activo && Math.hypot(e.clientX - g.sx, e.clientY - g.sy) > 6) g.activo = true;
      if (!g.activo) return;
      setFantasma({ id: g.id, x: e.clientX, y: e.clientY });
      setSobre(destinoBajo(e.clientX, e.clientY));
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      const g = gesto.current;
      cancelar();
      if (!g) return;
      if (g.activo) alSoltar(g.id, destinoBajo(e.clientX, e.clientY));
      else alTocar?.(g.id);
    },
    onPointerCancel: cancelar,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    style: { touchAction: "none" as const },
  }), [habilitado, alSoltar, alTocar, cancelar]);

  return { fantasma, sobre, props };
}
