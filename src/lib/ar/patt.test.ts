import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { generarPatt, construirLamina, PATT_LADO } from "./patt";

/*
  El formato del `.patt` no está documentado formalmente y un fallo aquí no da
  error: simplemente el marcador deja de reconocerse con la cámara, que es algo
  que no se puede probar de forma automática. Estas comprobaciones fijan la
  estructura contra la que se portó `THREEx.ArPatternFile.encodeImage`.
*/

/** Cuadro de prueba con contenido asimétrico, para que los giros se distingan. */
async function imagenPrueba() {
  return sharp({ create: { width: 64, height: 64, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .composite([
      { input: { create: { width: 20, height: 10, channels: 3, background: { r: 200, g: 30, b: 40 } } }, left: 4, top: 4 },
      { input: { create: { width: 8, height: 30, channels: 3, background: { r: 10, g: 20, b: 220 } } }, left: 40, top: 20 },
    ])
    .png()
    .toBuffer();
}

describe("generarPatt", () => {
  it("emite 192 líneas de datos: 4 giros × 3 canales × 16 filas", async () => {
    const lineas = (await generarPatt(await imagenPrueba())).split("\n").filter((l) => l.trim() !== "");
    expect(lineas).toHaveLength(4 * 3 * PATT_LADO);
  });

  it("separa los cuatro giros con una línea en blanco", async () => {
    const giros = (await generarPatt(await imagenPrueba())).split("\n\n");
    expect(giros).toHaveLength(4);
    // Con una imagen asimétrica cada giro tiene que salir distinto; si dos
    // coinciden es que la rotación no se está aplicando.
    expect(new Set(giros).size).toBe(4);
  });

  it("pone 16 valores 0-255 por línea, alineados a 3 caracteres", async () => {
    const lineas = (await generarPatt(await imagenPrueba())).split("\n").filter((l) => l.trim() !== "");
    for (const linea of lineas) {
      expect(linea).toHaveLength(PATT_LADO * 4 - 1); // 16 celdas de 3 + 15 espacios
      const valores = linea.trim().split(/\s+/).map(Number);
      expect(valores).toHaveLength(PATT_LADO);
      expect(valores.every((v) => Number.isInteger(v) && v >= 0 && v <= 255)).toBe(true);
    }
  });

  it("escribe los canales en orden BGR, no RGB", async () => {
    // Imagen roja plana: en BGR el primer bloque es el azul (0) y el tercero
    // el rojo (200). Si saliera al revés, el marcador no encajaría.
    const roja = await sharp({ create: { width: 32, height: 32, channels: 3, background: { r: 200, g: 30, b: 40 } } }).png().toBuffer();
    const lineas = (await generarPatt(roja)).split("\n").filter((l) => l.trim() !== "");
    const valor = (i: number) => Number(lineas[i].trim().split(/\s+/)[0]);
    expect(valor(0)).toBe(40); // bloque 1 → azul
    expect(valor(PATT_LADO)).toBe(30); // bloque 2 → verde
    expect(valor(PATT_LADO * 2)).toBe(200); // bloque 3 → rojo
  });
});

describe("construirLamina", () => {
  it("deja papel blanco fuera, marco negro y el dibujo en el centro", async () => {
    const lamina = await construirLamina(await imagenPrueba(), 512);
    const { data, info } = await sharp(lamina).raw().toBuffer({ resolveWithObject: true });
    const px = (x: number, y: number) => data[(y * info.width + x) * info.channels];
    expect(info.width).toBe(512);
    expect(info.channels).toBe(3); // sin canal alfa: es una hoja para imprimir
    expect(px(5, 5)).toBe(255); // margen de papel
    expect(px(60, 256)).toBe(0); // marco negro
    expect(px(256, 256)).not.toBe(0); // zona del dibujo, sobre blanco
  });
});
