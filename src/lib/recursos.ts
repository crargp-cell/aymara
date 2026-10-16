import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/*
  Biblioteca de imágenes que viene con la aplicación (public/). Se ofrece en el
  panel de recursos del editor de diapositivas junto con lo que los maestros ya
  subieron. Sólo se puede pedir un archivo que esté en esta lista: el nombre
  llega del cliente y nunca se usa como ruta sin comprobarlo.
*/

const GRUPOS = [
  { grupo: "alfabeto", titulo: "Alfabeto aymara", dir: "alphabet" },
  { grupo: "mascota", titulo: "Mallku, el cóndor", dir: "mascota" },
  { grupo: "portadas", titulo: "Portadas", dir: "covers" },
  { grupo: "intro", titulo: "Introducción", dir: "intro" },
] as const;

const EXT = /\.(png|jpe?g|webp)$/i;

export type RecursoBiblioteca = { grupo: string; grupoTitulo: string; archivo: string; nombre: string; /** Ruta pública, para la miniatura. */ url: string };

export async function listarBiblioteca(): Promise<RecursoBiblioteca[]> {
  const out: RecursoBiblioteca[] = [];
  for (const g of GRUPOS) {
    let archivos: string[] = [];
    try { archivos = await fs.readdir(path.join(process.cwd(), "public", g.dir)); } catch { /* carpeta ausente: se omite */ }
    for (const archivo of archivos.filter((a) => EXT.test(a)).sort((a, b) => a.localeCompare(b, "es"))) {
      out.push({ grupo: g.grupo, grupoTitulo: g.titulo, archivo, nombre: archivo.replace(EXT, ""), url: `/${g.dir}/${encodeURIComponent(archivo)}` });
    }
  }
  return out;
}

/** Lee un archivo de la biblioteca y lo reduce (máx. 1400 px, WebP) para no engordar la base de datos. */
/** Fracción de alto que ocupa el rótulo (letra, palabra y significado) al pie de las láminas del alfabeto. */
const ALTO_SIN_ROTULO = 0.76;

/**
 * `sinRotulo` recorta el rótulo al pie de las láminas del alfabeto: lo necesitan los juegos
 * de adivinar, donde la propia imagen traería escrita la respuesta.
 */
export async function leerBiblioteca(grupo: string, archivo: string, opciones: { sinRotulo?: boolean } = {}): Promise<{ data: Buffer; mime: string; nombre: string } | null> {
  const g = GRUPOS.find((x) => x.grupo === grupo);
  if (!g) return null;
  const lista = await listarBiblioteca();
  if (!lista.some((r) => r.grupo === grupo && r.archivo === archivo)) return null;
  const buf = await fs.readFile(path.join(process.cwd(), "public", g.dir, archivo));
  if (opciones.sinRotulo && grupo === "alfabeto") {
    const meta = await sharp(buf).metadata();
    if (meta.width && meta.height) {
      const data = await sharp(buf).extract({ left: 0, top: 0, width: meta.width, height: Math.floor(meta.height * ALTO_SIN_ROTULO) }).resize({ width: 1000, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
      return { data, mime: "image/webp", nombre: `${g.titulo}/${archivo.replace(EXT, "")} (sin rótulo).webp` };
    }
  }
  try {
    const data = await sharp(buf).rotate().resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    if (data.length < buf.length) return { data, mime: "image/webp", nombre: `${g.titulo}/${archivo.replace(EXT, "")}.webp` };
  } catch { /* si sharp no puede, se sube tal cual */ }
  const mime = /\.png$/i.test(archivo) ? "image/png" : /\.webp$/i.test(archivo) ? "image/webp" : "image/jpeg";
  return { data: buf, mime, nombre: `${g.titulo}/${archivo}` };
}
