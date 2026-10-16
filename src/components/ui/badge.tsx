import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-border bg-muted text-secondary-foreground",
        outline: "border-border bg-transparent text-muted-foreground",
        // Los tres acentos de la ruta también sirven como semáforo de estado.
        success: "border-transparent bg-[var(--ruta-completado)] text-white",
        warning: "border-transparent bg-[var(--ruta-activo)] text-[#4a3a0c]",
        destructive: "border-transparent bg-[var(--ruta-futuro)] text-white",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
