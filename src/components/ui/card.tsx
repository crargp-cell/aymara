import * as React from "react";
import { cn } from "@/lib/utils";

/** Tonos de acento para el filete superior de una tarjeta. */
export type AcentoTarjeta = "azul" | "oro" | "coral" | "verde" | "morado";

const TONO: Record<AcentoTarjeta, string> = {
  azul: "var(--color-andino-azul)",
  // La versión de tinta: el oro del fondo se pierde sobre una tarjeta clara.
  oro: "var(--color-andino-oro-tinta)",
  coral: "var(--color-andino-coral)",
  verde: "var(--color-andino-verde)",
  morado: "var(--color-andino-morado)",
};

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Pinta un filete superior; toma los colores del fondo andino para que
   *  interfaz y decorado hablen la misma lengua. */
  acento?: AcentoTarjeta;
  /** Marca la tarjeta como pulsable: se levanta al pasar por encima. */
  activa?: boolean;
};

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, acento, activa, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg panel", acento && "acento-superior", activa && "tarjeta-activa", className)}
      style={acento ? ({ ...style, "--tono-acento": TONO[acento] } as React.CSSProperties) : style}
      {...props}
    />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
