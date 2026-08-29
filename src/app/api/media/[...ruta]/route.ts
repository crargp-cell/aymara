import fs from "fs/promises";
import path from "path";
import { createHash } from "crypto";
import { NextRequest } from "next/server";

/*
  Sirve los archivos que se suben en caliente (marcadores AR, modelos .glb, PDFs
  de temas).

  Por qué hace falta: `next start` indexa el contenido de `public/` una sola vez,
  al arrancar. Todo lo que se escriba ahí después responde 404, y cuando el que
  pide es `next/image` el error que se ve en consola es "The requested resource
  isn't a valid image ... received null" — el optimizador recibe la página 404 en
  vez del PNG. En `next dev` no pasa, por eso sólo aparecía en producción.

  Este handler lee del disco en cada petición, así que un archivo recién subido
  se sirve sin reiniciar el servidor. Las rutas históricas `/ar/...` y
  `/uploads/...` llegan aquí por un rewrite de respaldo (ver `next.config.ts`),
  que sólo actúa cuando el archivo estático no estaba en el índice: lo que sí
  estaba lo sigue sirviendo Next directamente, que es más rápido.
*/

/** Únicas carpetas alcanzables. El primer segmento de la URL elige una. */
const RAICES: Record<string, string> = {
  ar: path.join(process.cwd(), "public", "ar"),
  uploads: path.join(process.cwd(), "public", "uploads"),
};

const TIPOS: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".bin": "application/octet-stream",
  // AR.js espera texto plano en los marcadores .patt
  ".patt": "text/plain; charset=utf-8",
  ".mind": "application/octet-stream",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ ruta: string[] }> }) {
  const { ruta } = await params;
  const [raiz, ...resto] = ruta ?? [];
  const base = RAICES[raiz];
  if (!base || resto.length === 0) return new Response("No encontrado", { status: 404 });

  // Los segmentos llegan decodificados; se recompone y se comprueba que el
  // resultado siga dentro de la carpeta permitida (defensa contra "..").
  const destino = path.resolve(base, ...resto);
  if (destino !== base && !destino.startsWith(base + path.sep)) {
    return new Response("Ruta no permitida", { status: 403 });
  }

  let datos: Buffer;
  try {
    const info = await fs.stat(destino);
    if (!info.isFile()) return new Response("No encontrado", { status: 404 });
    datos = await fs.readFile(destino);
  } catch {
    return new Response("No encontrado", { status: 404 });
  }

  const tipo = TIPOS[path.extname(destino).toLowerCase()] ?? "application/octet-stream";
  return new Response(new Uint8Array(datos), {
    headers: {
      "Content-Type": tipo,
      "Content-Length": String(datos.byteLength),
      // Contenido reemplazable (al editar una tarjeta se genera un código nuevo,
      // pero el archivo antiguo puede sobrescribirse): se revalida siempre.
      "Cache-Control": "public, max-age=0, must-revalidate",
      ETag: `"${createHash("sha1").update(datos).digest("hex")}"`,
    },
  });
}
