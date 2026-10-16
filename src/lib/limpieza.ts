import { prisma } from "@/lib/prisma";

/*
  Datos que se acumulan solos y hay que barrer:

  · Imágenes de ejercicios (ExerciseMedia) que ya no usa ningún ejercicio ni
    tarjeta. Viven en la base, así que cada una que sobra engorda las copias.
  · Partidas del juego «adivina la imagen» (ExercisePlay) viejas.
*/

/** Margen: una imagen recién subida aún no está enlazada a un ejercicio guardado. */
const MARGEN_MS = 60 * 60_000;

/** Borra las imágenes de ejercicios sin ningún uso (de un paralelo, o de todos). */
export async function purgarImagenesEjercicio(paraleloId?: number): Promise<number> {
  const { count } = await prisma.exerciseMedia.deleteMany({
    where: {
      ...(paraleloId ? { paralelo_id: paraleloId } : {}),
      created_at: { lt: new Date(Date.now() - MARGEN_MS) },
      exercises: { none: {} },
      options: { none: {} },
    },
  });
  return count;
}

/** Partidas terminadas de hace más de 30 días y abandonadas de hace más de 3. */
export async function purgarPartidasViejas(): Promise<number> {
  const dia = 24 * 3600_000;
  const { count } = await prisma.exercisePlay.deleteMany({
    where: {
      OR: [
        { terminado: true, updated_at: { lt: new Date(Date.now() - 30 * dia) } },
        { terminado: false, updated_at: { lt: new Date(Date.now() - 3 * dia) } },
      ],
    },
  });
  return count;
}
