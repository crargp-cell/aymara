import { prisma } from "@/lib/prisma";

/*
  Qué material tiene guardado cada tarjeta AR, sin traerse el material.

  Los blobs (dibujo, lámina, modelo .glb) están excluidos por defecto de todas
  las consultas — ver el `omit` de src/lib/prisma.ts —, así que preguntar
  `card.image_data ? ...` para saber si existe daría siempre que no. Y quitarles
  la exclusión para una simple comprobación movería megas desde la base sólo
  para pintar un enlace.

  Esto lo resuelve preguntando por la existencia, que es lo que de verdad se
  quiere saber: Postgres devuelve cuatro booleanos por fila y no lee el
  contenido.
*/

export type MaterialTarjeta = {
  imagen: boolean;
  patt: boolean;
  lamina: boolean;
  modelo: boolean;
};

const VACIO: MaterialTarjeta = { imagen: false, patt: false, lamina: false, modelo: false };

/** Devuelve, por código de tarjeta, qué piezas están guardadas en la base. */
export async function materialDeTarjetas(codes: string[]): Promise<Map<string, MaterialTarjeta>> {
  const mapa = new Map<string, MaterialTarjeta>();
  if (codes.length === 0) return mapa;

  const filas = await prisma.$queryRaw<
    { card_code: string; imagen: boolean; patt: boolean; lamina: boolean; modelo: boolean }[]
  >`
    SELECT card_code,
           image_data  IS NOT NULL AS imagen,
           patt_data   IS NOT NULL AS patt,
           lamina_data IS NOT NULL AS lamina,
           model_data  IS NOT NULL AS modelo
      FROM ar_cards
     WHERE card_code = ANY(${codes})
  `;

  for (const f of filas) {
    mapa.set(f.card_code, { imagen: f.imagen, patt: f.patt, lamina: f.lamina, modelo: f.modelo });
  }
  // Una tarjeta sin fila devuelta simplemente no tiene nada guardado.
  for (const c of codes) if (!mapa.has(c)) mapa.set(c, VACIO);
  return mapa;
}

/** Igual, para una sola tarjeta. */
export async function materialDeTarjeta(code: string): Promise<MaterialTarjeta> {
  return (await materialDeTarjetas([code])).get(code) ?? VACIO;
}
