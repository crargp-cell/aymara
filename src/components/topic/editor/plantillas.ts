import { emptyCanvas, newId, type CanvasElement, type SlideCanvas } from "@/lib/slide-canvas";

/** Texto de plantilla con valores por defecto (id, posición, tamaño y contenido). */
export const t = (id: string, x: number, y: number, w: number, texto: string, size: number, extra: Partial<CanvasElement> = {}): CanvasElement => ({
  id, type: "text", x, y, w, h: size * 1.4, text: texto, fontSize: size, font: "sans", align: "left", color: "#1a1a2e", ...extra,
});

export const PLANTILLAS: { nombre: string; crear: () => SlideCanvas }[] = [
  { nombre: "En blanco", crear: emptyCanvas },
  {
    nombre: "Título y texto",
    crear: () => ({ background: "#ffffff", elements: [
      t(newId(), 60, 50, 840, "Título de la diapositiva", 44, { font: "display", bold: true }),
      t(newId(), 60, 140, 840, "Escribe aquí el contenido.", 28, { color: "#333344" }),
    ] }),
  },
  {
    nombre: "Portada",
    crear: () => ({ background: "#dbeafe", background2: "#ede9fe", elements: [
      t(newId(), 80, 190, 800, "Título del tema", 64, { font: "display", bold: true, align: "center", color: "#1e3a8a" }),
      t(newId(), 160, 310, 640, "Subtítulo", 28, { align: "center", color: "#334155" }),
    ] }),
  },
  {
    nombre: "Dos columnas",
    crear: () => ({ background: "#ffffff", elements: [
      t(newId(), 60, 40, 840, "Título", 40, { font: "display", bold: true }),
      { id: newId(), type: "shape", shape: "rounded", x: 60, y: 120, w: 410, h: 370, fill: "#dbeafe", radius: 24 },
      { id: newId(), type: "shape", shape: "rounded", x: 490, y: 120, w: 410, h: 370, fill: "#fef3c7", radius: 24 },
      t(newId(), 84, 144, 362, "Primera columna", 26, { bold: true }),
      t(newId(), 514, 144, 362, "Segunda columna", 26, { bold: true }),
    ] }),
  },
  {
    nombre: "Destacado",
    crear: () => ({ background: "#1e3a8a", elements: [
      t(newId(), 100, 180, 760, "Una idea importante", 56, { font: "display", bold: true, align: "center", color: "#ffffff" }),
      { id: newId(), type: "shape", shape: "line", x: 380, y: 340, w: 200, h: 16, fill: "#facc15" },
    ] }),
  },
];
