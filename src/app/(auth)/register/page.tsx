import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { registerSchema } from "@/lib/validations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  async function registerAction(formData: FormData) {
    "use server";
    const data = {
      username: String(formData.get("username") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      curso: Number(formData.get("curso") ?? 1),
    };
    const parsed = registerSchema.safeParse(data);
    if (!parsed.success) redirect("/register?error=validation");
    const { username, email, password, curso } = parsed.data;
    const exists = await prisma.usuario.findFirst({ where: { OR: [{ username }, { email: email || undefined }] } });
    if (exists) redirect("/register?error=exists");
    const hash = await bcrypt.hash(password, 10);
    await prisma.usuario.create({
      data: { username, email: email || null, password: hash, role: "estudiante", curso, activo: true },
    });
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Crear cuenta</CardTitle>
          <CardDescription>Únete como estudiante</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={registerAction} className="space-y-4">
            <Input name="username" placeholder="Usuario" required />
            <Input name="email" type="email" placeholder="Email (opcional)" />
            <Input name="password" type="password" placeholder="Contraseña" required />
            <Input name="curso" type="number" placeholder="Curso ID (1)" defaultValue={1} required />
            <Button type="submit" variant="gradient" className="w-full">
              Registrarse
            </Button>
          </form>
          <p className="text-sm text-center mt-4 text-muted-foreground">
            ¿Ya tienes cuenta? <a href="/login" className="text-primary hover:underline">Inicia sesión</a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
