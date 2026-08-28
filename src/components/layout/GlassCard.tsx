import { cn } from "@/lib/utils";

export function GlassCard({ className, children, hover = true, ...props }: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div className={cn("rounded-2xl panel", hover && "transition-all hover:-translate-y-1 hover:shadow-glow", className)} {...props}>
      {children}
    </div>
  );
}
