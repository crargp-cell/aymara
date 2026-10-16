import sharp from "sharp";

/*
  Generación del archivo `.patt` que consume AR.js / ARToolKit, y de la lámina
  imprimible del marcador.

  No existe paquete de npm que haga esto en el servidor: el generador oficial de
  AR.js es una página del navegador (depende de `canvas` e `Image`) y
  `@ar-js-org/artoolkit5-js` sólo trae el detector. Así que esto es un port
  directo de `THREEx.ArPatternFile` — `encodeImage` y `buildFullMarker` — de
  three.js/examples/marker-training/threex-arpatternfile.js, hecho con sharp,
  que ya era dependencia.

  Formato del `.patt`, que no está documentado en ningún sitio formal:

    · La imagen se reduce a 16×16 y se emite cuatro veces, una por cada giro de
      90°, para que el marcador valga en cualquier orientación.
    · Dentro de cada giro van tres bloques de 16 líneas, un canal por bloque, y
      —esto es lo fácil de equivocar— en orden **BGR**, no RGB.
    · Cada línea son 16 valores 0-255 alineados a la derecha en 3 caracteres y
      separados por un espacio.
    · Entre giros va una línea en blanco.

  Total: 4 × 3 × 16 = 192 líneas de datos + 3 en blanco = 195.
*/

export const PATT_LADO = 16;

const BLANCO = { r: 255, g: 255, b: 255, alpha: 1 };

/*
  AR.js gira el lienzo en sentido antihorario (`orientation -= Math.PI/2`),
  mientras que `sharp.rotate` gira en horario. Estos son los ángulos horarios
  equivalentes, en el mismo orden. El orden importa: ARToolKit devuelve *qué*
  orientación encajó, y de ahí sale el giro con que se coloca el modelo 3D; si
  se invierte, el modelo aparece girado.
*/
const GIROS = [0, 270, 180, 90];

/**
 * Construye el `.patt` a partir de la imagen interior del marcador (el dibujo
 * del centro, no la lámina completa con el marco negro).
 */
export async function generarPatt(imagen: Buffer): Promise<string> {
  const bloques: string[] = [];

  for (const giro of GIROS) {
    // Se gira antes de reducir: rotar una imagen de 16×16 perdería detalle.
    const { data } = await sharp(imagen)
      .rotate(giro, { background: BLANCO })
      .flatten({ background: BLANCO })
      .resize(PATT_LADO, PATT_LADO, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const lineas: string[] = [];
    // canal 2 = azul, 1 = verde, 0 = rojo: el orden BGR que espera ARToolKit.
    for (let canal = 2; canal >= 0; canal--) {
      for (let y = 0; y < PATT_LADO; y++) {
        const fila: string[] = [];
        for (let x = 0; x < PATT_LADO; x++) {
          fila.push(String(data[(y * PATT_LADO + x) * 3 + canal]).padStart(3));
        }
        lineas.push(fila.join(" "));
      }
    }
    bloques.push(lineas.join("\n") + "\n");
  }

  return bloques.join("\n");
}

/**
 * Lámina imprimible: fondo blanco, marco negro y el dibujo en el centro, con
 * las mismas proporciones que `buildFullMarker` de AR.js. Es lo que el profesor
 * imprime y lo que la cámara tiene que ver para que el `.patt` encaje.
 */
export async function construirLamina(imagen: Buffer, lado = 512): Promise<Buffer> {
  // Proporciones de AR.js con pattRatio 0.5: 10% de papel blanco alrededor,
  // marco negro hasta el 30%, y el dibujo ocupando el 40% central.
  const margenBlanco = 0.1;
  const razonPatron = 0.5;
  const margenNegro = (1 - 2 * margenBlanco) * ((1 - razonPatron) / 2);
  const margenInterior = margenBlanco + margenNegro;

  const ladoNegro = Math.round(lado * (1 - 2 * margenBlanco));
  const ladoInterior = Math.round(lado * (1 - 2 * margenInterior));
  const posNegro = Math.round(lado * margenBlanco);
  const posInterior = Math.round(lado * margenInterior);

  const negro = await sharp({
    create: { width: ladoNegro, height: ladoNegro, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .png()
    .toBuffer();

  // El dibujo va sobre blanco: si llega con transparencia, el marco no debe
  // verse a través de él.
  const interior = await sharp(imagen)
    .flatten({ background: BLANCO })
    .resize(ladoInterior, ladoInterior, { fit: "contain", background: BLANCO })
    .png()
    .toBuffer();

  return sharp({
    create: { width: lado, height: lado, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .composite([
      { input: negro, left: posNegro, top: posNegro },
      { input: interior, left: posInterior, top: posInterior },
    ])
    // Sin canal alfa: es una hoja para imprimir, no una superposición.
    .flatten({ background: BLANCO })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer();
}
