"use client";

import { useCallback, useEffect, useState } from "react";

const CLAVE = "aymara-juego-legible";

/**
 * «Texto normal» en los juegos de estilo arcade: cambia la tipografía de píxeles por
 * la del resto de la aplicación, que se lee mejor con poca vista o en pantallas
 * pequeñas. Se recuerda en el navegador; sin almacenamiento arranca en el estilo
 * arcade.
 */
export function useModoLegible(): [boolean, () => void] {
  const [legible, setLegible] = useState(false);

  useEffect(() => {
    try {
      // localStorage sólo existe en el navegador: se lee tras montar.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLegible(localStorage.getItem(CLAVE) === "1");
    } catch { /* sin almacenamiento: estilo arcade */ }
  }, []);

  const alternar = useCallback(() => {
    setLegible((v) => {
      try { localStorage.setItem(CLAVE, v ? "0" : "1"); } catch { /* ignorar */ }
      return !v;
    });
  }, []);

  return [legible, alternar];
}
