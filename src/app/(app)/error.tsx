"use client";

import { MallkuMensaje } from "@/components/mascota/MallkuMensaje";

/** Error inesperado dentro de la app: Mallku se tapa los ojos y deja volver a intentar. */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <MallkuMensaje pose="timido" titulo="Algo salió mal" texto="No te preocupes, no es tu culpa. Prueba de nuevo; si sigue pasando, avisa a tu profesor.">
      <button type="button" onClick={reset} className="mt-1 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        Intentar de nuevo
      </button>
    </MallkuMensaje>
  );
}
