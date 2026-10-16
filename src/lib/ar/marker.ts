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
  await fs.mkdir(AR_DIR, { recursive: true }).catch(() => {});

  const patron = await sharp(imageBuffer)
    .resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .normalize()
    .sharpen({ sigma: 1.2, m1: 1, m2: 2 })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const lamina = await construirLamina(patron);
  try {
    await fs.writeFile(path.join(AR_DIR, nombrePatron(code)), patron);
  } catch {}
  const patt = pattBuffer ?? Buffer.from(await generarPatt(patron), "utf8");
  try {
    await fs.writeFile(path.join(AR_DIR, nombrePatt(code)), patt);
  } catch {}
  try {
    await fs.writeFile(path.join(AR_DIR, nombreLamina(code)), lamina);
  } catch {}

  return {
    code,
    markerFile: nombrePatt(code),
    previewFile: nombrePatron(code),
    laminaFile: nombreLamina(code),
    pattGenerado: pattBuffer === null,
    patronBuffer: patron,
    pattBuffer: patt,
    laminaBuffer: lamina,
  };
}

/**
 * Rehace el `.patt` y la lámina de una tarjeta que ya existe, a partir de su
 * dibujo. Sirve para las tarjetas creadas antes de que esto se generase solo.
 *
 * El dibujo se recibe ya cargado en lugar de leerlo del disco: en Railway el
 * sistema de archivos del contenedor se rehace en cada despliegue, así que un
 * marcador subido desde el panel ya no está en disco y la regeneración fallaba.
 * Quien llama lo saca de la base, que es donde de verdad vive.
 */
export async function regenerarMarcador(code: string, patron: Buffer) {
  const patt = Buffer.from(await generarPatt(patron), "utf8");
  const lamina = await construirLamina(patron);
  // A disco sólo por comodidad en desarrollo; si falla no importa.
  try {
    await fs.writeFile(path.join(AR_DIR, nombrePatt(code)), patt);
    await fs.writeFile(path.join(AR_DIR, nombreLamina(code)), lamina);
  } catch {
    /* sistema de archivos de sólo lectura o efímero: lo que cuenta va a la base */
  }
  return { markerFile: nombrePatt(code), laminaFile: nombreLamina(code), pattBuffer: patt, laminaBuffer: lamina };
}

export async function saveArModel(code: string, buffer: Buffer) {
  await fs.mkdir(AR_MODELS_DIR, { recursive: true }).catch(() => {});
  const filename = `${code}.glb`;
  try {
    await fs.writeFile(path.join(AR_MODELS_DIR, filename), buffer);
  } catch {
    /* igual que arriba: el modelo persistente es el de la columna model_data */
  }
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
