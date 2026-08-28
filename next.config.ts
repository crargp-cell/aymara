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
};

export default nextConfig;
