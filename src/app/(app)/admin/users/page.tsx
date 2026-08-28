import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { requireRole } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";
import type { UsuariosRoleEnum } from "@/generated/prisma/enums";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  await requireRole(["admin"]);
  const sp = await searchParams;
  const roleFilter = sp.role && ["maestro", "estudiante", "admin"].includes(sp.role) ? (sp.role as UsuariosRoleEnum) : undefined;

  const users = await prisma.usuario.findMany({
    where: roleFilter ? { role: roleFilter } : {},
    orderBy: [{ role: "asc" }, { id: "asc" }],
    take: 200,
    include: { _count: { select: { inscripciones: true, paralelos_dirige: true } } },
  });

  async function createUser(formData: FormData) {
    "use server";
    await requireRole(["admin"]);
    const username = String(formData.get("username") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    if (!username || password.length < 8) return;
    const email = String(formData.get("email") ?? "").trim() || null;
    const newRole = formData.get("role") === "maestro" ? "maestro" : "estudiante";
    const exists = await prisma.usuario.findFirst({ where: { OR: [{ username }, ...(email ? [{ email }] : [])] } });
    if (exists) return;
    await prisma.usuario.create({
      data: {
        username,
        email,
        password: await bcrypt.hash(password, 10),
        role: newRole,
        nombre: String(formData.get("nombre") ?? "") || null,
        apellido: String(formData.get("apellido") ?? "") || null,
        codigo_estudiante: newRole === "estudiante" ? String(formData.get("codigo") ?? "") || null : null,
        activo: true,
      },
    });
    revalidatePath("/admin/users");
  }

  async function toggleActivo(formData: FormData) {
    "use server";
    await requireRole(["admin"]);
    const id = Number(formData.get("id"));
    const u = await prisma.usuario.findUnique({ where: { id } });
    if (!u) return;
    await prisma.usuario.update({ where: { id }, data: { activo: !u.activo } });
    revalidatePath("/admin/users");
  }

  async function resetPassword(formData: FormData) {
    "use server";
    await requireRole(["admin"]);
    const id = Number(formData.get("id"));
    const pwd = String(formData.get("password") ?? "");
    if (pwd.length < 8) return;
    await prisma.usuario.update({ where: { id }, data: { password: await bcrypt.hash(pwd, 10) } });
    revalidatePath("/admin/users");
  }

  return (
    <div className="space-y-6">
      <Topbar title="Usuarios" subtitle={`${users.length} usuarios · sólo administradores`} />

      <Card>
        <CardHeader><CardTitle className="text-base">Crear usuario</CardTitle></CardHeader>
        <CardContent>
          <form action={createUser} className="grid md:grid-cols-2 gap-3">
            <Input name="nombre" placeholder="Nombre" />
            <Input name="apellido" placeholder="Apellido" />
            <Input name="username" placeholder="Usuario" required />
            <Input name="email" type="email" placeholder="Email (opcional)" />
            <Input name="password" type="password" placeholder="Contraseña (mín. 8)" required />
            <Input name="codigo" placeholder="Código estudiante (si aplica)" />
            <select name="role" className="h-10 rounded-md border border-input bg-card px-3 text-sm md:col-span-2" defaultValue="estudiante">
              <option value="estudiante">estudiante</option>
              <option value="maestro">maestro</option>
            </select>
            <Button type="submit" variant="gradient" className="md:col-span-2">Crear usuario</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Usuarios</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="panel rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>{[u.nombre, u.apellido].filter(Boolean).join(" ") || u.username}</span>
                  <Badge variant={u.role === "admin" ? "success" : u.role === "maestro" ? "secondary" : "outline"}>{u.role}</Badge>
                  <Badge variant={u.activo ? "success" : "destructive"}>{u.activo ? "activo" : "inactivo"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  @{u.username} · {u.email ?? "sin email"}
                  {u.role === "estudiante" ? ` · ${u._count.inscripciones} inscripción(es)` : u.role === "maestro" ? ` · ${u._count.paralelos_dirige} paralelo(s)` : ""}
                </p>
              </div>
              <form action={resetPassword} className="flex items-center gap-2">
                <input type="hidden" name="id" value={u.id} />
                <Input name="password" placeholder="Nueva contraseña" className="h-8 w-40 text-xs" />
                <Button size="sm" variant="outline" type="submit">Reset</Button>
              </form>
              <form action={toggleActivo}>
                <input type="hidden" name="id" value={u.id} />
                <Button size="sm" variant="secondary" type="submit">{u.activo ? "Desactivar" : "Activar"}</Button>
              </form>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
