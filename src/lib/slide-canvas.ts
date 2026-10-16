/*
  Modelo del lienzo de una diapositiva (editor tipo Canva).

  Todo vive en un espacio de coordenadas fijo de 960×540 (16:9). El editor y el
  reproductor lo escalan con CSS, así una diapositiva se ve igual en cualquier
  tamaño de pantalla. Este módulo no importa Prisma: lo usan componentes de
  cliente y el servidor.
*/

export const CANVAS_W = 960;
export const CANVAS_H = 540;

export const FONTS = {
  sans: { label: "Moderna", css: "var(--font-sans, ui-sans-serif), system-ui, sans-serif" },
  serif: { label: "Clásica", css: "Georgia, 'Times New Roman', serif" },
  display: { label: "Titular", css: "'Trebuchet MS', 'Arial Black', system-ui, sans-serif" },
  mono: { label: "Máquina", css: "ui-monospace, 'Courier New', monospace" },
} as const;
export type FontKey = keyof typeof FONTS;

export type ShapeKind = "rect" | "rounded" | "ellipse" | "triangle" | "star" | "line" | "arrow";
const SHAPES: readonly ShapeKind[] = ["rect", "rounded", "ellipse", "triangle", "star", "line", "arrow"];

export type CanvasElement = {
  id: string;
  /** "sound" = botón con altavoz: reproduce una grabación (mediaId, audio) o, sin ella, lee `text` con una voz sintética. */
  type: "text" | "image" | "shape" | "sound";
  x: number;
  y: number;
  w: number;
  h: number;
  /** Grados, giro alrededor del centro. */
  rotation?: number;
  locked?: boolean;
  opacity?: number;
  // texto
  text?: string;
  fontSize?: number;
  font?: FontKey;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: "left" | "center" | "right";
  color?: string;
  lineHeight?: number;
  // imagen (o grabación de audio, en un botón de sonido)
  mediaId?: number;
  fit?: "contain" | "cover";
  radius?: number;
  // figura ("none" = sin relleno)
  shape?: ShapeKind;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
};

export const PATTERNS = {
  puntos: "Puntos",
  cuadricula: "Cuadrícula",
  diagonal: "Diagonales",
  tablero: "Tablero",
  zigzag: "Zigzag",
  olas: "Olas",
  triangulos: "Triángulos",
  escalera: "Escalera andina",
} as const;
export type PatternKind = keyof typeof PATTERNS;

/** Fondo y contenido de una diapositiva. Todos los campos del fondo son opcionales y se combinan por capas. */
export type SlideCanvas = {
  background: string;
  /** Segundo color: si existe, el fondo es un degradado. */
  background2?: string;
  gradType?: "linear" | "radial";
  gradAngle?: number;
  pattern?: PatternKind;
  patternColor?: string;
  patternOpacity?: number;
  patternSize?: number;
  /** Imagen de fondo (TopicMedia) y capa de color encima para que el texto se lea. */
  bgMediaId?: number;
  bgOverlay?: string;
  bgOverlayOpacity?: number;
  elements: CanvasElement[];
};

/** Campos del fondo, para copiarlos o limpiarlos juntos. */
export const BG_KEYS = ["background", "background2", "gradType", "gradAngle", "pattern", "patternColor", "patternOpacity", "patternSize", "bgMediaId", "bgOverlay", "bgOverlayOpacity"] as const;

export const GRADIENTES: { nombre: string; a: string; b: string; tipo?: "linear" | "radial"; angulo?: number }[] = [
  { nombre: "Atardecer andino", a: "#f59e0b", b: "#be185d", angulo: 135 },
  { nombre: "Lago Titicaca", a: "#0ea5e9", b: "#1e3a8a", angulo: 160 },
  { nombre: "Altiplano", a: "#fef3c7", b: "#fdba74", angulo: 135 },
  { nombre: "Bosque", a: "#86efac", b: "#166534", angulo: 150 },
  { nombre: "Cielo", a: "#bfdbfe", b: "#e0e7ff", angulo: 180 },
  { nombre: "Noche", a: "#1e1b4b", b: "#4c1d95", angulo: 135 },
  { nombre: "Coral", a: "#fda4af", b: "#fb923c", angulo: 135 },
  { nombre: "Menta", a: "#a7f3d0", b: "#67e8f9", angulo: 135 },
  { nombre: "Lavanda", a: "#ddd6fe", b: "#fbcfe8", angulo: 135 },
  { nombre: "Sol", a: "#fde68a", b: "#f59e0b", tipo: "radial" },
  { nombre: "Aurora", a: "#4338ca", b: "#0f172a", tipo: "radial" },
  { nombre: "Papel", a: "#ffffff", b: "#e2e8f0", angulo: 180 },
];

/** SVG de una baldosa del patrón (se repite como imagen de fondo). */
function baldosa(kind: PatternKind, size: number, color: string, opacity: number): string {
  const s = size, c = color, o = opacity;
  const stroke = `fill="none" stroke="${c}" stroke-opacity="${o}" stroke-width="${Math.max(1, s / 24)}" stroke-linecap="round" stroke-linejoin="round"`;
  const fill = `fill="${c}" fill-opacity="${o}"`;
  let cuerpo: string;
  switch (kind) {
    case "puntos": cuerpo = `<circle cx="${s / 2}" cy="${s / 2}" r="${s * 0.09}" ${fill}/>`; break;
    case "cuadricula": cuerpo = `<path d="M${s} 0V${s}M0 ${s}H${s}" ${stroke}/>`; break;
    case "diagonal": cuerpo = `<path d="M0 ${s}L${s} 0M${-s / 2} ${s / 2}L${s / 2} ${-s / 2}M${s / 2} ${s * 1.5}L${s * 1.5} ${s / 2}" ${stroke}/>`; break;
    case "tablero": cuerpo = `<rect width="${s / 2}" height="${s / 2}" ${fill}/><rect x="${s / 2}" y="${s / 2}" width="${s / 2}" height="${s / 2}" ${fill}/>`; break;
    case "zigzag": cuerpo = `<path d="M0 ${s * 0.75}L${s / 4} ${s * 0.25}L${s / 2} ${s * 0.75}L${s * 0.75} ${s * 0.25}L${s} ${s * 0.75}" ${stroke}/>`; break;
    case "olas": cuerpo = `<path d="M0 ${s / 2}Q${s / 4} 0 ${s / 2} ${s / 2}T${s} ${s / 2}" ${stroke}/>`; break;
    case "triangulos": cuerpo = `<polygon points="${s / 2},${s * 0.15} ${s * 0.85},${s * 0.85} ${s * 0.15},${s * 0.85}" ${fill}/>`; break;
    default: cuerpo = `<path d="M0 ${s * 0.9}H${s * 0.25}V${s * 0.65}H${s * 0.5}V${s * 0.4}H${s * 0.75}V${s * 0.15}H${s}" ${stroke}/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">${cuerpo}</svg>`;
}

/** Estilo CSS del fondo del lienzo: color base + capas (velo, patrón, imagen o degradado). */
export function canvasBackgroundStyle(c: SlideCanvas): { backgroundColor: string; backgroundImage?: string; backgroundSize?: string; backgroundPosition?: string; backgroundRepeat?: string } {
  const imagenes: string[] = [], tamanos: string[] = [], repeticiones: string[] = [];
  const capa = (img: string, tam: string, rep: string) => { imagenes.push(img); tamanos.push(tam); repeticiones.push(rep); };

  if (c.bgMediaId && c.bgOverlay && (c.bgOverlayOpacity ?? 0) > 0) {
    const hex = c.bgOverlay.slice(1);
    const rgba = `rgba(${parseInt(hex.slice(0, 2), 16)},${parseInt(hex.slice(2, 4), 16)},${parseInt(hex.slice(4, 6), 16)},${c.bgOverlayOpacity})`;
    capa(`linear-gradient(${rgba},${rgba})`, "auto", "no-repeat");
  }
  if (c.pattern) {
    const svg = baldosa(c.pattern, c.patternSize ?? 48, c.patternColor ?? "#000000", c.patternOpacity ?? 0.12);
    capa(`url("data:image/svg+xml,${encodeURIComponent(svg)}")`, `${c.patternSize ?? 48}px ${c.patternSize ?? 48}px`, "repeat");
  }
  if (c.bgMediaId) capa(`url("${mediaUrl(c.bgMediaId)}")`, "cover", "no-repeat");
  else if (c.background2) {
    capa(c.gradType === "radial" ? `radial-gradient(circle at center, ${c.background}, ${c.background2})` : `linear-gradient(${c.gradAngle ?? 135}deg, ${c.background}, ${c.background2})`, "auto", "no-repeat");
  }
  return imagenes.length
    ? { backgroundColor: c.background, backgroundImage: imagenes.join(","), backgroundSize: tamanos.join(","), backgroundRepeat: repeticiones.join(","), backgroundPosition: "center" }
    : { backgroundColor: c.background };
}

export const mediaUrl = (id: number) => `/api/topic-media/${id}`;

export const emptyCanvas = (): SlideCanvas => ({ background: "#ffffff", elements: [] });

export const newId = () => Math.random().toString(36).slice(2, 10);

/** Caja que ocupa el elemento en el lienzo contando su giro. */
export function elementBounds(e: CanvasElement) {
  const a = ((e.rotation ?? 0) * Math.PI) / 180;
  const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  const w = e.w * c + e.h * s, h = e.w * s + e.h * c;
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
  return { x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2 };
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const MAX_ELEMENTS = 80;

const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(Math.max(v, min), max) : fallback;
const color = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v) ? v : fallback);

/**
 * Normaliza lo que llega del cliente (o de la base): descarta lo desconocido,
 * limita tamaños y fuerza tipos. El servidor nunca guarda el JSON tal cual.
 */
export function sanitizeCanvas(raw: unknown): SlideCanvas {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = Array.isArray(r.elements) ? r.elements.slice(0, MAX_ELEMENTS) : [];
  const elements: CanvasElement[] = [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const e = item as Record<string, unknown>;
    if (e.type !== "text" && e.type !== "image" && e.type !== "shape" && e.type !== "sound") continue;
    const base = {
      id: typeof e.id === "string" && e.id ? e.id.slice(0, 16) : newId(),
      x: num(e.x, -CANVAS_W, CANVAS_W * 2, 0),
      y: num(e.y, -CANVAS_H, CANVAS_H * 2, 0),
      w: num(e.w, 8, CANVAS_W * 2, 200),
      h: num(e.h, 8, CANVAS_H * 2, 100),
      rotation: num(e.rotation, -360, 360, 0),
      locked: e.locked === true,
      opacity: num(e.opacity, 0.05, 1, 1),
    };
    if (e.type === "text") {
      elements.push({
        ...base,
        type: "text",
        text: typeof e.text === "string" ? e.text.slice(0, 5000) : "",
        fontSize: num(e.fontSize, 8, 200, 32),
        font: typeof e.font === "string" && e.font in FONTS ? (e.font as FontKey) : "sans",
        bold: e.bold === true,
        italic: e.italic === true,
        underline: e.underline === true,
        align: e.align === "center" || e.align === "right" ? e.align : "left",
        color: color(e.color, "#1a1a2e"),
        lineHeight: num(e.lineHeight, 0.8, 3, 1.25),
      });
    } else if (e.type === "sound") {
      elements.push({
        ...base,
        type: "sound",
        text: typeof e.text === "string" ? e.text.slice(0, 200) : "",
        color: color(e.color, "#4338ca"),
        ...(Number.isInteger(e.mediaId) ? { mediaId: e.mediaId as number } : {}),
      });
    } else if (e.type === "image") {
      if (!Number.isInteger(e.mediaId)) continue;
      elements.push({ ...base, type: "image", mediaId: e.mediaId as number, fit: e.fit === "cover" ? "cover" : "contain", radius: num(e.radius, 0, 400, 0) });
    } else {
      elements.push({
        ...base,
        type: "shape",
        shape: SHAPES.includes(e.shape as ShapeKind) ? (e.shape as ShapeKind) : "rect",
        fill: e.fill === "none" ? "none" : color(e.fill, "#3b82f6"),
        stroke: color(e.stroke, "#1e3a8a"),
        strokeWidth: num(e.strokeWidth, 0, 40, 0),
        radius: num(e.radius, 0, 400, 24),
      });
    }
  }
  const out: SlideCanvas = { background: color(r.background, "#ffffff"), elements };
  if (typeof r.background2 === "string" && HEX.test(r.background2)) {
    out.background2 = r.background2;
    out.gradType = r.gradType === "radial" ? "radial" : "linear";
    out.gradAngle = num(r.gradAngle, 0, 360, 135);
  }
  if (typeof r.pattern === "string" && r.pattern in PATTERNS) {
    out.pattern = r.pattern as PatternKind;
    out.patternColor = color(r.patternColor, "#000000");
    out.patternOpacity = num(r.patternOpacity, 0.02, 1, 0.12);
    out.patternSize = num(r.patternSize, 12, 200, 48);
  }
  if (Number.isInteger(r.bgMediaId)) {
    out.bgMediaId = r.bgMediaId as number;
    out.bgOverlay = color(r.bgOverlay, "#000000");
    out.bgOverlayOpacity = num(r.bgOverlayOpacity, 0, 0.9, 0);
  }
  return out;
}

/** Ids de imágenes (TopicMedia) que usa un lienzo. */
export function canvasMediaIds(canvas: SlideCanvas): number[] {
  const ids = canvas.elements.flatMap((e) => ((e.type === "image" || e.type === "sound") && e.mediaId ? [e.mediaId] : []));
  return canvas.bgMediaId ? [...ids, canvas.bgMediaId] : ids;
}

/** Resumen de texto para la lista de diapositivas y los campos antiguos. */
export function canvasTitle(canvas: SlideCanvas): string {
  const textos = canvas.elements
    .filter((e) => e.type === "text" && e.text?.trim())
    .sort((a, b) => (b.fontSize ?? 0) - (a.fontSize ?? 0));
  return (textos[0]?.text ?? "").trim().split("\n")[0].slice(0, 255);
}
