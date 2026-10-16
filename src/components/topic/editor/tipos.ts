import type { CanvasElement, SlideCanvas } from "@/lib/slide-canvas";

export type Slide = { id: number; canvas: SlideCanvas; audioId: number | null; version: string };
export type Draft = Record<string, Partial<CanvasElement>>;
export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
export type Historial = { id: number; canvas: SlideCanvas };
