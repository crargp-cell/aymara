import {
  LayoutDashboard,
  Map,
  BookOpen,
  FileQuestion,
  Sparkles,
  Layers,
  BarChart3,
  Users,
  ScrollText,
  GraduationCap,
  Dumbbell,
  UserCog,
  ListOrdered,
  Trophy,
  Search,
  CalendarRange,
  School,
  ClipboardList,
  MessageSquareWarning,
  Boxes,
} from "lucide-react";

type Role = "estudiante" | "maestro" | "admin";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  section: string;
  roles?: Role[];
};

export const nav: NavItem[] = [
  // --- Aprender (todos) ---
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, section: "Aprender" },
  { href: "/map", label: "Mapa de niveles", icon: Map, section: "Aprender" },
  { href: "/lessons", label: "Lecciones", icon: BookOpen, section: "Aprender" },
  { href: "/topics", label: "Temas", icon: Layers, section: "Aprender" },
  { href: "/exams", label: "Exámenes", icon: FileQuestion, section: "Aprender" },
  { href: "/ar-cards", label: "Tarjetas AR", icon: Sparkles, section: "Aprender" },
  { href: "/logros", label: "Logros", icon: Trophy, section: "Aprender" },
  { href: "/dictionary", label: "Diccionario", icon: Search, section: "Aprender" },

  // --- Enseñar (maestro/admin) — contenido del paralelo ---
  { href: "/admin/paralelo", label: "Paralelo de trabajo", icon: Boxes, section: "Enseñar", roles: ["maestro", "admin"] },
  { href: "/admin/lessons", label: "Lecciones", icon: GraduationCap, section: "Enseñar", roles: ["maestro", "admin"] },
  { href: "/admin/topics", label: "Temas y PDF", icon: Layers, section: "Enseñar", roles: ["maestro", "admin"] },
  { href: "/admin/exercises", label: "Ejercicios", icon: Dumbbell, section: "Enseñar", roles: ["maestro", "admin"] },
  { href: "/admin/exams", label: "Exámenes", icon: FileQuestion, section: "Enseñar", roles: ["maestro", "admin"] },
  { href: "/admin/ar-cards", label: "Tarjetas AR", icon: Sparkles, section: "Enseñar", roles: ["maestro", "admin"] },
  { href: "/admin/map-order", label: "Orden del mapa", icon: ListOrdered, section: "Enseñar", roles: ["maestro", "admin"] },
  { href: "/admin/students", label: "Mis alumnos", icon: Users, section: "Enseñar", roles: ["maestro"] },
  { href: "/admin/analitica", label: "Analítica", icon: BarChart3, section: "Enseñar", roles: ["maestro", "admin"] },

  // --- Administración (admin) ---
  { href: "/admin/gestiones", label: "Gestiones", icon: CalendarRange, section: "Administración", roles: ["admin"] },
  { href: "/admin/grados", label: "Grados", icon: School, section: "Administración", roles: ["admin"] },
  { href: "/admin/paralelos", label: "Paralelos", icon: Layers, section: "Administración", roles: ["admin"] },
  { href: "/admin/students", label: "Alumnos e inscripciones", icon: ClipboardList, section: "Administración", roles: ["admin"] },
  { href: "/admin/users", label: "Usuarios", icon: UserCog, section: "Administración", roles: ["admin"] },
  { href: "/admin/supervision", label: "Supervisión", icon: MessageSquareWarning, section: "Administración", roles: ["admin"] },
  { href: "/admin/reports", label: "Reportes", icon: BarChart3, section: "Administración", roles: ["admin"] },
  { href: "/admin/access-logs", label: "Registro de accesos", icon: ScrollText, section: "Administración", roles: ["admin"] },
];

export function navForRole(role?: string) {
  return nav.filter((item) => !item.roles || item.roles.includes((role ?? "") as Role));
}
