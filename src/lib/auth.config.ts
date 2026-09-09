import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [],
  session: { strategy: "jwt", maxAge: 3600 },
  callbacks: {
    jwt({ token, user }: any) {
      if (user) {
        token.role = user.role;
        token.uid = user.id;
      }
      return token;
    },
    session({ session, token }: any) {
      if (token) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.uid;
      }
      return session;
    },
    authorized({ auth, request }: any) {
      const path = request.nextUrl.pathname;
      const isAuth = !!auth?.user;
      const role = (auth?.user as any)?.role;
      const guarded =
        path.startsWith("/admin") ||
        path.startsWith("/maestro") ||
        ["/dashboard", "/map", "/lessons", "/topics", "/play", "/dictionary", "/ar-cards", "/exams", "/logros"].some((p) => path.startsWith(p));
      if (guarded) {
        if (!isAuth) return false;
        if ((path.startsWith("/admin") || path.startsWith("/maestro")) && !["maestro", "admin"].includes(role)) {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
      }
      return true;
    },
  },
  pages: { signIn: "/login" },
} satisfies NextAuthConfig;
