import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { leerBiblioteca } from "@/lib/recursos";
import { MEDIA_RULES } from "@/lib/topic-slides";

/*
  Imágenes de los ejercicios (ExerciseMedia): pertenecen al paralelo, viven en la
  base de datos y se guardan reducidas (máx. 1400 px, WebP) para no engordarla.
*/

const MAX_LADO = 1400;

/** Valida un archivo subido, lo reduce y lo guarda. `null` si no había archivo. */
export async function guardarImagenEjercicio(paraleloId: number, file: FormDataEntryValue | null): Promise<number | null | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return null;
  const rule = MEDIA_RULES.image;
  if (!(rule.mimes as readonly string[]).includes(file.type)) return { error: `Formato no admitido. Sube una ${rule.label}.` };
  if (file.size > rule.maxBytes) return { error: `La imagen es demasiado grande. Máximo ${Math.round(rule.maxBytes / 1024 / 1024)} MB.` };

  const original = Buffer.from(await file.arrayBuffer());
  let data: Buffer = original;
  let mime = file.type;
  // Los GIF se dejan como están (podrían ser animados); el resto se reduce.
  if (file.type !== "image/gif") {
    try {
      const reducida = await sharp(original).rotate().resize({ width: MAX_LADO, height: MAX_LADO, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
      if (reducida.length < original.length) { data = reducida; mime = "image/webp"; }
    } catch {
      return { error: "No se pudo leer la imagen. ¿Está dañada?" };
    }
  }
  const fila = await prisma.exerciseMedia.create({
    data: { paralelo_id: paraleloId, nombre: file.name.slice(0, 255), mime, size_bytes: data.length, data: Uint8Array.from(data) },
    select: { id: true },
  });
  return fila.id;
}

/** Copia una imagen de la biblioteca de la aplicación al paralelo (una sola vez por nombre). */
export async function importarBibliotecaEjercicio(paraleloId: number, grupo: string, archivo: string, opciones: { sinRotulo?: boolean } = {}): Promise<number | null> {
  const f = await leerBiblioteca(grupo, archivo, opciones);
  if (!f) return null;
  const ya = await prisma.exerciseMedia.findFirst({ where: { paralelo_id: paraleloId, nombre: f.nombre }, select: { id: true } });
  if (ya) return ya.id;
  const fila = await prisma.exerciseMedia.create({
    data: { paralelo_id: paraleloId, nombre: f.nombre.slice(0, 255), mime: f.mime, size_bytes: f.data.length, data: Uint8Array.from(f.data) },
    select: { id: true },
  });
  return fila.id;
}

/** Imagen reducida a 480 px de ancho y desenfocada: lo único que ve el alumno mientras adivina. */
export async function imagenDesenfocada(buf: Buffer | Uint8Array, sigma: number): Promise<Buffer> {
  return sharp(buf).rotate().resize({ width: 480, withoutEnlargement: true }).blur(Math.max(sigma, 0.3)).webp({ quality: 70 }).toBuffer();
}

/** ¿Está el alumno inscrito (gestión actual) en este paralelo? Mismo criterio que alumnoPuedeVerLeccion. */
export async function alumnoEnParalelo(alumnoId: number, paraleloId: number): Promise<boolean> {
  const insc = await prisma.inscripcion.findFirst({
    where: { alumno_id: alumnoId, paralelo_id: paraleloId, estado: { in: ["activo", "reincorporado"] }, paralelo: { gestion: { es_actual: true } } },
    select: { id: true },
  });
  return !!insc;
}
