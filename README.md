# Aymara

Plataforma educativa para la enseñanza del aymara en **un único colegio**: estructura académica por gestión/grado/paralelo, lecciones como niveles de progresión, ejercicios reutilizables (opción múltiple, emparejar, completar, respuesta), exámenes con nota académica (clasificar palabras y realidad aumentada), tarjetas AR como recompensa, logros automáticos, y analítica descriptiva + predictiva.

La lógica de negocio de referencia está en `Negocio.md`; el historial de desarrollo por fases, en `PROGRESO.md`.

### Reglas que gobiernan el sistema

- El **contenido pertenece al paralelo**, no al profesor: cambiar de docente no borra nada.
- **Nada académico se elimina físicamente** — se usan estados (`activo`, `inactivo`, `retirado`, `archivado`, `deshabilitado`).
- El **historial del alumno sobrevive** a cualquier cambio de profesor, paralelo o gestión.
- Un error **no revela la respuesta correcta**, y se puede reintentar sin penalización.
- **Todos los intentos se conservan** — son la base de la analítica y del modelo predictivo.

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
4. Carga el escenario de prueba completo:
   ```bash
   npm run db:seed
   ```

> ⚠️ El seed **borra todos los datos** y recrea el escenario desde cero. Es una herramienta de desarrollo.

## Escenario de prueba (`npm run db:seed`)

Genera un colegio completo listo para probar cada función del sistema. Todas las cuentas usan la contraseña **`Demo1234!`**.

| Cuenta | Rol | Qué permite probar |
|---|---|---|
| `admin_demo` | admin | Gestiones, grados, paralelos, inscripciones, promoción por lote, supervisión, analítica institucional, usuarios, reportes |
| `maestro_demo` | maestro | Autoría en 1ºA, 1ºB y 2ºA (2026) + 2ºA (2027). Al entrar debe **elegir primero el paralelo**; recién entonces cargan lecciones, temas/PDF, ejercicios, exámenes, tarjetas y orden del mapa |
| `maestro2_demo` | maestro | 2ºB y 3ºA. Enseñó 1ºA hasta abril — su asignación histórica sigue registrada y **el contenido quedó en el paralelo** |
| `maestro3_demo` | maestro | Paralelos de la gestión 2025 (cerrada) |
| `estudiante_demo` | alumno | Carlos Choque, 1ºA: 3 lecciones completadas, 2 tarjetas, 7 logros, examen aprobado al 2.º intento, examen AR rendido |
| `est02` | alumno | Ana Mamani — **en riesgo**: 3 intentos fallidos de la misma lección, tendencia negativa |
| `est05` | alumno | Elena Condori — su progreso de la L2 **caducó** por un cambio mayor del profesor |
| `est06` | alumno | Franco Ticona — tiene una tarjeta **revocada** y conserva otra que fue **retirada** del catálogo |
| `est07` | alumno | Gabriela Huanca — sin actividad: aparece como «sin datos», no como riesgo |
| `est08` | alumno | Hugo Laura — **retirado** a mitad de gestión, conserva todo su historial |
| `est09`–`est11` | alumnos | **Promovidos** de 1ºA-2025 a 2ºA-2026, con historial de ambas gestiones |
| `est12` | alumno | Luis Callisaya — se retiró en 2025 y se **reincorporó** en 1ºB |
| `est15` | alumna | Olga Vargas — **trasladada** de 1ºA a 1ºB |

Además crea:

- **3 gestiones**: 2025 (cerrada), 2026 (**actual**), 2027 (planificada, destino para probar la promoción por lote).
- **4 lecciones** en 1ºA: la L1 con banco de 12 ejercicios que **presenta 10 al azar** y exige 8 correctos; la L2 con un **cambio mayor** (v2) que invalidó completados previos.
- Un **ejercicio reutilizado** en dos lecciones distintas.
- Un **tema con PDF real** (generado con `pdf-lib`) visible en el visor embebido.
- **5 tarjetas AR** que reutilizan los marcadores reales de `public/ar`: las 3 del examen AR (`ARCHHAJNA` abeja/miel, `ARANU` perro, `ARANATA` dado) traen imagen de referencia + `.patt` de AR.js + modelo `.glb`.
- **4 exámenes**: ventana abierta (palabras y AR), ventana **futura** y ventana **cerrada** — para probar el bloqueo por plazo.
- **142 intentos de ejercicio** y **7 de examen** con detalle por ítem para la pantalla de revisión.
- Logros, estadísticas agregadas y un **modelo ML entrenado** con la lógica real de la app.

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
- `src/app/(app)` — área autenticada: aprendizaje (dashboard, mapa, lecciones, temas, ejercicios, exámenes, tarjetas, logros, diccionario), autoría del profesor y administración
- `src/app/api` — rutas API (auth, chat, diccionario, AR marker/model, reportes, reentrenamiento ML)
- `src/lib` — sesión y RBAC (`session`, `rbac`, `paralelo`), flujo de aprendizaje (`lesson-flow`, `student-board`, `rewards`, `logros/`), exámenes (`exams/engine`), analítica (`analytics/aggregate`), ML (`ml/features`, `ml/model`), reportes y AR
- `prisma/schema.prisma`, `prisma/seed.ts`, `prisma/seed-assets.ts`

## Notas

- Tras cambiar el esquema: `npx prisma db push && npx prisma generate` y **reiniciar `next dev`** (el proceso cachea el cliente Prisma generado en `src/generated/`).
- El fallback de chat (sin `XAI_API_KEY`) responde con reglas simples sobre el diccionario/lecciones, igual "en streaming" para mantener la misma UI.
- El visor y el examen AR requieren cámara real del dispositivo (`getUserMedia`) — no simulables en entornos sin cámara. El examen AR incluye un modo manual de respaldo para poder recorrer el flujo igualmente.
- El modelo predictivo excluye del entrenamiento a los alumnos con menos de 5 respuestas registradas y los marca como «sin datos»: sin actividad no hay evidencia de riesgo.
