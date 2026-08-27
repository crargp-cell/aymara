import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Topbar } from "@/components/layout/Topbar";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ role?: string; curso?: string }> }) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "admin") redirect("/dashboard");

  const sp = await searchParams;
  const roleFilter = sp.role && ["maestro", "estudiante", "admin"].includes(sp.role) ? sp.role : undefined;
  const cursoFilter = sp.curso ? Number(sp.curso) : undefined;
  const where = {
    ...(roleFilter ? { role: roleFilter as any } : {}),
    ...(cursoFilter ? { curso: cursoFilter } : {}),
  };

  const [users, cursos] = await Promise.all([prisma.usuario.findMany({ where, orderBy: [{ role: "asc" }, { id: "asc" }], take: 100 }), prisma.curso.findMany({ orderBy: { id_cur: "asc" } })]);

  async function createUser(formData: FormData) {
    "use server";
    const username = String(formData.get("username") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim() || null;
    const password = String(formData.get("password") ?? "");
    const newRole = String(formData.get("role") ?? "estudiante") as "maestro" | "estudiante";
    const curso = Number(formData.get("curso"));
    if (!username || !password || !curso) return;
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.usuario.create({ data: { username, email, password: hash, role: newRole, curso, activo: true } });
    if (newRole === "maestro") {
      await prisma.curso.update({ where: { id_cur: curso }, data: { id_doc: user.id } });
    }
    revalidatePath("/admin/users");
  }

  async function toggleActivo(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    const u = await prisma.usuario.findUnique({ where: { id } });
    if (!u) return;
    await prisma.usuario.update({ where: { id }, data: { activo: !u.activo } });
    revalidatePath("/admin/users");
  }

  async function assignCurso(formData: FormData) {
    "use server";
    const id = Number(formData.get("id"));
    const curso = Number(formData.get("curso"));
    if (!id || !curso) return;
    const u = await prisma.usuario.update({ where: { id }, data: { curso } });
    if (u.role === "maestro") {
      await prisma.curso.update({ where: { id_cur: curso }, data: { id_doc: u.id } });
    }
    revalidatePath("/admin/users");
  }

  return (
    <div className="space-y-6">
      <Topbar title="Gestión de usuarios" subtitle={`${users.length} usuarios · solo administradores`} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Crear usuario</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createUser} className="grid md:grid-cols-2 gap-3">
            <Input name="username" placeholder="Usuario" required />
            <Input name="email" type="email" placeholder="Email (opcional)" />
            <Input name="password" type="password" placeholder="Contraseña" required />
            <select name="role" className="h-10 rounded-xl border border-input glass bg-transparent px-3 text-sm" defaultValue="estudiante">
              <option value="estudiante">estudiante</option>
              <option value="maestro">maestro</option>
            </select>
            <select name="curso" className="h-10 rounded-xl border border-input glass bg-transparent px-3 text-sm md:col-span-2" required defaultValue={cursos[0]?.id_cur ?? ""}>
              {cursos.map((c) => (
                <option key={c.id_cur} value={c.id_cur}>
                  Curso {c.nombre} (ID {c.id_cur})
                </option>
              ))}
            </select>
            <Button type="submit" variant="gradient" className="md:col-span-2">
              Crear usuario
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usuarios ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="glass rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-[180px]">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>{u.username}</span>
                  <Badge variant={u.role === "admin" ? "success" : u.role === "maestro" ? "secondary" : "outline"}>{u.role}</Badge>
                  <Badge variant={u.activo ? "success" : "destructive"}>{u.activo ? "activo" : "inactivo"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{u.email ?? "sin email"} · Curso {u.curso}</p>
              </div>
              <form action={assignCurso} className="flex items-center gap-2">
                <input type="hidden" name="id" value={u.id} />
                <select name="curso" defaultValue={u.curso} className="h-8 rounded-lg border border-input glass bg-transparent px-2 text-xs">
                  {cursos.map((c) => (
                    <option key={c.id_cur} value={c.id_cur}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="outline" type="submit">
                  Asignar
                </Button>
              </form>
              <form action={toggleActivo}>
                <input type="hidden" name="id" value={u.id} />
                <Button size="sm" variant="secondary" type="submit">
                  {u.activo ? "Desactivar" : "Activar"}
                </Button>
              </form>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
