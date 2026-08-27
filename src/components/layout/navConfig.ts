import { LayoutDashboard, Map, BookOpen, FileQuestion, Sparkles, Layers, BarChart3, Users, ScrollText, GraduationCap, Dumbbell, UserCog, ListOrdered } from "lucide-react";

export const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "Gestión" },
  { href: "/map", label: "Mapa de Juego", icon: Map, section: "Actividades" },
  { href: "/lessons", label: "Lecciones", icon: BookOpen, section: "Actividades" },
  { href: "/exams", label: "Exámenes", icon: FileQuestion, section: "Actividades" },
  { href: "/ar-cards", label: "Tarjetas AR", icon: Sparkles, section: "Actividades" },
  { href: "/topics", label: "Temas", icon: Layers, section: "Gestión" },
  { href: "/admin/lessons", label: "Mis lecciones", icon: GraduationCap, section: "Contenido", roles: ["maestro", "admin"] },
  { href: "/admin/topics", label: "Mis temas", icon: Layers, section: "Contenido", roles: ["maestro", "admin"] },
  { href: "/admin/exercises", label: "Mis ejercicios", icon: Dumbbell, section: "Contenido", roles: ["maestro", "admin"] },
  { href: "/admin/exams", label: "Mis exámenes", icon: FileQuestion, section: "Contenido", roles: ["maestro", "admin"] },
  { href: "/admin/ar-cards", label: "Tarjetas AR (crear)", icon: Sparkles, section: "Contenido", roles: ["maestro", "admin"] },
  { href: "/admin/map-order", label: "Orden del mapa", icon: ListOrdered, section: "Contenido", roles: ["maestro", "admin"] },
  { href: "/admin/students", label: "Panel alumnos", icon: Users, section: "Sistema", roles: ["maestro", "admin"] },
  { href: "/admin/users", label: "Usuarios", icon: UserCog, section: "Sistema", roles: ["admin"] },
  { href: "/admin/reports", label: "Reportes", icon: BarChart3, section: "Sistema", roles: ["admin"] },
  { href: "/admin/access-logs", label: "Registro de accesos", icon: ScrollText, section: "Sistema", roles: ["admin"] },
] as const;

export function navForRole(role?: string) {
  return nav.filter((item) => !("roles" in item) || (item.roles as readonly string[]).includes(role ?? ""));
}
