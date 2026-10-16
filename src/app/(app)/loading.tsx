import { MallkuMensaje } from "@/components/mascota/MallkuMensaje";

/** Mientras carga una pantalla, Mallku espera con los alumnos. */
export default function Loading() {
  return <MallkuMensaje pose="estudiar" titulo="Cargando…" className="max-w-xs border-0 bg-transparent shadow-none" />;
}
