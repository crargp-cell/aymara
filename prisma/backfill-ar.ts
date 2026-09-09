import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { generarPatt, construirLamina } from "../src/lib/ar/patt";

/*
  Mete en la base el material de las tarjetas AR que todavía lo tienen sólo en
  disco.

  Hace falta porque hasta ahora los marcadores, `.patt` y `.glb` se guardaban en
  `public/ar`, y en Railway el disco del contenedor se rehace en cada
  despliegue: lo subido desde el panel desaparecía. Ahora viven en columnas de
  `ar_cards`; esto rellena las tarjetas anteriores al cambio.

  Es idempotente: lo ya guardado no se toca, así que se puede repetir sin miedo.

  Se ejecuta con:  npx tsx prisma/backfill-ar.ts

  Aviso: lo que no esté ni en la base ni en disco no se puede inventar. El script
  lo dice al final, y esas tarjetas hay que volver a subirlas una vez — después
  ya quedan guardadas para siempre.
*/

const AR_DIR = path.join(process.cwd(), "public", "ar");
const AR_MODELS_DIR = path.join(AR_DIR, "models");

/*
  Las tarjetas del seed se crearon copiando marcadores de origen que sí están
  versionados (y por tanto sí llegan al contenedor). Si la copia con el nombre
  de la tarjeta ya no está, se recurre al original.
*/
const ORIGEN_SEED: Record<string, string> = {
  ARCHHAJNA: "AR00001765755122825",
  ARANU: "AR00001765755348141",
  ARANATA: "AR00001765855406691",
  ARPANDA: "AR1787823192378",
};

async function leer(...candidatos: string[]): Promise<Buffer | null> {
  for (const c of candidatos) {
    try {
      return await fs.readFile(c);
    } catch {
      /* siguiente */
    }
  }
  return null;
}

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

  const cards = await prisma.arCard.findMany({
    select: {
      id: true,
      card_code: true,
      image_file: true,
      image_data: true,
      patt_data: true,
      lamina_data: true,
      model_data: true,
    },
    orderBy: { id: "asc" },
  });

  console.log(`${cards.length} tarjeta(s) a revisar\n`);
  const sinRecuperar: string[] = [];
  let tocadas = 0;

  for (const c of cards) {
    const code = c.card_code;
    const origen = ORIGEN_SEED[code];
    const yaTiene = { imagen: !!c.image_data, patt: !!c.patt_data, lamina: !!c.lamina_data, modelo: !!c.model_data };

    if (yaTiene.imagen && yaTiene.patt && yaTiene.lamina) {
      console.log(`  ${code.padEnd(20)} ya estaba completa`);
      continue;
    }

    // El dibujo: de la base, del archivo con su nombre, o del marcador de origen.
    let patron: Buffer | null = c.image_data ? Buffer.from(c.image_data) : null;
    if (!patron) {
      patron = await leer(
        path.join(AR_DIR, c.image_file ?? `marker_${code}.png`),
        path.join(AR_DIR, `marker_${code}.png`),
        ...(origen ? [path.join(AR_DIR, `marker_${origen}.png`)] : []),
      );
    }

    if (!patron) {
      console.log(`  ${code.padEnd(20)} SIN DIBUJO — hay que volver a subirla`);
      sinRecuperar.push(code);
      continue;
    }

    // El .patt: el que hubiera en disco manda sobre uno regenerado, porque pudo
    // haberse entrenado a mano.
    const pattDisco = await leer(
      path.join(AR_DIR, `marker_${code}.patt`),
      ...(origen ? [path.join(AR_DIR, `marker_${origen}.patt`)] : []),
    );
    const patt = c.patt_data ?? (pattDisco ? pattDisco.toString("utf8") : await generarPatt(patron));

    const laminaDisco = await leer(path.join(AR_DIR, `lamina_${code}.png`));
    const lamina = c.lamina_data ? Buffer.from(c.lamina_data) : (laminaDisco ?? (await construirLamina(patron)));

    const modeloDisco = c.model_data
      ? null
      : await leer(
          path.join(AR_MODELS_DIR, `${code}.glb`),
          path.join(AR_DIR, `${code}.glb`),
          ...(origen ? [path.join(AR_DIR, `marker_${origen}.glb`), path.join(AR_MODELS_DIR, `${origen}.glb`)] : []),
        );

    await prisma.arCard.update({
      where: { id: c.id },
      data: {
        image_data: new Uint8Array(patron),
        patt_data: patt,
        lamina_data: new Uint8Array(lamina),
        ...(modeloDisco ? { model_data: new Uint8Array(modeloDisco), model_mime: "model/gltf-binary" } : {}),
      },
    });

    const piezas = [
      `dibujo ${Math.round(patron.length / 1024)}kB`,
      `patt ${Math.round(patt.length / 1024)}kB`,
      `lámina ${Math.round(lamina.length / 1024)}kB`,
      modeloDisco ? `modelo ${Math.round(modeloDisco.length / 1024)}kB` : c.model_data ? "modelo ya estaba" : "sin modelo",
    ];
    console.log(`  ${code.padEnd(20)} guardado: ${piezas.join(", ")}`);
    tocadas++;
  }

  console.log(`\n${tocadas} tarjeta(s) rellenadas.`);
  if (sinRecuperar.length) {
    console.log(
      `\n⚠ Sin recuperar (${sinRecuperar.length}): ${sinRecuperar.join(", ")}` +
        `\n  Su marcador no está ni en la base ni en disco. Hay que volver a subir la imagen` +
        `\n  desde /admin/ar-cards → Editar → Reemplazar marcador. Sólo una vez: a partir de` +
        `\n  ahí queda en la base y sobrevive a los despliegues.`,
    );
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Falló el relleno:", e);
  process.exit(1);
});
