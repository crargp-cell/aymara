import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export type Role = "admin" | "maestro" | "estudiante";

export type SessionUser = {
  id: number;
  name: string;
  email: string | null;
  role: Role;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const u = session?.user as { id?: string; name?: string; email?: string | null; role?: Role } | undefined;
  if (!u?.id || !u.role) return null;
  return { id: Number(u.id), name: u.name ?? "Usuario", email: u.email ?? null, role: u.role };
}

/** Server-component / action guard: returns the user or redirects to /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Guard that also enforces a role allow-list, redirecting to /dashboard otherwise. */
export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}
