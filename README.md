# Aymara

Plataforma de aprendizaje del idioma aymara: lecciones, ejercicios (opción múltiple, emparejar, completar), exámenes cronometrados, mapa de progreso, diccionario, tarjetas de realidad aumentada (AR) y un asistente de chat. Recreación en Next.js 16 de un sistema PHP legacy — ver `PROGRESO.md` para el historial de desarrollo por fases.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- Prisma 7 + PostgreSQL (`@prisma/adapter-pg`)
- NextAuth v5 (Credentials, JWT)
- Tailwind CSS v4
- `ai` SDK + `@ai-sdk/xai` (chat con Grok, streaming)
- `mind-ar` + `aframe` + `three` (tarjetas AR con cámara)
- `sharp` (generación de marcadores AR), `pdf-lib` (reportes PDF), `papaparse` (export CSV)
- Vitest (tests unitarios)

## Requisitos

- Node.js 20+
- PostgreSQL corriendo localmente (o vía `docker-compose.yml`)

## Configuración

1. Copia `.env.local`/`.env` y define al menos:
   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aymara"
   AUTH_SECRET="..."
   NEXTAUTH_URL="http://localhost:3000"
   XAI_API_KEY=""   # opcional — sin ella el chat usa respuestas basadas en reglas
   ```
2. Instala dependencias:
   ```bash
   npm install
   ```
3. Aplica el esquema y genera el cliente Prisma:
   ```bash
   npx prisma generate
   npx prisma db push   # o migrate, según tu flujo
   ```
4. (Opcional) Siembra cuentas demo (`admin_demo` / `maestro_demo` / `estudiante_demo`, password `Demo1234!`):
   ```bash
   npm run db:seed
   ```

## Desarrollo

```bash
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run start    # servir el build
npm run lint     # eslint
npm test         # vitest
```

## Estructura

- `src/app/(auth)` — login/registro
- `src/app/(app)` — área autenticada (dashboard, mapa, lecciones, ejercicios, exámenes, diccionario, AR, admin)
- `src/app/api` — rutas API (auth, chat, diccionario, AR marker/model, reportes)
- `src/lib` — Prisma client, auth, validaciones, reportes (PDF/CSV/heurística de dificultad), AR (generación de marcadores)
- `prisma/schema.prisma` + `prisma/seed.ts`

## Notas

- El fallback de chat (sin `XAI_API_KEY`) responde con reglas simples sobre el diccionario/lecciones, igual "en streaming" para mantener la misma UI.
- El visor AR (`/ar-cards/[code]`) requiere cámara real del dispositivo (`getUserMedia`) — no es simulable en entornos sin cámara.
