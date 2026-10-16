export { auth as middleware } from "@/lib/auth.edge";

/*
  `ar` y `uploads` quedan fuera igual que el resto de estáticos: son los archivos
  subidos (marcadores AR, modelos, PDFs) y ya se servían sin sesión desde
  `public/`. Ahora que pueden resolverse por un rewrite de respaldo, el
  middleware sí los interceptaría, y la petición interna que hace el optimizador
  de imágenes no lleva cookie: acabaría redirigida a /login y `next/image`
  recibiría HTML en vez de un PNG.
*/
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|register|ar/|uploads/|$).*)"],
};
