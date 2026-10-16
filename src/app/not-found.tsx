import Link from "next/link";
import { MallkuMensaje } from "@/components/mascota/MallkuMensaje";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <MallkuMensaje pose="buscar" titulo="No encuentro esa página" texto="Busqué por todas partes, pero no está. Quizás el enlace cambió o ya no existe.">
        <Link href="/dashboard" className="mt-1 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Volver al inicio
        </Link>
      </MallkuMensaje>
    </main>
  );
}
