"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/*
  El cóndor en vídeo, con el fondo verde recortado en el navegador.

  El vídeo viene sobre croma verde y, tal cual, taparía el fondo andino con un
  rectángulo. Lo suyo sería convertirlo a WebM con canal alfa y no gastar nada en
  tiempo de ejecución, pero eso pide ffmpeg y en esta máquina no hay, así que el
  recorte se hace por fotograma sobre un canvas.

  Los umbrales no están puestos a ojo. Midiendo el vídeo, el cóndor cae entre
  -100 y 0 de "verdor" (el verde menos el mayor entre rojo y azul), el fondo
  entre 100 y 120, y sólo un 1% de los píxeles queda en medio: los bordes
  suavizados. Entre los dos umbrales la transparencia sube de forma gradual, que
  es lo que evita el borde dentado de un recorte a secas.
*/

/** Por debajo de esto el píxel es cóndor y se queda entero. */
const VERDOR_OPACO = 30;
/** Por encima de esto es fondo y desaparece. */
const VERDOR_TRANSPARENTE = 90;

/*
  Cuántos píxeles se recortan por fotograma. Importa: el bucle recorre el
  fotograma entero en JavaScript, y medido en esta máquina, procesar 420 px de
  ancho costaba 10,5 ms de mediana y hasta 29,6 ms en el peor caso, contra los
  16,7 ms que dura un fotograma a 60 por segundo. En un portátil de aula eso
  serían saltos.

  El canvas se dimensiona por lo que de verdad se ve —el ancho pedido, por dos
  para pantallas densas— en lugar de por el tamaño del vídeo, que es de 720×1280
  y son 921.000 píxeles para mostrar unos 130. El tope está para que nadie pueda
  pedir un tamaño que ahogue al navegador.
*/
const ANCHO_MAXIMO_PROCESO = 420;
const DENSIDAD_MAXIMA = 2;

/** Recorta el croma de un fotograma ya dibujado, en el sitio. */
function recortarCroma(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const imagen = ctx.getImageData(0, 0, w, h);
  const d = imagen.data;
  for (let i = 0; i < d.length; i += 4) {
    const otro = d[i] > d[i + 2] ? d[i] : d[i + 2];
    const verdor = d[i + 1] - otro;

    if (verdor >= VERDOR_TRANSPARENTE) {
      d[i + 3] = 0;
      continue;
    }
    if (verdor > VERDOR_OPACO) {
      d[i + 3] = Math.round(
        255 * (1 - (verdor - VERDOR_OPACO) / (VERDOR_TRANSPARENTE - VERDOR_OPACO)),
      );
    }
    // Quitar el reflejo verde: sin esto los bordes del cóndor quedan con una
    // aureola verdosa que delata el recorte sobre un fondo claro.
    if (verdor > 0) d[i + 1] = otro;
  }
  ctx.putImageData(imagen, 0, 0);
}

export function CondorVideo({
  src = "/mascota/Hola.mp4",
  poster = "/mascota/mascota.png",
  ancho = 150,
  className,
}: {
  src?: string;
  poster?: string;
  ancho?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef(0);
  const [listo, setListo] = useState(false);
  const [fallo, setFallo] = useState(false);
  const [reproduciendo, setReproduciendo] = useState(false);

  /** Un fotograma: dibujar el vídeo escalado y quitarle el verde. */
  const pintarFotograma = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!video || !canvas || !ctx || video.readyState < 2) return false;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    recortarCroma(ctx, canvas.width, canvas.height);
    return true;
  }, []);

  const arrancarBucle = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    const paso = () => {
      const video = videoRef.current;
      if (!video) return;
      if (pintarFotograma()) setListo(true);
      if (video.paused || video.ended) return;
      frameRef.current = requestAnimationFrame(paso);
    };
    frameRef.current = requestAnimationFrame(paso);
  }, [pintarFotograma]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (!canvas.getContext("2d", { willReadFrequently: true })) {
      setFallo(true);
      return;
    }

    let limpiezaVisibilidad: (() => void) | null = null;

    /** Deja a la vista un fotograma suelto, sin animar. Funciona con la pestaña
     *  oculta porque no depende de requestAnimationFrame. */
    const mostrarUnFotograma = () => {
      video.currentTime = 0.1;
      video.addEventListener("seeked", () => setListo(pintarFotograma()), { once: true });
    };

    const reproducir = () => {
      video
        .play()
        .then(() => {
          setReproduciendo(true);
          arrancarBucle();
        })
        // Si el navegador no deja arrancar solo, queda el primer fotograma y el
        // alumno puede darle para verlo.
        .catch(mostrarUnFotograma);
    };

    const alCargar = () => {
      const proporcion = (video.videoHeight || 1280) / (video.videoWidth || 720);
      const anchoProceso = Math.min(
        ANCHO_MAXIMO_PROCESO,
        video.videoWidth || 720,
        ancho * Math.min(window.devicePixelRatio || 1, DENSIDAD_MAXIMA),
      );
      canvas.width = Math.round(anchoProceso);
      canvas.height = Math.round(anchoProceso * proporcion);

      // Con "reducir movimiento" activado se muestra un fotograma y nada más.
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
        mostrarUnFotograma();
        return;
      }

      /*
        Con la pestaña en segundo plano el vídeo sí avanza, pero el navegador
        congela requestAnimationFrame: el recorte no se ejecuta y el saludo se
        gastaría entero sin que nadie lo viera, dejando el canvas en blanco. Así
        que se espera a que alguien esté mirando; mientras, un fotograma quieto.
      */
      if (document.hidden) {
        mostrarUnFotograma();
        const alVolver = () => {
          if (document.hidden) return;
          document.removeEventListener("visibilitychange", alVolver);
          reproducir();
        };
        document.addEventListener("visibilitychange", alVolver);
        limpiezaVisibilidad = () => document.removeEventListener("visibilitychange", alVolver);
        return;
      }

      reproducir();
    };

    // Se detiene en el último fotograma en lugar de repetirse sin fin: un saludo
    // en bucle acaba siendo ruido en la pantalla de inicio.
    const alTerminar = () => {
      setReproduciendo(false);
      cancelAnimationFrame(frameRef.current);
    };
    const alFallar = () => setFallo(true);

    video.addEventListener("loadeddata", alCargar);
    video.addEventListener("ended", alTerminar);
    video.addEventListener("error", alFallar);
    if (video.readyState >= 2) alCargar();

    return () => {
      cancelAnimationFrame(frameRef.current);
      limpiezaVisibilidad?.();
      video.removeEventListener("loadeddata", alCargar);
      video.removeEventListener("ended", alTerminar);
      video.removeEventListener("error", alFallar);
    };
  }, [src, ancho, arrancarBucle, pintarFotograma]);

  const repetir = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().then(() => {
      setReproduciendo(true);
      arrancarBucle();
    });
  };

  // Si el vídeo no carga, queda la imagen de siempre: la pantalla no se rompe
  // por un saludo.
  if (fallo) {
    return (
      <Image
        src={poster}
        alt=""
        width={ancho}
        height={ancho}
        className={cn("animate-float shrink-0 object-contain", className)}
      />
    );
  }

  return (
    /*
      El contenedor ya reserva la proporción del vídeo. Sin eso, la imagen de
      espera es cuadrada y el canvas es 9:16: el bloque del saludo daría un
      brinco en cuanto apareciera el primer fotograma.
    */
    <div className={cn("relative shrink-0", className)} style={{ width: ancho, aspectRatio: "9 / 16" }}>
      <video ref={videoRef} src={src} muted playsInline preload="auto" className="hidden" aria-hidden />
      {!listo && (
        <Image
          src={poster}
          alt=""
          width={ancho}
          height={ancho}
          className="animate-float object-contain w-full h-full"
          priority
        />
      )}
      <canvas
        ref={canvasRef}
        onClick={reproduciendo ? undefined : repetir}
        title={reproduciendo ? undefined : "Verlo otra vez"}
        className={cn("w-full h-full", listo ? "block" : "hidden", !reproduciendo && "cursor-pointer")}
      />
    </div>
  );
}
