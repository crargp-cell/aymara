import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/*
  El material de las tarjetas AR (dibujo, lámina, modelo .glb) vive en columnas
  binarias de `ar_cards`, porque en Railway el disco del contenedor se rehace en
  cada despliegue y lo que se sube desde el panel desaparecería.

  Guardarlo ahí tiene un coste: sin esto, cualquier consulta que liste tarjetas
  se traería los blobs enteros. Con un modelo de 15 MB, pintar una galería de
  cinco tarjetas movería 75 MB de la base al proceso sólo para mostrar cinco
  miniaturas.

  Por eso quedan fuera por defecto en todo el sistema. Quien de verdad los
  necesita —la ruta /api/ar/file, que los sirve— los pide de forma explícita con
  `select`, que tiene prioridad sobre esto.
*/
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    omit: {
      arCard: {
        image_data: true,
        lamina_data: true,
        model_data: true,
        patt_data: true,
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
