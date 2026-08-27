import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FlipCard } from "@/components/landing/FlipCard";

const FEATURES = [
  { image: "/mascota/Aprender.png", title: "Lecciones", description: "Aprende aymara paso a paso con lecciones organizadas por curso." },
  { image: "/mascota/Jugar.png", title: "Ejercicios", description: "Practica con ejercicios de opción múltiple, emparejar y completar." },
  { image: "/mascota/Escucha.png", title: "Diccionario", description: "Busca palabras en aymara y español con pronunciación por categoría." },
  { image: "/mascota/Leer.png", title: "Temas", description: "Lee contenido explicativo de cada lección a tu propio ritmo." },
  { image: "/mascota/Estudiar.png", title: "Exámenes", description: "Pon a prueba lo aprendido con exámenes cronometrados." },
  { image: "/mascota/Naturaleza.png", title: "Tarjetas AR", description: "Desbloquea tarjetas de realidad aumentada al completar lecciones." },
];

export default function Home() {
  return (
    <div className="flex-1 flex flex-col">
      <section className="max-w-5xl mx-auto w-full px-6 pt-20 pb-16 flex flex-col md:flex-row items-center gap-10">
        <div className="flex-1 space-y-6 text-center md:text-left">
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
            Aprende <span className="text-gradient">aymara</span> jugando
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto md:mx-0">
            Lecciones, ejercicios, exámenes y realidad aumentada para aprender el idioma aymara de forma interactiva.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <Link href="/register">
              <Button variant="gradient" size="lg" className="w-full sm:w-auto">
                Comenzar gratis
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Ya tengo cuenta
              </Button>
            </Link>
          </div>
        </div>
        <div className="flex-shrink-0 animate-float">
          <Image src="/mascota/mascota.png" alt="Mascota Aymara" width={260} height={260} priority className="drop-shadow-2xl" />
        </div>
      </section>

      <section className="max-w-5xl mx-auto w-full px-6 pb-20 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Todo lo que necesitas para aprender</h2>
          <p className="text-sm text-muted-foreground">Toca una tarjeta para ver más</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <FlipCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto w-full px-6 pb-24 text-center space-y-4">
        <div className="glass-strong rounded-2xl p-8 space-y-4">
          <h2 className="text-2xl font-bold">¿Listo para empezar?</h2>
          <p className="text-muted-foreground">Únete y desbloquea tu primera tarjeta de realidad aumentada.</p>
          <Link href="/register">
            <Button variant="gradient" size="lg">
              Crear cuenta
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
