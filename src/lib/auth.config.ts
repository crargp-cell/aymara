import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  providers: [],
  session: { strategy: "jwt", maxAge: 3600 },
  callbacks: {
    jwt({ token, user }: any) {
      if (user) {
        token.role = user.role;
        token.curso = user.curso;
        token.uid = user.id;
      }
      return token;
    },
    session({ session, token }: any) {
      if (token) {
        (session.user as any).role = token.role;
        (session.user as any).curso = token.curso;
        (session.user as any).id = token.uid;
      }
      return session;
    },
    authorized({ auth, request }: any) {
      const path = request.nextUrl.pathname;
      const isAuth = !!auth?.user;
      if (path.startsWith("/admin") || ["/dashboard", "/map", "/lessons", "/topics", "/play", "/dictionary", "/ar-cards", "/exams"].some((p) => path.startsWith(p))) {
        if (!isAuth) return false;
        if (path.startsWith("/admin") && !["maestro", "admin"].includes((auth?.user as any)?.role)) return Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      return true;
    },
  },
  pages: { signIn: "/login" },
} satisfies NextAuthConfig;
