import Image from "next/image";
import { ARCHIVO_POSE, type Pose } from "@/lib/mascota/guion";
import { cn } from "@/lib/utils";

/**
 * Pantalla de mensaje con Mallku: 404, errores, cargas y estados vacíos grandes.
 * Sin estado ni hooks, así sirve igual en componentes de servidor y de cliente.
 */
export function MallkuMensaje({
  pose,
  titulo,
  texto,
  children,
  className,
}: {
  pose: Pose;
  titulo: string;
  texto?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("panel mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl p-8 text-center", className)}>
      <Image src={ARCHIVO_POSE[pose]} alt="" width={140} height={140} className="rounded-2xl object-contain drop-shadow-md animate-float" priority style={{ width: 140, height: 140 }} />
      <h2 className="text-lg font-semibold">{titulo}</h2>
      {texto && <p className="text-sm text-muted-foreground">{texto}</p>}
      {children}
    </div>
  );
}
