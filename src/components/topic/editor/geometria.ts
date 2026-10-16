import type { CanvasElement } from "@/lib/slide-canvas";
import { MIN } from "./constantes";
import type { Handle } from "./tipos";

export const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
export const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
export const rotar = (x: number, y: number, deg: number) => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [x * c - y * s, x * s + y * c] as const;
};

/** Nuevas medidas de un elemento al arrastrar un asa, respetando su giro. */
export function redimensionar(o: CanvasElement, handle: Handle, dx: number, dy: number, mantener: boolean): Partial<CanvasElement> {
  const sx = handle.includes("e") ? 1 : handle.includes("w") ? -1 : 0;
  const sy = handle.includes("s") ? 1 : handle.includes("n") ? -1 : 0;
  const giro = o.rotation ?? 0;
  const [ldx, ldy] = rotar(dx, dy, -giro);
  let w = o.w + sx * ldx, h = o.h + sy * ldy;
  const esquina = sx !== 0 && sy !== 0;
  if (esquina && (mantener || o.type === "image" || o.type === "text" || o.type === "sound")) {
    const k = Math.max(w / o.w, h / o.h, MIN / Math.min(o.w, o.h));
    w = o.w * k;
    h = o.h * k;
  } else if (o.type === "text") h = o.h;
  w = Math.max(MIN, w);
  h = Math.max(MIN, h);
  // El punto opuesto al asa no se mueve: se recalcula el centro a partir de él.
  const [ax, ay] = rotar((-sx * o.w) / 2, (-sy * o.h) / 2, giro);
  const [bx, by] = rotar((-sx * w) / 2, (-sy * h) / 2, giro);
  const cx = o.x + o.w / 2 + ax - bx, cy = o.y + o.h / 2 + ay - by;
  const patch: Partial<CanvasElement> = { x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), w: Math.round(w), h: Math.round(h) };
  if (o.type === "text" && esquina) patch.fontSize = clamp(Math.round(((o.fontSize ?? 32) * w) / o.w), 8, 200);
  return patch;
}

/** Imagen reducida y recomprimida en el navegador: sube mucho menos a la base de datos. */
export async function prepararImagen(file: File): Promise<{ file: File; w: number; h: number }> {
  let bmp: ImageBitmap | null = null;
  try { bmp = await createImageBitmap(file); } catch { /* formato que el navegador no decodifica: se sube tal cual */ }
  if (!bmp) return { file, w: 400, h: 300 };
  const { width, height } = bmp;
  const MAXLADO = 1600;
  const animada = file.type === "image/gif";
  if (animada || (file.size < 250_000 && Math.max(width, height) <= MAXLADO)) { bmp.close(); return { file, w: width, h: height }; }

  const k = Math.min(1, MAXLADO / Math.max(width, height));
  const w = Math.round(width * k), h = Math.round(height * k);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")?.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.85));
  if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return { file, w, h };
  return { file: new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" }), w, h };
}
