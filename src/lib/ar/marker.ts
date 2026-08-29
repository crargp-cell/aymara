import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { generarPatt, construirLamina } from "./patt";

export const AR_DIR = path.join(process.cwd(), "public", "ar");
export const AR_MODELS_DIR = path.join(AR_DIR, "models");

/** Nombres de archivo derivados del código de la tarjeta. */
export const nombrePatron = (code: string) => `marker_${code}.png`;
export const nombrePatt = (code: string) => `marker_${code}.patt`;
export const nombreLamina = (code: string) => `lamina_${code}.png`;

/**
 * Con una sola imagen deja lista la tarjeta entera:
 *
 *   · `marker_<code>.png`  el dibujo normalizado. Es lo que compila mind-ar en
 *     el navegador para el seguimiento, y lo que se ve como miniatura.
 *   · `marker_<code>.patt` el patrón de AR.js / ARToolKit, generado a partir de
 *     ese mismo dibujo. Si el profesor adjunta uno propio, se respeta el suyo.
 *   · `lamina_<code>.png`  la hoja para imprimir: marco negro y el dibujo en el
 *     centro. Es lo que la cámara tiene que ver para que el `.patt` encaje.
 *
 * Antes había que traer el `.patt` hecho desde la herramienta web de AR.js y
 * subirlo aparte; quien no lo hacía se quedaba con una tarjeta a medias.
 */
export async function saveUploadedMarker(imageBuffer: Buffer, pattBuffer: Buffer | null) {
  const code = `AR${Date.now()}`.slice(0, 20);
  await fs.mkdir(AR_DIR, { recursive: true });

  const patron = await sharp(imageBuffer)
    .resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .normalize()
    .sharpen({ sigma: 1.2, m1: 1, m2: 2 })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await fs.writeFile(path.join(AR_DIR, nombrePatron(code)), patron);

  // El `.patt` se genera del dibujo normalizado, que es el mismo que va al
  // centro de la lámina: así lo entrenado y lo impreso coinciden.
  const patt = pattBuffer ?? Buffer.from(await generarPatt(patron), "utf8");
  await fs.writeFile(path.join(AR_DIR, nombrePatt(code)), patt);

  await fs.writeFile(path.join(AR_DIR, nombreLamina(code)), await construirLamina(patron));

  return {
    code,
    markerFile: nombrePatt(code),
    previewFile: nombrePatron(code),
    laminaFile: nombreLamina(code),
    pattGenerado: pattBuffer === null,
  };
}

/**
 * Rehace el `.patt` y la lámina de una tarjeta que ya existe, a partir de su
 * dibujo. Sirve para las tarjetas creadas antes de que esto se generase solo.
 */
export async function regenerarMarcador(code: string, previewFile: string) {
  const origen = path.join(AR_DIR, previewFile);
  const patron = await fs.readFile(origen);
  await fs.writeFile(path.join(AR_DIR, nombrePatt(code)), Buffer.from(await generarPatt(patron), "utf8"));
  await fs.writeFile(path.join(AR_DIR, nombreLamina(code)), await construirLamina(patron));
  return { markerFile: nombrePatt(code), laminaFile: nombreLamina(code) };
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
