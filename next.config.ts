import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Los modelos .glb de las tarjetas AR llegan a varios MB; con el límite
      // por defecto la subida falla antes de llegar al handler.
      bodySizeLimit: "20mb",
    },
  },
  // Sólo aplica en desarrollo: permite servir los recursos de Next cuando se
  // accede por un túnel (demos con cloudflared / ngrok). Sin esto el navegador
  // recibe los chunks bloqueados y la página queda sin interactividad.
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app", "*.ngrok.io"],

  /*
    `next start` indexa `public/` al arrancar: lo que se suba después (marcadores
    AR, modelos .glb, PDFs de temas) responde 404 hasta reiniciar el servidor.

    Estos rewrites son de respaldo: `fallback` se evalúa sólo cuando nada más ha
    resuelto la petición, así que los archivos que sí estaban en el índice los
    sigue sirviendo Next de forma nativa —más rápido— y únicamente los subidos
    en caliente pasan por el handler, que lee del disco en cada petición.
  */
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        { source: "/ar/:ruta*", destination: "/api/media/ar/:ruta*" },
        { source: "/uploads/:ruta*", destination: "/api/media/uploads/:ruta*" },
      ],
    };
  },
};

export default nextConfig;
