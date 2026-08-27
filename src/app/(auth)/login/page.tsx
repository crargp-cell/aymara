import { signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const phrases = [
  "Yatiña — Saber",
  "Munasiña — Amor",
  "Thakhi — Camino",
  "Pachamama — Madre tierra",
  "Jaqi — Gente",
];

export default function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  async function loginAction(formData: FormData) {
    "use server";
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");
    try {
      await signIn("credentials", { username, password, redirectTo: "/dashboard" });
    } catch (e: any) {
      if (e?.message?.includes("NEXT_REDIRECT")) throw e;
      redirect("/login?error=1");
    }
  }

  const phrase = phrases[Math.floor(Math.random() * phrases.length)];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl overflow-hidden p-0 grid md:grid-cols-2">
        <div className="p-8 flex flex-col justify-between bg-gradient-to-br from-blue-600/20 to-purple-600/20">
          <div>
            <h2 className="text-2xl font-bold text-gradient">Aymara</h2>
            <p className="text-sm text-muted-foreground mt-2">Aprende el idioma ancestrales</p>
          </div>
          <div className="mt-8 flex flex-col items-center">
            <div className="relative w-40 h-40 animate-float">
              <Image src="/mascota/mascota_normal.png" alt="Mascota" fill sizes="160px" className="object-contain" />
            </div>
            <div className="mt-4 glass rounded-2xl px-4 py-3 relative">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 glass rotate-45 border-b-0 border-r-0" />
              <p className="text-sm font-medium text-center">{phrase}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-8 text-center">© 2026 Aymara</p>
        </div>
        <div className="p-8 flex flex-col justify-center">
          <CardHeader className="p-0 mb-6">
            <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
            <CardDescription>Ingresa tus credenciales</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <form action={loginAction} className="space-y-4">
              <Input name="username" placeholder="Usuario" required autoComplete="username" />
              <Input name="password" type="password" placeholder="Contraseña" required autoComplete="current-password" />
              <Button type="submit" variant="gradient" className="w-full">
                Entrar
              </Button>
            </form>
            <p className="text-sm text-center mt-4 text-muted-foreground">
              ¿No tienes cuenta? <a href="/register" className="text-primary hover:underline">Regístrate</a>
            </p>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
