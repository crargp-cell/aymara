"use client";

import { useEffect, useRef, useState } from "react";

export function ArScene({ markerImageUrl, modelUrl }: { markerImageUrl: string; modelUrl?: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const camPreviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<"ar" | "preview">("ar");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [camActive, setCamActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let sceneEl: any = null;
    let objectUrl: string | null = null;
    let onError: any = null;

    async function startMiniCam() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (camPreviewRef.current) {
          camPreviewRef.current.srcObject = stream;
          await camPreviewRef.current.play().catch(() => {});
          setCamActive(true);
        }
      } catch {
        setCamActive(false);
      }
    }

    async function initAr() {
      try {
        setStatus("loading");
        setErrorMsg("");
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
          throw new Error("Este navegador no soporta cámara.");
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

        onError = (e: ErrorEvent) => {
          if (e.message?.includes("fov")) {
            e.preventDefault();
            if (!cancelled) {
              setErrorMsg("Error de cámara AR (fov). Probá vista previa 3D.");
              setStatus("error");
            }
          }
        };
        window.addEventListener("error", onError);

        const modelTag = modelUrl
          ? `<a-entity gltf-model="url(${modelUrl})" position="0 0 0.1" scale="0.15 0.15 0.15"></a-entity>`
          : `<a-box position="0 0 0.1" scale="0.35 0.35 0.35" color="#10b981" material="opacity: 0.9"></a-box>`;

        containerRef.current.innerHTML = `
          <a-scene
            mindar-image="imageTargetSrc: ${objectUrl}; autoStart: true; uiScanning: no; uiLoading: no; filterMinCF:0.0001; filterBeta: 1000; warmupTolerance: 10; missTolerance: 12;"
            vr-mode-ui="enabled: false"
            device-orientation-permission-ui="enabled: false"
            renderer="colorManagement: true; alpha: true"
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
        sceneEl?.addEventListener("loaded", () => {
          if (!cancelled) setStatus("ready");
        });
        sceneEl?.addEventListener("arError", () => {
          if (!cancelled) {
            setErrorMsg("No se pudo iniciar AR. Usa vista previa 3D.");
            setStatus("error");
          }
        });

        setTimeout(() => {
          if (!cancelled) setStatus((s) => (s === "loading" ? "ready" : s));
        }, 4000);

        void startMiniCam();
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : "Error iniciando AR.");
          setStatus("error");
        }
      }
    }

    async function initPreview() {
      try {
        setStatus("loading");
        await import("aframe");
        if (!containerRef.current) return;
        if (!modelUrl) {
          containerRef.current.innerHTML = `
            <a-scene
              embedded
              renderer="antialias: true; colorManagement: true"
              vr-mode-ui="enabled: false"
              style="width:100%;height:100%;"
            >
              <a-entity light="type: ambient; intensity: 1.2"></a-entity>
              <a-entity light="type: directional; intensity: 0.9" position="1 2 1"></a-entity>
              <a-box position="0 0 -2.2" scale="0.7 0.7 0.7" color="#10b981" material="opacity: 0.9" animation="property: rotation; to: 0 360 0; loop: true; dur: 8000; easing: linear"></a-box>
              <a-camera position="0 1.2 3" look-controls="enabled: true" wasd-controls="enabled: false"></a-camera>
            </a-scene>
          `;
          sceneEl = containerRef.current.querySelector("a-scene");
          sceneEl?.addEventListener("loaded", () => {
            if (!cancelled) setStatus("ready");
          });
          setTimeout(() => {
            if (!cancelled) setStatus((s) => (s === "loading" ? "ready" : s));
          }, 800);
          return;
        }
        containerRef.current.innerHTML = `
          <a-scene
            embedded
            renderer="antialias: true; colorManagement: true"
            vr-mode-ui="enabled: false"
            style="width:100%;height:100%;"
          >
            <a-assets><a-asset-item id="m" src="${modelUrl}"></a-asset-item></a-assets>
            <a-entity light="type: ambient; intensity: 1.2"></a-entity>
            <a-entity light="type: directional; intensity: 0.9" position="1 2 1"></a-entity>
            <a-entity gltf-model="#m" position="0 0 -2.2" scale="0.6 0.6 0.6" rotation="0 20 0" animation="property: rotation; to: 0 380 0; loop: true; dur: 12000; easing: linear"></a-entity>
            <a-camera position="0 1.2 3" look-controls="enabled: true" wasd-controls="enabled: false"></a-camera>
          </a-scene>
        `;
        sceneEl = containerRef.current.querySelector("a-scene");
        sceneEl?.addEventListener("loaded", () => {
          if (!cancelled) setStatus("ready");
        });
        setTimeout(() => {
          if (!cancelled) setStatus((s) => (s === "loading" ? "ready" : s));
        }, 1500);
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : "Error en vista previa.");
          setStatus("error");
        }
      }
    }

    if (containerRef.current) containerRef.current.innerHTML = "";
    setCamActive(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (mode === "preview") initPreview();
    else initAr();

    return () => {
      cancelled = true;
      if (onError) window.removeEventListener("error", onError);
      try {
        sceneEl?.systems?.["mindar-image-system"]?.stop?.();
      } catch {}
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      try {
        if (containerRef.current) containerRef.current.innerHTML = "";
      } catch {}
    };
  }, [markerImageUrl, modelUrl, mode]);

  return (
    <div className="relative w-full h-[58vh] min-h-[420px] max-h-[760px] rounded-2xl overflow-hidden bg-black shadow-2xl border border-border">
      <div className="absolute top-3 right-3 z-20 flex gap-1.5">
        <button onClick={() => setMode("ar")} className={`text-xs px-3 py-1.5 rounded-full font-medium backdrop-blur transition ${mode === "ar" ? "bg-white text-black shadow" : "bg-black/40 text-white border border-white/20 hover:bg-black/60"}`}>AR</button>
        <button onClick={() => setMode("preview")} className={`text-xs px-3 py-1.5 rounded-full font-medium backdrop-blur transition ${mode === "preview" ? "bg-white text-black shadow" : "bg-black/40 text-white border border-white/20 hover:bg-black/60"}`}>Vista previa 3D</button>
      </div>

      {mode === "ar" && (
        <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">
          <div className="relative w-28 h-20 sm:w-36 sm:h-24 rounded-xl overflow-hidden border-2 border-white/80 shadow-lg bg-black">
            <video ref={camPreviewRef} autoPlay muted playsInline className="w-full h-full object-cover scale-x-[-1]" />
            {!camActive && <div className="absolute inset-0 flex items-center justify-center text-[10px] text-white/70 bg-black/50">cámara…</div>}
            <div className="absolute inset-0 pointer-events-none border border-white/20 rounded-xl" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-8 h-8 border border-white/90 rounded-sm relative">
                <div className="absolute inset-0 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-white rounded-full shadow" /></div>
                <div className="absolute -top-0.5 -left-0.5 w-2 h-2 border-t-2 border-l-2 border-white rounded-tl-sm" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 border-t-2 border-r-2 border-white rounded-tr-sm" />
                <div className="absolute -bottom-0.5 -left-0.5 w-2 h-2 border-b-2 border-l-2 border-white rounded-bl-sm" />
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 border-b-2 border-r-2 border-white rounded-br-sm" />
              </div>
            </div>
            <span className="absolute bottom-0.5 left-1 text-[8px] font-mono bg-black/60 text-white px-1 rounded">mini visor</span>
          </div>
          <span className="text-[10px] text-white/60 bg-black/40 backdrop-blur px-2 py-0.5 rounded-full w-fit">Apuntá la tarjeta al centro</span>
        </div>
      )}

      <div ref={containerRef} className="absolute inset-0" />

      {mode === "ar" && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-[58%] h-[58%] max-w-[320px] max-h-[320px] border border-white/15 rounded-xl relative hidden sm:block">
            <div className="absolute inset-0 border border-dashed border-border rounded-xl" />
          </div>
        </div>
      )}

      {status === "loading" && <div className="absolute inset-0 flex items-center justify-center text-white text-sm px-4 text-center pointer-events-none bg-black/30 backdrop-blur-[1px]">{mode === "preview" ? "Cargando modelo 3D…" : "Iniciando cámara AR…"}</div>}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 text-red-300 text-sm gap-3 bg-black/70 backdrop-blur">
          <span>{errorMsg}</span>
          {mode === "ar" && modelUrl && <button onClick={() => setMode("preview")} className="text-xs bg-white text-black px-4 py-1.5 rounded-full font-medium">Ver modelo en 3D</button>}
        </div>
      )}
    </div>
  );
}
