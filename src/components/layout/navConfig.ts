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
  History,
} from "lucide-react";

export type Role = "estudiante" | "maestro" | "admin";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

export type NavSection = {
  section: string;
  items: NavItem[];
};

/**
 * El menú se define por rol, no como una lista única filtrada: cada rol tiene un
 * trabajo distinto y merece su propio orden y agrupación.
 *
 * - El alumno consume contenido y ve su progreso.
 * - El maestro crea y administra el contenido de sus paralelos (Negocio.md §5).
 * - El administrador gestiona, supervisa y analiza, pero NO crea ni edita
 *   contenido pedagógico (Negocio.md §4, §29, §36.35) — por eso no tiene la
 *   sección de autoría: supervisa el contenido desde «Supervisión».
 *
 * Las rutas del alumno (mapa, logros, historial) dependen de una inscripción
 * activa, así que no aparecen para maestro ni admin: para ellos serían páginas
 * vacías.
 */
const NAV_BY_ROLE: Record<Role, NavSection[]> = {
  estudiante: [
    {
      section: "Aprender",
      items: [
        { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
        { href: "/map", label: "Mapa de niveles", icon: Map },
        { href: "/lessons", label: "Lecciones", icon: BookOpen },
        { href: "/topics", label: "Temas", icon: Layers },
      ],
    },
    {
      section: "Evaluación",
      items: [
        { href: "/exams", label: "Exámenes", icon: FileQuestion },
        { href: "/exams/history", label: "Mis resultados", icon: History },
      ],
    },
    {
      section: "Mi progreso",
      items: [
        { href: "/ar-cards", label: "Tarjetas AR", icon: Sparkles },
        { href: "/logros", label: "Logros", icon: Trophy },
      ],
    },
    {
      section: "Recursos",
      items: [{ href: "/dictionary", label: "Diccionario", icon: Search }],
    },
  ],

  maestro: [
    {
      section: "General",
      items: [
        { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
        { href: "/admin/paralelo", label: "Paralelo de trabajo", icon: Boxes },
      ],
    },
    {
      section: "Contenido del paralelo",
      items: [
        { href: "/admin/lessons", label: "Lecciones", icon: GraduationCap },
        { href: "/admin/topics", label: "Temas y PDF", icon: Layers },
        { href: "/admin/exercises", label: "Ejercicios", icon: Dumbbell },
        { href: "/admin/exams", label: "Exámenes", icon: FileQuestion },
        { href: "/admin/ar-cards", label: "Tarjetas AR", icon: Sparkles },
        { href: "/admin/map-order", label: "Orden del mapa", icon: ListOrdered },
      ],
    },
    {
      section: "Seguimiento",
      items: [
        { href: "/admin/students", label: "Mis alumnos", icon: Users },
        { href: "/admin/analitica", label: "Analítica", icon: BarChart3 },
      ],
    },
    {
      section: "Recursos",
      items: [{ href: "/dictionary", label: "Diccionario", icon: Search }],
    },
  ],

  admin: [
    {
      section: "General",
      items: [{ href: "/dashboard", label: "Inicio", icon: LayoutDashboard }],
    },
    {
      section: "Institución",
      items: [
        { href: "/admin/gestiones", label: "Gestiones", icon: CalendarRange },
        { href: "/admin/grados", label: "Grados", icon: School },
        { href: "/admin/paralelos", label: "Paralelos", icon: Layers },
      ],
    },
    {
      section: "Personas",
      items: [
        { href: "/admin/students", label: "Alumnos e inscripciones", icon: ClipboardList },
        { href: "/admin/users", label: "Usuarios", icon: UserCog },
      ],
    },
    {
      section: "Supervisar y analizar",
      items: [
        { href: "/admin/supervision", label: "Supervisión", icon: MessageSquareWarning },
        { href: "/admin/analitica", label: "Analítica", icon: BarChart3 },
        { href: "/admin/reports", label: "Reportes", icon: BarChart3 },
        { href: "/admin/access-logs", label: "Registro de accesos", icon: ScrollText },
      ],
    },
    {
      section: "Recursos",
      items: [{ href: "/dictionary", label: "Diccionario", icon: Search }],
    },
  ],
};

export const ROLE_LABEL: Record<Role, string> = {
  estudiante: "Alumno",
  maestro: "Profesor",
  admin: "Administración",
};

export function navForRole(role?: string): NavSection[] {
  return NAV_BY_ROLE[(role ?? "estudiante") as Role] ?? NAV_BY_ROLE.estudiante;
}
