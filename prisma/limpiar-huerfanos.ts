/**
 * Barre lo que se acumula solo: imágenes de ejercicios sin uso y partidas viejas.
 *
 *   npx tsx prisma/limpiar-huerfanos.ts
 *
 * Se puede programar (p. ej. una vez al día). Es idempotente.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const hace1h = new Date(Date.now() - 3600_000);
  const dia = 24 * 3600_000;
  const imagenes = await prisma.exerciseMedia.deleteMany({ where: { created_at: { lt: hace1h }, exercises: { none: {} }, options: { none: {} } } });
  const partidas = await prisma.exercisePlay.deleteMany({
    where: { OR: [{ terminado: true, updated_at: { lt: new Date(Date.now() - 30 * dia) } }, { terminado: false, updated_at: { lt: new Date(Date.now() - 3 * dia) } }] },
  });
  console.log(`Imágenes de ejercicios sin uso eliminadas: ${imagenes.count}`);
  console.log(`Partidas viejas eliminadas: ${partidas.count}`);
}

main().finally(() => prisma.$disconnect());
