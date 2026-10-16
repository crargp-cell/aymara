"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, RotateCcw, Volume2 } from "lucide-react";
import { Chiptune } from "@/lib/chiptune";
import { reproducirSonido } from "@/lib/slide-sound";
import type { EstadoJuego } from "@/lib/mascota/guion";
import { MallkuJuego } from "@/components/mascota/MallkuJuego";
import { pixel } from "@/components/exam/pixel-font";
import s from "@/components/exam/arcade.module.css";
import { useModoLegible } from "@/lib/hooks/useModoLegible";
import { adivinarAction, iniciarPartidaAction, type EstadoPartida } from "@/app/(app)/play/guess-actions";

/*
  Ejercicio «adivina la imagen»: la imagen empieza muy borrosa y se aclara con cada
  fallo. El alumno escribe la palabra (casillas = una por letra). Toda la
  decisión es del servidor (guess-actions.ts): aquí sólo se dibuja el estado que
  él devuelve, y la imagen llega ya desenfocada desde /api/exercise-media.
*/

type Final = { leccionCompletada: boolean; tarjetaAr: boolean; logros: string[] };

export function ImageGuessGame({
  lessonId, exerciseId, imageId, consigna, siguienteHref, listaHref, esDocente, respuestaDocente,
}: {
  lessonId: number;
  exerciseId: number;
  imageId: number;
  consigna: string;
  siguienteHref: string | null;
  listaHref: string;
  esDocente: boolean;
  /** Sólo para el docente: la palabra, para revisar el ejercicio. */
  respuestaDocente: string | null;
}) {
  const [partida, setPartida] = useState<EstadoPartida | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [fallidas, setFallidas] = useState<string[]>([]);
  const [reaccion, setReaccion] = useState<"fallo" | null>(null);
  const [final, setFinal] = useState<Final | null>(null);
  const [cargandoImagen, setCargandoImagen] = useState(true);
  const [sonando, setSonando] = useState(false);
  const audio = useRef<Chiptune | null>(null);
  const campo = useRef<HTMLInputElement>(null);
  const [legible, alternarLegible] = useModoLegible();

  const abrir = useCallback(async (nueva = false) => {
    setError(null);
    const r = await iniciarPartidaAction(lessonId, exerciseId, nueva).catch(() => null);
    if (!r || !r.ok) { setError(r && !r.ok ? r.error : "No se pudo abrir el ejercicio."); return; }
    setPartida(r.partida);
    setTexto("");
    setFallidas([]);
    setReaccion(null);
    setFinal(null);
    setCargandoImagen(true);
  }, [lessonId, exerciseId]);

  useEffect(() => {
    const a = new Chiptune();
    audio.current = a;
    // Abrir la partida es una llamada al servidor: ocurre una vez, al montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void abrir();
    return () => a.dispose();
  }, [abrir]);

  async function adivinar(e?: React.FormEvent) {
    e?.preventDefault();
    if (!partida || partida.terminado || enviando || !texto.trim()) return;
    audio.current?.unlock();
    setEnviando(true);
    setError(null);
    const intento = texto.trim();
    const r = await adivinarAction(lessonId, partida.playId, intento).catch(() => null);
    setEnviando(false);
    if (!r || !r.ok) { setError(r && !r.ok ? r.error : "No se pudo comprobar la palabra."); return; }

    const huboCambioImagen = r.partida.fallos !== partida.fallos || r.partida.terminado;
    if (huboCambioImagen) setCargandoImagen(true);
    setPartida(r.partida);
    setTexto("");
    if (r.correcto) {
      audio.current?.sfx("win");
      setReaccion(null);
    } else if (r.partida.terminado) {
      audio.current?.sfx("lose");
      setReaccion(null);
    } else {
      audio.current?.sfx("wrong");
      navigator.vibrate?.(120);
      setFallidas((f) => [...f, intento]);
      setReaccion("fallo");
    }
    if (r.partida.terminado) setFinal({ leccionCompletada: r.leccionCompletada, tarjetaAr: r.tarjetaAr, logros: r.logros });
    else campo.current?.focus();
  }

  const quedan = partida ? partida.intentos - partida.fallos : 0;
  const estadoMallku: EstadoJuego = !partida
    ? { tipo: "intro", juego: "adivina" }
    : partida.terminado
      ? partida.resuelto
        ? { tipo: "acierto", termino: { aymara: partida.palabra ?? "", espanol: "" } }
        : { tipo: "pierde", termino: { aymara: partida.palabra ?? "", espanol: "" } }
      : reaccion === "fallo"
        ? { tipo: "fallo", restantes: quedan }
        : partida.fallos === 0 && fallidas.length === 0
          ? { tipo: "intro", juego: "adivina" }
          : { tipo: "borrosa", fallos: partida.fallos, intentos: partida.intentos };

  // Las casillas muestran lo que se va escribiendo (alineado a la izquierda, sin pasarse del largo).
  const letrasEscritas = [...texto.trim()];
  let k = 0;
  const casillas = partida ? [...partida.forma].map((c) => (c === " " ? { espacio: true, letra: "" } : { espacio: false, letra: letrasEscritas[k++] ?? "" }))
    : [];

  return (
    <div className="space-y-4">
      <MallkuJuego estado={estadoMallku} semilla={partida?.playId ?? 0} />

      <div className={`${s.screen} ${pixel.className} ${legible ? s.legible : ""} space-y-4 text-[12px] leading-relaxed`}>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] text-[#ffd23f]">{consigna}</p>
          <button type="button" onClick={alternarLegible} aria-pressed={legible} title={legible ? "Volver al estilo arcade" : "Texto normal (más legible)"} className="relative z-10 border border-[#2a3a8c] px-2 py-1 text-[11px] text-[#e8ecff] hover:bg-[#2a3a8c]">{legible ? "Estilo arcade" : "Texto normal"}</button>
          {partida && (
            <p className="flex items-center gap-1.5" aria-label={`${quedan} intentos restantes`}>
              <span className="mr-1 text-[10px] text-[#e8ecff]/60">INTENTOS</span>
              {Array.from({ length: partida.intentos }).map((_, i) => (
                <span key={i} className={`${s.pip} ${i < quedan ? s.pipOn : ""}`} style={{ ["--k" as string]: "#ff6b9d" }} />
              ))}
            </p>
          )}
        </div>

        {/* La imagen */}
        <div className={`${s.panel} ${s.px} relative z-10 mx-auto flex aspect-square w-full max-w-sm items-center justify-center overflow-hidden`}>
          {partida ? (
            <>
              {/* <img> a propósito: /api/exercise-media pide sesión y el optimizador de next/image no manda cookies. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={`${partida.playId}-${partida.fallos}-${partida.terminado ? 1 : 0}`}
                src={`/api/exercise-media/${imageId}?play=${partida.playId}&f=${partida.fallos}&t=${partida.terminado ? 1 : 0}`}
                alt={partida.terminado ? "La imagen, ya nítida" : "Imagen borrosa que se irá aclarando"}
                onLoad={() => setCargandoImagen(false)}
                onError={() => setCargandoImagen(false)}
                className="h-full w-full object-contain transition-opacity duration-500"
                style={{ opacity: cargandoImagen ? 0 : 1, imageRendering: "auto" }}
              />
              {cargandoImagen && <Loader2 className="absolute h-6 w-6 animate-spin text-[#e8ecff]/70" />}
            </>
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-[#e8ecff]/70" />
          )}
        </div>

        {/* Casillas de la palabra */}
        {partida && !partida.terminado && (
          <div className="relative z-10 flex flex-wrap items-center justify-center gap-1.5" aria-hidden>
            {casillas.map((c, i) => c.espacio ? <span key={i} className="w-3" /> : (
              <span key={i} className={`${s.px} flex h-9 w-8 items-center justify-center bg-[#151d3b] text-xs uppercase text-[#ffd23f]`} style={{ ["--c" as string]: c.letra ? "#ffd23f" : "#2a3a8c" }}>{c.letra}</span>
            ))}
          </div>
        )}

        {/* Respuesta ya conocida (fin de partida) */}
        {partida?.terminado && partida.palabra && (
          <div className="relative z-10 flex flex-wrap items-center justify-center gap-3">
            <span className={`${s.px} bg-[#151d3b] px-4 py-3 text-sm uppercase`} style={{ ["--c" as string]: partida.resuelto ? "#3ddc84" : "#ff6b9d", color: partida.resuelto ? "#3ddc84" : "#ff6b9d" }}>{partida.palabra}</span>
            <button
              type="button"
              onClick={() => { setSonando(true); void reproducirSonido(partida.palabra ?? "").finally(() => setSonando(false)); }}
              className={`${s.btn} ${s.btnAlt} ${s.px} inline-flex items-center gap-1 !p-2 text-[11px]`}
              aria-label={`Escuchar «${partida.palabra}»`}
              title="Pronunciación aproximada"
            >
              <Volume2 className="h-4 w-4" /> {sonando ? "…" : "≈"}
            </button>
          </div>
        )}

        {/* Entrada */}
        {partida && !partida.terminado && (
          <form onSubmit={adivinar} className="relative z-10 flex flex-wrap items-center justify-center gap-3">
            <input
              ref={campo}
              value={texto}
              onChange={(e) => { setTexto(e.target.value); if (reaccion) setReaccion(null); }}
              maxLength={40}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="Escribe la palabra…"
              aria-label="Tu respuesta"
              className="w-64 border-0 bg-[#0b1020] px-3 py-3 text-[13px] text-[#e8ecff] outline-none ring-2 ring-[#2a3a8c] focus:ring-[#ffd23f]"
              disabled={enviando}
            />
            <button type="submit" disabled={enviando || !texto.trim()} className={`${s.btn} ${s.px}`}>{enviando ? "…" : "Adivinar"}</button>
          </form>
        )}

        {fallidas.length > 0 && (
          <p className="relative z-10 flex flex-wrap items-center justify-center gap-2 text-[11px] text-[#ff6b9d]">
            <span className="text-[#e8ecff]/60">Ya probaste:</span>
            {fallidas.map((f, i) => <span key={i} className="bg-black/30 px-2 py-1 line-through">{f}</span>)}
          </p>
        )}
        {esDocente && respuestaDocente && <p className="relative z-10 text-center text-[10px] text-[#3ddc84]">VISTA DOCENTE · RESPUESTA: {respuestaDocente.toUpperCase()}</p>}
        {error && <p role="alert" className="relative z-10 text-center text-[11px] text-[#ff6b9d]">{error}</p>}
      </div>

      {final && partida?.terminado && (
        <div className={`rounded-xl border p-4 space-y-2 ${partida.resuelto ? "aviso-ok" : "aviso-error"}`}>
          <p className="text-sm font-medium">{partida.resuelto ? "¡Correcto!" : "No lo lograste esta vez."}</p>
          {final.leccionCompletada && <p className="text-sm font-medium">🏆 ¡Lección completada!</p>}
          {final.tarjetaAr && <p className="text-sm">✨ Desbloqueaste una tarjeta AR.</p>}
          {final.logros.length > 0 && <p className="text-sm">Nuevos logros: {final.logros.join(", ")}</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            {siguienteHref ? (
              <Link href={siguienteHref} className="inline-flex h-8 items-center rounded bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">Siguiente</Link>
            ) : (
              <Link href={listaHref} className="inline-flex h-8 items-center rounded bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">Volver a la lección</Link>
            )}
            {(!partida.resuelto || esDocente) && (
              <button type="button" onClick={() => void abrir(true)} className="inline-flex h-8 items-center gap-1 rounded border border-input bg-card px-3 text-xs font-medium hover:bg-muted">
                <RotateCcw className="h-3.5 w-3.5" /> Jugar otra vez
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
