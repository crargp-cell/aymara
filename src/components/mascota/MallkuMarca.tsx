"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { ARCHIVO_POSE, poseDeRuta } from "@/lib/mascota/guion";
import { cn } from "@/lib/utils";

/**
 * Mallku en la cabecera de cada sección, con la pose que le toca a esa pantalla
 * (ver poseDeRuta): lee en los temas, busca en el diccionario, estudia en los
 * exámenes… Es una imagen, no un vídeo: no gasta nada y se ve igual en todos los
 * dispositivos. Las poses son ilustraciones con su propio fondo, así que se
 * presentan como una pequeña lámina enmarcada; al navegar cambia con una
 * sacudida corta.
 */
export function MallkuMarca({ size = 64, className }: { size?: number; className?: string }) {
  const pose = poseDeRuta(usePathname() ?? "/");
  return (
    <div
      key={pose}
      className={cn("relative shrink-0 overflow-hidden rounded-xl bg-card shadow-md ring-2 ring-white/80 motion-safe:animate-[mallkuMarca_0.4s_ease-out]", className)}
      style={{ width: size, height: size }}
    >
      <Image src={ARCHIVO_POSE[pose]} alt="" fill sizes={`${size}px`} className="object-cover" />
      <style>{`@keyframes mallkuMarca{0%{transform:scale(.8) rotate(-6deg);opacity:0}100%{transform:none;opacity:1}}`}</style>
    </div>
  );
}
