import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { loginSchema } from "./validations";
import { authConfig } from "./auth.config";

/** Datos de la petición útiles para la bitácora; nunca deben tumbar el login. */
function datosPeticion(request: unknown) {
  const req = request as { headers?: Headers } | undefined;
  const h = req?.headers;
  const ip =
    h?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h?.get("cf-connecting-ip") ||
    h?.get("x-real-ip") ||
    "desconocida";
  return { ip: ip.slice(0, 45), userAgent: h?.get("user-agent")?.slice(0, 500) ?? null };
}

/*
  Deja constancia del intento. Los fallos importan tanto como los aciertos:
  con el sistema expuesto por un túnel, `access_logs` es lo único que dice qué
  usuario se intentó y desde dónde. Se hace en segundo plano y con catch: que la
  bitácora falle no puede impedir entrar.
*/
function registrarIntento(datos: {
  userId?: number;
  email?: string | null;
  username: string;
  ok: boolean;
  ip: string;
  userAgent: string | null;
  motivo: string;
}) {
  prisma.accessLog
    .create({
      data: {
        user_id: datos.userId === undefined ? null : BigInt(datos.userId),
        email: datos.email ?? null,
        username: datos.username.slice(0, 190),
        action: datos.ok ? "login_success" : "login_failed",
        path: "/api/auth/callback/credentials",
        method: "POST",
        ip: datos.ip,
        user_agent: datos.userAgent,
        status: datos.ok ? 200 : 401,
        message: datos.motivo.slice(0, 255),
      },
    })
    .catch(() => {});
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  /*
    Por defecto Auth.js escupe una traza completa por cada contraseña
    equivocada, y `CredentialsSignin` acaba pareciendo una avería del sistema
    cuando es el camino normal de un login fallido. Se resume en una línea; el
    resto de errores conservan la traza entera para que sí se distingan.
  */
  logger: {
    error(error: Error) {
      // En el build de producción las clases van minificadas y `name` acaba
      // siendo algo como "w"; Auth.js sí conserva `type` en el propio objeto.
      const tipo = (error as { type?: string })?.type ?? error?.name;
      if (tipo === "CredentialsSignin") {
        console.warn("[auth] intento de inicio de sesión rechazado (credenciales incorrectas)");
        return;
      }
      console.error(error);
    },
  },
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      authorize: async (credentials, request) => {
        const { ip, userAgent } = datosPeticion(request);
        const usernameCrudo = typeof credentials?.username === "string" ? credentials.username : "";

        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          registrarIntento({ username: usernameCrudo, ok: false, ip, userAgent, motivo: "Datos de acceso mal formados" });
          return null;
        }
        const { username, password } = parsed.data;
        const user = await prisma.usuario.findFirst({
          where: { username, activo: true },
        });
        if (!user) {
          registrarIntento({ username, ok: false, ip, userAgent, motivo: "Usuario inexistente o dado de baja" });
          return null;
        }
        let hash = user.password;
        if (hash.startsWith("$2y$")) hash = "$2b$" + hash.slice(4);
        const valid = await bcrypt.compare(password, hash);
        if (!valid) {
          if (user.password !== password) {
            registrarIntento({
              userId: user.id,
              email: user.email,
              username,
              ok: false,
              ip,
              userAgent,
              motivo: "Contraseña incorrecta",
            });
            return null;
          }
          // Legacy plaintext password matched: rehash to bcrypt immediately so this
          // account never authenticates via plaintext comparison again.
          const rehashed = await bcrypt.hash(password, 10);
          await prisma.usuario.update({ where: { id: user.id }, data: { password: rehashed } }).catch(() => {});
        }
        registrarIntento({
          userId: user.id,
          email: user.email,
          username,
          ok: true,
          ip,
          userAgent,
          motivo: "Inicio de sesión correcto",
        });
        return {
          id: String(user.id),
          name: user.username,
          email: user.email ?? undefined,
          role: user.role,
        } as any;
      },
    }),
  ],
});
