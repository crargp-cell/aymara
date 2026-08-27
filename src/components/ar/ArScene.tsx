"use client";

import { useEffect, useRef, useState } from "react";

export function ArScene({ markerImageUrl, modelUrl }: { markerImageUrl: string; modelUrl?: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    let sceneEl: any = null;
    let objectUrl: string | null = null;

    async function init() {
      try {
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
          throw new Error("Este navegador o dispositivo no soporta acceso a cámara (getUserMedia).");
        }

        await import("aframe");
        await import("mind-ar/dist/mindar-image-aframe.prod.js");
        const { Compiler } = await import("mind-ar/dist/mindar-image.prod.js");

        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("No se pudo cargar la imagen del marcador."));
          img.src = markerImageUrl;
        });
        if (cancelled) return;

        const compiler = new Compiler();
        await compiler.compileImageTargets([img], () => {});
        const buffer = await compiler.exportData();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(new Blob([buffer as BlobPart]));

        if (!containerRef.current) return;
        const modelTag = modelUrl
          ? `<a-entity gltf-model="url(${modelUrl})" position="0 0 0.1" scale="0.15 0.15 0.15"></a-entity>`
          : `<a-box position="0 0 0.1" scale="0.2 0.2 0.2" color="#7c3aed"></a-box>`;

        containerRef.current.innerHTML = `
          <a-scene
            mindar-image="imageTargetSrc: ${objectUrl}; autoStart: true; uiScanning: no; uiLoading: no;"
            vr-mode-ui="enabled: false"
            device-orientation-permission-ui="enabled: false"
            embedded
            style="width:100%;height:100%;"
          >
            <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
            <a-entity mindar-image-target="targetIndex: 0">
              ${modelTag}
            </a-entity>
          </a-scene>
        `;
        sceneEl = containerRef.current.querySelector("a-scene");
        setStatus("ready");
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : "Error iniciando AR.");
          setStatus("error");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      try {
        sceneEl?.systems?.["mindar-image-system"]?.stop?.();
      } catch {}
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      // AFrame/mind-ar's own disconnectedCallback can throw if the camera pipeline
      // never fully started (e.g. no real camera available) — never let that crash the app.
      try {
        if (containerRef.current) containerRef.current.innerHTML = "";
      } catch {}
    };
  }, [markerImageUrl, modelUrl]);

  return (
    <div className="relative w-full h-80 rounded-xl overflow-hidden bg-black">
      <div ref={containerRef} className="absolute inset-0" />
      {status === "loading" && <div className="absolute inset-0 flex items-center justify-center text-white text-sm px-4 text-center">Iniciando cámara AR…</div>}
      {status === "error" && <div className="absolute inset-0 flex items-center justify-center text-center px-6 text-red-300 text-sm">{errorMsg}</div>}
    </div>
  );
}
