"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { X, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PanelChat } from "@/components/chat/PanelChat";
import { Burbuja } from "./Condor";
import { CondorHablante } from "./CondorHablante";
import { comentarioDePantalla, semillaDelDia, type ContextoAlumno, type Linea } from "@/lib/mascota/guion";

/*
  El cóndor acompañante.

  Vive en una esquina y comenta la pantalla en la que está el alumno. Antes ahí
  había un botón de chat con un icono genérico; ahora es el cóndor quien abre esa
  misma conversación, para no tener dos cosas distintas disputándose el rincón.

  Reglas que se ha impuesto para no ser un incordio:
    · Aparece un momento después de cargar, no encima de la página.
    · Dice una sola frase y luego se calla; la burbuja se cierra sola.
    · Se puede echar, y no vuelve hasta la siguiente sesión.
    · No habla en voz alta por su cuenta: sonar sin permiso en un aula sería lo
      peor que podría hacer. La voz siempre la pide el alumno.
*/

const CLAVE_OCULTO = "condor-oculto";

export function CondorFlotante() {
  const ruta = usePathname();
  const [ctx, setCtx] = useState<ContextoAlumno | null>(null);
  const [linea, setLinea] = useState<Linea | null>(null);
  const [burbuja, setBurbuja] = useState(false);
  const [chat, setChat] = useState(false);
  const [oculto, setOculto] = useState(true);
  const retirada = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hablando, setHablando] = useState(false);
  const reportarVoz = useCallback((_id: string, activa: boolean) => setHablando(activa), []);

  // Arranca oculto y sólo se muestra si el alumno no lo echó: así no parpadea
  // en la pantalla de quien ya dijo que no lo quiere.
  useEffect(() => {
    try {
      setOculto(sessionStorage.getItem(CLAVE_OCULTO) === "1");
    } catch {
      setOculto(false);
    }
  }, []);

  useEffect(() => {
    if (oculto) return;
    let vivo = true;
    fetch("/api/condor/contexto")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => vivo && d && !d.error && setCtx(d))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [oculto]);

  // Frase nueva al cambiar de pantalla, con un respiro para no saltar encima.
  useEffect(() => {
    if (!ctx || oculto || chat) return;
    setBurbuja(false);
    const entra = setTimeout(() => {
      setLinea(comentarioDePantalla(ruta ?? "/", ctx, semillaDelDia(ruta?.length ?? 0)));
      setBurbuja(true);
    }, 1200);
    return () => clearTimeout(entra);
  }, [ruta, ctx, oculto, chat]);

  /*
    La burbuja se retira sola: dicho lo suyo, deja de estorbar.

    La cuenta arranca cuando la frase termina de escribirse, no cuando empieza:
    si arrancase antes, una frase larga se cerraría a medio leer. El plazo va con
    el número de letras porque no se tarda lo mismo en leer tres palabras que dos
    líneas.
  */
  const empezarRetirada = useCallback(() => {
    if (!linea) return;
    const leer = Math.min(22000, Math.max(7000, linea.texto.length * 90));
    if (retirada.current) clearTimeout(retirada.current);
    retirada.current = setTimeout(() => {
      setBurbuja(false);
      setHablando(false);
    }, leer);
  }, [linea]);

  useEffect(() => () => void (retirada.current && clearTimeout(retirada.current)), []);

  if (oculto || !ctx) return null;

  const echar = () => {
    try {
      sessionStorage.setItem(CLAVE_OCULTO, "1");
    } catch {
      /* sin sessionStorage se esconde igual, sólo que no lo recuerda */
    }
    setOculto(true);
  };

  const lineaActual = linea ?? comentarioDePantalla(ruta ?? "/", ctx, semillaDelDia());

  return (
    <>
      {chat && (
        <Card className="fixed bottom-28 right-4 sm:right-6 w-[min(24rem,calc(100vw-2rem))] h-[26rem] flex flex-col z-50 overflow-hidden">
          <CardHeader className="py-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Mallku — el cóndor</CardTitle>
            <button type="button" onClick={() => setChat(false)} aria-label="Cerrar" className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <PanelChat />
        </Card>
      )}

      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex items-end gap-2">
        {burbuja && !chat && (
          <div className="max-w-[min(20rem,calc(100vw-7rem))] relative">
            <Burbuja linea={lineaActual} onTerminado={empezarRetirada} onHablando={reportarVoz} />
            <button
              type="button"
              onClick={echar}
              aria-label="Ocultar al cóndor"
              className="absolute -top-2 -left-2 h-6 w-6 rounded-full panel flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => (chat ? setChat(false) : setChat(true))}
            aria-label={chat ? "Cerrar la conversación" : "Hablar con el cóndor"}
            className="relative rounded-full transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <CondorHablante hablando={hablando} size={72} alt="Mallku, el cóndor" />
            {!chat && (
              <span className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                <MessageCircle className="h-3.5 w-3.5" />
              </span>
            )}
          </button>
          {!chat && (
            <Link href="/condor" className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2">
              su pantalla
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
