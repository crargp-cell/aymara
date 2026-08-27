"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, ExternalLink } from "lucide-react";

/**
 * Visor de PDF embebido — el alumno consulta el material sin salir de la
 * plataforma (Negocio.md §7). Usa el visor nativo del navegador vía <iframe>,
 * sin dependencias extra.
 */
export function PdfViewer({ url, title }: { url: string; title?: string }) {
  const [full, setFull] = useState(false);

  return (
    <div className={full ? "fixed inset-0 z-50 bg-background p-4 flex flex-col" : "space-y-2"}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium line-clamp-1">{title ?? "Material PDF"}</span>
        <div className="flex gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="ghost"><ExternalLink className="h-4 w-4" /></Button>
          </a>
          <Button size="sm" variant="ghost" onClick={() => setFull((v) => !v)}>
            {full ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <iframe
        src={`${url}#view=FitH`}
        title={title ?? "PDF"}
        className={`w-full rounded-xl border border-white/10 bg-white ${full ? "flex-1" : "h-[70vh]"}`}
      />
    </div>
  );
}
