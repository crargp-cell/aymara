import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { loginSchema } from "./validations";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { username, password } = parsed.data;
        const user = await prisma.usuario.findFirst({
          where: { username, activo: true },
        });
        if (!user) return null;
        let hash = user.password;
        if (hash.startsWith("$2y$")) hash = "$2b$" + hash.slice(4);
        const valid = await bcrypt.compare(password, hash);
        if (!valid) {
          if (user.password !== password) return null;
          // Legacy plaintext password matched: rehash to bcrypt immediately so this
          // account never authenticates via plaintext comparison again.
          const rehashed = await bcrypt.hash(password, 10);
          await prisma.usuario.update({ where: { id: user.id }, data: { password: rehashed } }).catch(() => {});
        }
        prisma.accessLog
          .create({
            data: {
              user_id: BigInt(user.id),
              email: user.email,
              username: user.username,
              action: "login_success",
              path: "/api/auth/callback/credentials",
              method: "POST",
              ip: "127.0.0.1",
              status: 200,
              message: "Inicio de sesión correcto",
            },
          })
          .catch(() => {});
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
