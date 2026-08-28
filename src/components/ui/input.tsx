import * as React from "react";
import { cn } from "@/lib/utils";

/** Estilo compartido por inputs y `<select>`, para que los formularios sean homogéneos. */
export const controlClass =
  "flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground " +
  "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
  "focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 " +
  "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-primary";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input type={type} className={cn(controlClass, className)} ref={ref} {...props} />
  ),
);
Input.displayName = "Input";

export { Input };
