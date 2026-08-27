import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "Demo1234!";

async function upsertDemoUser(username: string, email: string, role: "admin" | "maestro" | "estudiante", curso: number) {
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: { username, email, password, role, curso, activo: true },
  });
}

async function main() {
  const curso = await prisma.curso.upsert({
    where: { id_cur: 1 },
    update: {},
    create: { id_cur: 1, nombre: "1º sec", id_doc: 1 },
  });

  await upsertDemoUser("admin_demo", "admin_demo@aymara.local", "admin", curso.id_cur);
  const maestro = await prisma.usuario.upsert({
    where: { email: "maestro_demo@aymara.local" },
    update: {},
    create: { username: "maestro_demo", email: "maestro_demo@aymara.local", password: await bcrypt.hash(DEMO_PASSWORD, 10), role: "maestro", curso: curso.id_cur, activo: true },
  });
  await upsertDemoUser("estudiante_demo", "estudiante_demo@aymara.local", "estudiante", curso.id_cur);

  const lessonCount = await prisma.lesson.count();
  if (lessonCount === 0) {
    const lesson = await prisma.lesson.create({
      data: {
        title: "Introducción al Aymara",
        description: "Primeros pasos: saludos y vocabulario básico.",
        curso: curso.id_cur,
        orden: 1,
        maestro_id: maestro.id,
        activo: true,
      },
    });
    await prisma.exercise.create({
      data: {
        lesson_id: lesson.id,
        type: "text",
        question: "¿Cómo se dice 'hola' en aymara?",
        answer: "kamisaraki",
        dificultad: "facil",
        activo: true,
      },
    });
    console.log(`Seeded starter lesson #${lesson.id} with one exercise.`);
  }

  console.log("Seed completo. Usuarios demo (password 'Demo1234!'): admin_demo, maestro_demo, estudiante_demo");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
