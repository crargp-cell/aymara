import { mediaUrl } from "@/lib/slide-canvas";

/*
  Sonido de los botones de las diapositivas.

  Si el botón tiene una grabación, se reproduce esa: es la única que enseña la
  pronunciación de verdad. Si no, se lee el texto con una voz sintética
  española, que sólo sirve de aproximación (hoy ningún navegador trae voz de
  aymara); por eso la presentación avisa cuando hay botones sin grabación.
*/

const PREFERENCIA_ES = ["es-bo", "es-pe", "es-419", "es-mx", "es-ar", "es-us", "es-es", "es"];

let pista: HTMLAudioElement | null = null;

function vozEspanola(): SpeechSynthesisVoice | null {
  const voces = window.speechSynthesis.getVoices();
  for (const p of PREFERENCIA_ES) {
    const v = voces.find((x) => x.lang.toLowerCase().replace("_", "-").startsWith(p));
    if (v) return v;
  }
  return null;
}

export function detenerSonido() {
  pista?.pause();
  pista = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

/** Reproduce la grabación o, sin ella, lee el texto. Resuelve cuando termina (o falla). */
export function reproducirSonido(texto: string, mediaId?: number): Promise<void> {
  detenerSonido();
  return new Promise((resolve) => {
    if (mediaId) {
      const a = new Audio(mediaUrl(mediaId));
      pista = a;
      a.onended = () => resolve();
      a.onerror = () => resolve();
      a.play().catch(() => resolve());
      return;
    }
    if (!texto.trim() || typeof window === "undefined" || !("speechSynthesis" in window)) { resolve(); return; }
    const u = new SpeechSynthesisUtterance(texto);
    const voz = vozEspanola();
    if (voz) { u.voice = voz; u.lang = voz.lang; } else u.lang = "es-419";
    u.rate = 0.8; // más despacio: es para aprender a oír la palabra
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}
