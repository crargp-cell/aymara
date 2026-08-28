import { signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WiphalaCorner } from "@/components/brand/Chakana";

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
        <div
          className="relative p-8 flex flex-col justify-between overflow-hidden"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          <span className="absolute inset-0 textil opacity-[0.06]" aria-hidden="true" />
          <div className="relative">
            <h2 className="text-2xl font-bold">Aymara</h2>
            <p className="text-sm opacity-75 mt-2">Aprendé el idioma ancestral</p>
          </div>
          <div className="relative mt-8 flex flex-col items-center">
            <div className="relative w-40 h-40 animate-float">
              <Image src="/mascota/mascota_normal.png" alt="" fill sizes="160px" className="object-contain" />
            </div>
            <div className="mt-4 rounded-md px-4 py-3 relative bg-white/10">
              <p className="text-sm font-medium text-center">{phrase}</p>
            </div>
          </div>
          <div className="relative mt-8 flex items-center justify-between">
            <WiphalaCorner />
            <p className="text-xs opacity-60">© 2026 Aymara</p>
          </div>
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
