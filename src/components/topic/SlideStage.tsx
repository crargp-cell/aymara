"use client";

import { memo, useEffect, useRef, useState } from "react";
import { reproducirSonido } from "@/lib/slide-sound";
import { CANVAS_H, CANVAS_W, FONTS, canvasBackgroundStyle, mediaUrl, type CanvasElement, type SlideCanvas } from "@/lib/slide-canvas";

/*
  Dibujo del lienzo de una diapositiva, compartido por el editor, las miniaturas
  y el reproductor del alumno: así lo que el maestro diseña es exactamente lo
  que se ve al presentar.

  El contenido se dibuja siempre a 960×540 px y se escala con transform al
  ancho disponible; los tamaños de letra, por tanto, escalan con la diapositiva.
*/

export function StageFrame({
  bg,
  className,
  children,
}: {
  /** Estilo CSS del fondo (ver canvasBackgroundStyle). */
  bg: React.CSSProperties;
  className?: string;
  /** Recibe la escala actual (px de pantalla por px de lienzo). */
  children: (scale: number) => React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => setScale(el.clientWidth / CANVAS_W);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", overflow: "hidden", ...bg }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: CANVAS_W, height: CANVAS_H, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
        {children(scale)}
      </div>
    </div>
  );
}

export function textStyle(el: CanvasElement): React.CSSProperties {
  return {
    fontSize: el.fontSize ?? 32,
    fontFamily: FONTS[el.font ?? "sans"].css,
    fontWeight: el.bold ? 700 : 400,
    fontStyle: el.italic ? "italic" : "normal",
    textDecoration: el.underline ? "underline" : "none",
    textAlign: el.align ?? "left",
    color: el.color ?? "#1a1a2e",
    lineHeight: el.lineHeight ?? 1.25,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  };
}

/** Puntos de una estrella de 5 puntas dentro de w×h. */
function puntosEstrella(w: number, h: number, inset: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 1 : 0.42;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(w / 2 + (Math.cos(a) * (w / 2 - inset) * r)).toFixed(1)},${(h / 2 + (Math.sin(a) * (h / 2 - inset) * r)).toFixed(1)}`);
  }
  return pts.join(" ");
}

function Figura({ el }: { el: CanvasElement }) {
  const { w, h } = el;
  const sw = el.strokeWidth ?? 0;
  const fill = el.fill === "none" ? "none" : (el.fill ?? "#3b82f6");
  const stroke = sw > 0 ? (el.stroke ?? "#1e3a8a") : "none";
  const i = sw / 2;
  const comun = { fill, stroke, strokeWidth: sw, strokeLinejoin: "round" as const };

  let forma: React.ReactNode;
  switch (el.shape) {
    case "ellipse": forma = <ellipse cx={w / 2} cy={h / 2} rx={Math.max(w / 2 - i, 0)} ry={Math.max(h / 2 - i, 0)} {...comun} />; break;
    case "rounded": forma = <rect x={i} y={i} width={Math.max(w - sw, 0)} height={Math.max(h - sw, 0)} rx={Math.min(el.radius ?? 24, w / 2, h / 2)} {...comun} />; break;
    case "triangle": forma = <polygon points={`${w / 2},${i} ${w - i},${h - i} ${i},${h - i}`} {...comun} />; break;
    case "star": forma = <polygon points={puntosEstrella(w, h, i)} {...comun} />; break;
    case "line":
    case "arrow": {
      // Las líneas se dibujan con el color de relleno (o el de trazo si lo hay) y un grosor propio.
      const g = Math.max(sw, 4);
      const c = el.fill === "none" ? (el.stroke ?? "#1e3a8a") : (el.fill ?? "#3b82f6");
      const cabeza = g * 3.2;
      forma = (
        <>
          <line x1={0} y1={h / 2} x2={el.shape === "arrow" ? w - cabeza * 0.6 : w} y2={h / 2} stroke={c} strokeWidth={g} strokeLinecap={el.shape === "arrow" ? "butt" : "round"} />
          {el.shape === "arrow" && <polygon points={`${w},${h / 2} ${w - cabeza},${h / 2 - cabeza / 2} ${w - cabeza},${h / 2 + cabeza / 2}`} fill={c} />}
        </>
      );
      break;
    }
    default: forma = <rect x={i} y={i} width={Math.max(w - sw, 0)} height={Math.max(h - sw, 0)} {...comun} />;
  }
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "visible" }}>{forma}</svg>;
}

/** Botón de altavoz. Sólo suena en la presentación (`play`); en el editor es una figura más que se arrastra. */
function BotonSonido({ el, play }: { el: CanvasElement; play: boolean }) {
  const [sonando, setSonando] = useState(false);
  const color = el.color ?? "#4338ca";
  const lado = Math.min(el.w, el.h);
  const icono = (
    <svg viewBox="0 0 24 24" width={lado * 0.55} height={lado * 0.55} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="#fff" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
  const estilo: React.CSSProperties = {
    width: "100%", height: "100%", borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: sonando ? `0 0 0 ${lado * 0.12}px ${color}55` : "0 2px 6px rgba(0,0,0,.25)", transition: "box-shadow .2s", border: 0, padding: 0,
  };
  // El ≈ avisa de que no hay grabación: la voz sintética sólo aproxima la pronunciación.
  const aprox = !el.mediaId && (
    <span style={{ position: "absolute", right: -2, top: -2, fontSize: Math.max(10, lado * 0.3), lineHeight: 1, fontWeight: 700, color: "#92400e", background: "#fde68a", borderRadius: 99, padding: "1px 4px" }} title="Pronunciación aproximada">≈</span>
  );
  if (!play) return <div style={{ position: "relative", width: "100%", height: "100%" }}><div style={estilo}>{icono}</div>{aprox}</div>;
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <button
        type="button"
        style={{ ...estilo, cursor: "pointer" }}
        aria-label={el.text ? `Escuchar «${el.text}»` : "Escuchar"}
        onClick={() => { setSonando(true); void reproducirSonido(el.text ?? "", el.mediaId).finally(() => setSonando(false)); }}
      >
        {icono}
      </button>
      {aprox}
    </div>
  );
}

type BoxProps = {
  el: CanvasElement;
  /** Reemplaza el contenido (el editor lo usa para editar texto). */
  children?: React.ReactNode;
  cursor?: string;
  /** Los botones de sonido responden al clic (presentación); en el editor no. */
  play?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

/**
 * Un elemento colocado en el lienzo. Está memorizado: mientras se arrastra uno,
 * los demás conservan su objeto `el` y no se vuelven a dibujar.
 */
export const ElementBox = memo(function ElementBox({ el, children, cursor, play = false, style, ...rest }: BoxProps) {
  let contenido: React.ReactNode = children;
  if (children === undefined) {
    if (el.type === "text") contenido = <div style={textStyle(el)}>{el.text}</div>;
    else if (el.type === "image" && el.mediaId) {
      // <img> a propósito: /api/topic-media pide sesión y el optimizador de next/image no manda cookies.
      // eslint-disable-next-line @next/next/no-img-element
      contenido = <img src={mediaUrl(el.mediaId)} alt="" draggable={false} decoding="async" style={{ width: "100%", height: "100%", objectFit: el.fit ?? "contain", display: "block", userSelect: "none", borderRadius: el.radius ?? 0 }} />;
    } else if (el.type === "shape") contenido = <Figura el={el} />;
    else if (el.type === "sound") contenido = <BotonSonido el={el} play={play} />;
  }
  return (
    <div
      {...rest}
      style={{
        position: "absolute",
        left: el.x,
        top: el.y,
        width: el.w,
        height: el.h,
        opacity: el.opacity ?? 1,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        cursor,
        ...style,
      }}
    >
      {contenido}
    </div>
  );
});

/** Diapositiva de sólo lectura (reproductor, miniaturas, presentación). */
export const SlideView = memo(function SlideView({ canvas, className, interactivo = false }: { canvas: SlideCanvas; className?: string; interactivo?: boolean }) {
  return (
    <StageFrame bg={canvasBackgroundStyle(canvas)} className={className}>
      {() => canvas.elements.map((el) => <ElementBox key={el.id} el={el} play={interactivo} />)}
    </StageFrame>
  );
});
