import { useRef } from "react";

/**
 * `useRef(costosoOImpuroDeCalcular())` tiene un problema sutil: el argumento
 * se evalúa en CADA render (JS evalúa argumentos antes de llamar a la
 * función), aunque `useRef` sólo use ese valor la primera vez. Con algo puro
 * es sólo trabajo de más; con `Date.now()`/`Math.random()` además dispara la
 * regla `react-hooks/purity` (pensada para el compilador de React, que sí
 * puede saltarse renders y necesita que lo que corre en ellos no tenga
 * efectos secundarios).
 *
 * Esto retrasa la llamada a `init` hasta el primer render que de verdad lee
 * el ref, igual que hace `useState(() => ...)` con su inicializador perezoso.
 */
export function useLazyRef<T>(init: () => T) {
  const ref = useRef<T | null>(null);
  if (ref.current === null) ref.current = init();
  return ref as { current: T };
}
