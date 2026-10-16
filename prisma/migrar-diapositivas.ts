/**
 * Convierte las diapositivas hechas con el formulario antiguo (columnas layout, title,
 * body, image_id) en diapositivas de lienzo del editor actual (columna canvas).
 *
 *   npx tsx prisma/migrar-diapositivas.ts
 *
 * Ejecútalo UNA vez en cada base ANTES de aplicar la migración «1_quitar_diapositivas_antiguas»,
 * que borra esas columnas. Lee y escribe con SQL directo porque el cliente de Prisma ya no
 * conoce las columnas antiguas. Es idempotente: sólo toca las diapositivas sin lienzo.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { newId, sanitizeCanvas, type CanvasElement, type SlideCanvas } from "../src/lib/slide-canvas";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

type Fila = { id: number; layout: string; title: string; body: string; image_id: number | null };

/** Lienzo equivalente a una diapositiva del formulario antiguo (layout + título + texto + imagen). */
function aLienzo(s: { layout: string; title: string; body: string; imageId: number | null }): SlideCanvas {
  const els: CanvasElement[] = [];
  const body = s.body.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/^\s*-\s+/gm, "• ");
  const titulo = (x: number, y: number, w: number, size: number, align: "left" | "center" = "left") =>
    s.title && els.push({ id: newId(), type: "text", x, y, w, h: size * 1.5, text: s.title, fontSize: size, font: "display", bold: true, align, color: "#1a1a2e" });
  const cuerpo = (x: number, y: number, w: number, h: number, size: number, align: "left" | "center" = "left") =>
    body && els.push({ id: newId(), type: "text", x, y, w, h, text: body, fontSize: size, font: "sans", align, color: "#333344" });
  const imagen = (x: number, y: number, w: number, h: number) =>
    s.imageId && els.push({ id: newId(), type: "image", x, y, w, h, mediaId: s.imageId, fit: "contain" });

  if (s.layout === "portada") {
    imagen(380, 40, 200, 150);
    titulo(80, 210, 800, 56, "center");
    cuerpo(160, 320, 640, 160, 24, "center");
  } else if (s.layout === "imagen-arriba") {
    imagen(280, 30, 400, 230);
    titulo(60, 275, 840, 36);
    cuerpo(60, 335, 840, 180, 22);
  } else if (s.layout === "solo-texto" || !s.imageId) {
    titulo(60, 50, 840, 40);
    cuerpo(60, 130, 840, 370, 26);
  } else {
    imagen(50, 60, 400, 420);
    titulo(490, 70, 420, 36);
    cuerpo(490, 140, 420, 340, 22);
  }
  return { background: "#ffffff", elements: els };
}

async function main() {
  // Si las columnas antiguas ya no existen (migración aplicada), no hay nada que convertir.
  const hay = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM information_schema.columns WHERE table_name = 'topic_slides' AND column_name = 'layout'`;
  if (!hay[0]?.n) { console.log("Las columnas antiguas ya no existen: nada que convertir."); return; }

  const filas = await prisma.$queryRaw<Fila[]>`SELECT id, layout, title, body, image_id FROM topic_slides WHERE canvas IS NULL`;
  for (const f of filas) {
    const canvas = sanitizeCanvas(aLienzo({ layout: f.layout, title: f.title, body: f.body, imageId: f.image_id }));
    await prisma.$executeRaw`UPDATE topic_slides SET canvas = ${JSON.stringify(canvas)}::jsonb WHERE id = ${f.id}`;
  }
  console.log(`Diapositivas convertidas: ${filas.length}`);
}

main().finally(() => prisma.$disconnect());
