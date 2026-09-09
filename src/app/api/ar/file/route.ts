import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { AR_DIR } from "@/lib/ar/marker";

/*
  Sirve el material de una tarjeta AR: el dibujo, el marcador .patt, la lámina
  imprimible y el modelo .glb.

  Por qué existe: en Railway el sistema de archivos del contenedor se rehace en
  cada despliegue, así que todo lo que el profesor sube desde el panel
  desaparece. Lo que persiste es la base de datos, y ahí es donde se guardan
  estos archivos ahora. El disco queda sólo como respaldo para las tarjetas
  creadas antes del cambio y para desarrollo local.
*/

type Tipo = "image" | "patt" | "lamina" | "model";

const TIPOS: Record<Tipo, { columna: "image_data" | "patt_data" | "lamina_data" | "model_data"; mime: string; archivo: (code: string) => string }> = {
  image: { columna: "image_data", mime: "image/png", archivo: (c) => `marker_${c}.png` },
  patt: { columna: "patt_data", mime: "text/plain; charset=utf-8", archivo: (c) => `marker_${c}.patt` },
  lamina: { columna: "lamina_data", mime: "image/png", archivo: (c) => `lamina_${c}.png` },
  model: { columna: "model_data", mime: "model/gltf-binary", archivo: (c) => `${c}.glb` },
};

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const tipo = req.nextUrl.searchParams.get("type") as Tipo | null;
  if (!code || !tipo || !TIPOS[tipo]) {
    return NextResponse.json({ error: "code y type requeridos" }, { status: 400 });
  }
  const { columna, mime, archivo } = TIPOS[tipo];

  /*
    Se pide SÓLO la columna que toca. Traer la fila entera cargaría de paso el
    modelo .glb —varios megas— cada vez que alguien pide una miniatura de 100 kB,
    y esta ruta se llama una vez por imagen de cada galería.
  */
  const fila = await prisma.arCard.findFirst({
    where: { card_code: code },
    select: { [columna]: true } as Record<string, true>,
  });

  const dato = (fila as Record<string, unknown> | null)?.[columna];
  if (dato) {
    const cuerpo = typeof dato === "string" ? dato : new Uint8Array(dato as Uint8Array);
    return new NextResponse(cuerpo, {
      headers: {
        "Content-Type": mime,
        // El código de la tarjeta cambia cada vez que se reemplaza el marcador,
        // así que una URL dada siempre devuelve lo mismo y se puede cachear.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  // Respaldo en disco: tarjetas anteriores al cambio y desarrollo local.
  const nombre = archivo(code);
  for (const p of [path.join(AR_DIR, nombre), path.join(AR_DIR, "models", nombre)]) {
    try {
      const datos = await fs.readFile(p);
      return new NextResponse(new Uint8Array(datos), {
        headers: { "Content-Type": mime, "Cache-Control": "public, max-age=31536000, immutable" },
      });
    } catch {
      /* siguiente candidato */
    }
  }

  return NextResponse.json({ error: "no encontrado" }, { status: 404 });
}
