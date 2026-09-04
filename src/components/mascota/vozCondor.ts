"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Linea } from "@/lib/mascota/guion";

/*
  Cómo suena el cóndor.

  Hay tres fuentes posibles y se prueban siempre en este orden:

    1. Una grabación real en /mascota/voz/<id>.mp3. Es la única que enseña
       pronunciación de verdad, así que gana a todo lo demás.
    2. Una voz sintética de aymara, si el dispositivo la tiene. Hoy no existe en
       ningún navegador —comprobado— pero el día que aparezca esto la usará sin
       tocar nada.
    3. Una voz española. Sirve para lo narrado en español. Cuando le toca leer
       una palabra aymara se avisa en pantalla de que la pronunciación es
       aproximada: no queremos que nadie aprenda a decirlo mal creyendo que está
       bien.

  El manifiesto dice qué grabaciones hay. Se consulta una vez y, si no está, se
  asume que aún no hay ninguna.
*/

export type FuenteVoz = "grabacion" | "aymara" | "espanol" | "ninguna";

/** Idiomas de voz aceptables para español, de más a menos cercano al andino. */
const PREFERENCIA_ES = ["es-bo", "es-pe", "es-419", "es-mx", "es-ar", "es-us", "es-es", "es"];

function mejorVoz(voces: SpeechSynthesisVoice[], prefijos: string[]) {
  for (const p of prefijos) {
    const v = voces.find((voz) => voz.lang.toLowerCase().replace("_", "-").startsWith(p));
    if (v) return v;
  }
  return null;
}

export function useVozCondor() {
  const [voces, setVoces] = useState<SpeechSynthesisVoice[]>([]);
  const [grabaciones, setGrabaciones] = useState<Set<string> | null>(null);
  const [hablando, setHablando] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const cargar = () => setVoces(window.speechSynthesis.getVoices());
    cargar();
    // En Chrome la lista llega vacía en la primera llamada y se rellena después.
    window.speechSynthesis.addEventListener("voiceschanged", cargar);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", cargar);
  }, []);

  useEffect(() => {
    let vivo = true;
    fetch("/mascota/voz/manifiesto.json")
      .then((r) => (r.ok ? r.json() : { grabaciones: [] }))
      .then((d) => vivo && setGrabaciones(new Set<string>(d?.grabaciones ?? [])))
      .catch(() => vivo && setGrabaciones(new Set<string>()));
    return () => {
      vivo = false;
    };
  }, []);

  const vozAymara = mejorVoz(voces, ["ay"]);
  const vozEspanola = mejorVoz(voces, PREFERENCIA_ES);

  /** Qué fuente usaría una línea concreta, para poder avisar antes de sonar. */
  const fuenteDe = useCallback(
    (linea: Linea): FuenteVoz => {
      if (grabaciones?.has(linea.id)) return "grabacion";
      if (linea.idioma === "ay" && vozAymara) return "aymara";
      if (vozEspanola) return "espanol";
      return "ninguna";
    },
    [grabaciones, vozAymara, vozEspanola],
  );

  /*
    True cuando se va a leer aymara con una voz que no lo es.

    Cuenta tanto la frase entera en aymara como la frase española que lleva una
    palabra aymara dentro ("¿Sabías que «chh'ajña» es «maíz»?"): en las dos, la
    voz española dirá mal el término, que es justo lo que el alumno viene a
    aprender. Sólo callan el aviso una grabación real o una voz aymara.
  */
  const esAproximada = useCallback(
    (linea: Linea) => (linea.idioma === "ay" || Boolean(linea.termino)) && fuenteDe(linea) === "espanol",
    [fuenteDe],
  );

  const callar = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setHablando(null);
  }, []);

  const hablar = useCallback(
    (linea: Linea) => {
      callar();
      const fuente = fuenteDe(linea);
      if (fuente === "ninguna") return;

      if (fuente === "grabacion") {
        const audio = new Audio(`/mascota/voz/${encodeURIComponent(linea.id)}.mp3`);
        audioRef.current = audio;
        setHablando(linea.id);
        audio.onended = () => setHablando(null);
        // Si la grabación está en el manifiesto pero falta el archivo, mejor
        // caer a la voz sintética que quedarse mudo sin explicación.
        audio.onerror = () => {
          setHablando(null);
          const voz = linea.idioma === "ay" ? vozAymara ?? vozEspanola : vozEspanola;
          if (voz) pronunciar(linea, voz, setHablando);
        };
        void audio.play().catch(() => setHablando(null));
        return;
      }

      const voz = fuente === "aymara" ? vozAymara : vozEspanola;
      if (voz) pronunciar(linea, voz, setHablando);
    },
    [callar, fuenteDe, vozAymara, vozEspanola],
  );

  useEffect(() => callar, [callar]);

  return {
    hablar,
    callar,
    hablando,
    fuenteDe,
    esAproximada,
    /** False mientras no haya ninguna voz ni grabación: el botón se oculta. */
    disponible: Boolean(vozAymara || vozEspanola || (grabaciones && grabaciones.size > 0)),
    hayVozAymara: Boolean(vozAymara),
  };
}

function pronunciar(
  linea: Linea,
  voz: SpeechSynthesisVoice,
  setHablando: (id: string | null) => void,
) {
  const u = new SpeechSynthesisUtterance(linea.texto);
  u.voice = voz;
  u.lang = voz.lang;
  // Algo más lento de lo normal: es material de aprendizaje, no una locución.
  u.rate = linea.idioma === "ay" ? 0.75 : 0.95;
  u.onend = () => setHablando(null);
  u.onerror = () => setHablando(null);
  setHablando(linea.id);
  window.speechSynthesis.speak(u);
}
