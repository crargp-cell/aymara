/**
 * Limpia el diccionario de la base: unifica categorías, quita repetidas exactas y
 * oculta las entradas sin sentido (ver src/lib/diccionario-limpieza.ts).
 *
 *   npx tsx prisma/limpiar-diccionario.ts            # sólo muestra lo que haría
 *   npx tsx prisma/limpiar-diccionario.ts --aplicar  # lo hace
 *
 * Es idempotente. Las entradas sin sentido no se borran: pasan a estado «inactivo»
 * y se pueden reactivar desde la base.
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { planLimpieza } from "../src/lib/diccionario-limpieza";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const APLICAR = process.argv.includes("--aplicar");

async function main() {
  const filas = await prisma.diccionario.findMany({ where: { estado: "activo" }, select: { id: true, aymara: true, espanol: true, categoria: true } });
  const plan = planLimpieza(filas);
  const cambiarCategoria = filas.filter((f) => !plan.eliminar.has(f.id) && plan.categoria.get(f.id) !== f.categoria);

  console.log(`Entradas activas: ${filas.length}`);
  console.log(`· Repetidas a eliminar: ${plan.eliminar.size}`);
  console.log(`· Sin sentido a ocultar: ${plan.deshabilitar.size}`);
  console.log(`· Categorías a unificar: ${cambiarCategoria.length}`);
  if (!APLICAR) { console.log("\n(Simulación: usa --aplicar para ejecutarlo.)"); return; }

  await prisma.$transaction(async (tx) => {
    if (plan.eliminar.size) await tx.diccionario.deleteMany({ where: { id: { in: [...plan.eliminar] } } });
    if (plan.deshabilitar.size) await tx.diccionario.updateMany({ where: { id: { in: [...plan.deshabilitar] } }, data: { estado: "inactivo" } });
    for (const f of cambiarCategoria) await tx.diccionario.update({ where: { id: f.id }, data: { categoria: plan.categoria.get(f.id)! } });
  }, { timeout: 60_000 });
  console.log("Listo.");
}

main().finally(() => prisma.$disconnect());
