import { ArrowRight, Circle, Minus, RectangleHorizontal, Square, Star, Triangle } from "lucide-react";
import type { ShapeKind } from "@/lib/slide-canvas";
import type { Handle } from "./tipos";

export const HANDLE_POS: Record<Handle, { left: string; top: string; cursor: string }> = {
  nw: { left: "0%", top: "0%", cursor: "nwse-resize" },
  n: { left: "50%", top: "0%", cursor: "ns-resize" },
  ne: { left: "100%", top: "0%", cursor: "nesw-resize" },
  e: { left: "100%", top: "50%", cursor: "ew-resize" },
  se: { left: "100%", top: "100%", cursor: "nwse-resize" },
  s: { left: "50%", top: "100%", cursor: "ns-resize" },
  sw: { left: "0%", top: "100%", cursor: "nesw-resize" },
  w: { left: "0%", top: "50%", cursor: "ew-resize" },
};

export const SWATCHES = ["#ffffff", "#1a1a2e", "#ef4444", "#f59e0b", "#facc15", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#fef3c7", "#dbeafe", "#dcfce7"];
export const SNAP_PX = 6; // en píxeles de pantalla
export const MIN = 16;
export const ZOOMS = [50, 75, 100, 125, 150, 200];

export const FIGURAS: { shape: ShapeKind; label: string; icon: React.ReactNode }[] = [
  { shape: "rect", label: "Rectángulo", icon: <Square /> },
  { shape: "rounded", label: "Rectángulo redondeado", icon: <RectangleHorizontal /> },
  { shape: "ellipse", label: "Círculo", icon: <Circle /> },
  { shape: "triangle", label: "Triángulo", icon: <Triangle /> },
  { shape: "star", label: "Estrella", icon: <Star /> },
  { shape: "line", label: "Línea", icon: <Minus /> },
  { shape: "arrow", label: "Flecha", icon: <ArrowRight /> },
];
