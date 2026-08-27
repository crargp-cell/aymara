import fs from "fs/promises";
import path from "path";
import sharp from "sharp";

export const AR_DIR = path.join(process.cwd(), "public", "ar");
export const AR_MODELS_DIR = path.join(AR_DIR, "models");

/**
 * Guarda el marcador tal como lo sube el maestro: la imagen de referencia (normalizada a PNG
 * con sharp, sin inventar contenido) siempre, y el `.patt` solo si lo adjunta — ya no se genera
 * un `.patt` falso automáticamente. La imagen es lo único que usa `mind-ar` en tiempo real
 * (compila el target en el navegador); el `.patt` queda como descarga opcional para AR.js.
 */
export async function saveUploadedMarker(imageBuffer: Buffer, pattBuffer: Buffer | null) {
  const code = `AR${Date.now()}`.slice(0, 20);
  await fs.mkdir(AR_DIR, { recursive: true });

  const preview = await sharp(imageBuffer)
    .resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .normalize()
    .sharpen({ sigma: 1.2, m1: 1, m2: 2 })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await fs.writeFile(path.join(AR_DIR, `marker_${code}.png`), preview);

  if (pattBuffer) {
    await fs.writeFile(path.join(AR_DIR, `marker_${code}.patt`), pattBuffer);
  }

  return { code, markerFile: pattBuffer ? `marker_${code}.patt` : `marker_${code}.png`, previewFile: `marker_${code}.png` };
}

export async function saveArModel(code: string, buffer: Buffer) {
  await fs.mkdir(AR_MODELS_DIR, { recursive: true });
  const filename = `${code}.glb`;
  await fs.writeFile(path.join(AR_MODELS_DIR, filename), buffer);
  return `/ar/models/${filename}`;
}

export async function fileExists(absolutePath: string) {
  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}
