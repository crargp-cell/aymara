/*
  El cóndor — Mallku.

  El cóndor (mallku) es, en la cosmovisión andina, el que une el mundo de arriba
  con el de aquí: por eso es quien acompaña al alumno. Este archivo es su guion:
  qué dice, con qué cara lo dice y en qué idioma habla cada frase.

  Está separado de la interfaz a propósito. Las frases son contenido —se
  corrigen, se traducen, se graban— y no deberían estar enredadas con JSX. Todo
  lo de aquí es puro y sin dependencias, así que se puede probar sin navegador.
*/

/** Cada pose corresponde a un archivo de public/mascota. */
export type Pose =
  | "normal"
  | "aprender"
  | "buscar"
  | "ensenar"
  | "escucha"
  | "estudiar"
  | "jugar"
  | "leer"
  | "naturaleza"
  | "pintar"
  | "timido";

export const ARCHIVO_POSE: Record<Pose, string> = {
  normal: "/mascota/mascota_normal.png",
  aprender: "/mascota/Aprender.png",
  buscar: "/mascota/Buscar.png",
  ensenar: "/mascota/Ensenar.png",
  escucha: "/mascota/Escucha.png",
  estudiar: "/mascota/Estudiar.png",
  jugar: "/mascota/Jugar.png",
  leer: "/mascota/Leer.png",
  naturaleza: "/mascota/Naturaleza.png",
  pintar: "/mascota/Pintar.png",
  timido: "/mascota/mascota_tapadoOjos.png",
};

/**
 * Una intervención del cóndor.
 *
 * `id` es estable y es lo que ata la frase a su grabación: si algún día se graba
 * a un hablante de aymara, el archivo se llama igual que el id y suena en lugar
 * de la voz sintética, sin tocar nada más.
 */
export type Linea = {
  id: string;
  texto: string;
  /** Decide qué voz se usa y si hay que avisar de que la pronunciación es aproximada. */
  idioma: "es" | "ay";
  pose: Pose;
  /** Palabra aymara que la frase enseña, si enseña alguna. */
  termino?: { aymara: string; espanol: string };
};

export type Guion = {
  titulo: string;
  lineas: Linea[];
};

/** Lo que el cóndor sabe del alumno, para no hablar en abstracto. */
export type ContextoAlumno = {
  nombre: string;
  paralelo: string | null;
  leccionesHechas: number;
  leccionesTotales: number;
  siguiente: { tipo: "lesson" | "exam"; titulo: string; href: string } | null;
  logros: number;
  tarjetas: number;
  /** Palabras del diccionario de su paralelo, para enseñar algo distinto cada vez. */
  palabras: { aymara: string; espanol: string }[];
};

/*
  "Kamisaraki" es el saludo cotidiano; se responde "waliki". Van aparte porque
  son las frases que más merecen una grabación real: un saludo mal pronunciado
  es lo primero que el alumno aprendería mal.
*/
export const SALUDO_AYMARA = { aymara: "Kamisaraki", espanol: "¿cómo estás?" };

/** Presentación del cóndor. Sólo en su propia pantalla. */
export function guionPresentacion(ctx: ContextoAlumno): Guion {
  return {
    titulo: "Mallku se presenta",
    lineas: [
      {
        id: "presenta-1",
        texto: `${SALUDO_AYMARA.aymara}, ${ctx.nombre}.`,
        idioma: "ay",
        pose: "normal",
        termino: SALUDO_AYMARA,
      },
      {
        id: "presenta-2",
        texto:
          "Eso que acabo de decir es un saludo: sirve para preguntar cómo estás. Si alguien te lo dice, puedes responder «waliki», que es «estoy bien».",
        idioma: "es",
        pose: "ensenar",
      },
      {
        id: "presenta-3",
        texto:
          "Soy Mallku, el cóndor. En los Andes se cuenta que el cóndor une el mundo de arriba con el de aquí abajo. Yo te acompaño mientras aprendes.",
        idioma: "es",
        pose: "naturaleza",
      },
      {
        id: "presenta-4",
        texto:
          "No te voy a poner nota ni a mirar por encima del hombro. Estoy para recordarte dónde estás y enseñarte alguna palabra cuando pases por aquí.",
        idioma: "es",
        pose: "aprender",
      },
    ],
  };
}

/** Lo que el cóndor dice sobre el punto en que está el alumno. */
export function guionProgreso(ctx: ContextoAlumno): Guion {
  const lineas: Linea[] = [];

  if (!ctx.paralelo) {
    lineas.push({
      id: "prog-sin-paralelo",
      texto:
        "Todavía no estás inscrito en un paralelo, así que no veo tu camino. Pídeselo al administrador y vuelve; aquí te espero.",
      idioma: "es",
      pose: "timido",
    });
    return { titulo: "Dónde estás", lineas };
  }

  if (ctx.leccionesHechas === 0) {
    lineas.push({
      id: "prog-inicio",
      texto: `Aún no has terminado ninguna lección de ${ctx.paralelo}. Eso no es malo: es el principio. Se empieza por la primera y no hay prisa.`,
      idioma: "es",
      pose: "aprender",
    });
  } else if (ctx.leccionesTotales > 0 && ctx.leccionesHechas >= ctx.leccionesTotales) {
    lineas.push({
      id: "prog-completo",
      texto: `Has terminado las ${ctx.leccionesTotales} lecciones de ${ctx.paralelo}. Todas. Puedes volver a cualquiera cuando quieras: repasar no te quita nada de lo ganado.`,
      idioma: "es",
      pose: "jugar",
    });
  } else {
    lineas.push({
      id: "prog-medio",
      texto: `Llevas ${ctx.leccionesHechas} de ${ctx.leccionesTotales} lecciones en ${ctx.paralelo}. Vas por buen camino.`,
      idioma: "es",
      pose: "aprender",
    });
  }

  if (ctx.siguiente) {
    lineas.push({
      id: "prog-siguiente",
      texto:
        ctx.siguiente.tipo === "exam"
          ? `Lo que tienes delante es un examen: «${ctx.siguiente.titulo}». Si fallas algo no pasa nada, se puede volver a intentar.`
          : `Lo siguiente es «${ctx.siguiente.titulo}». Cuando quieras, vamos.`,
      idioma: "es",
      pose: ctx.siguiente.tipo === "exam" ? "estudiar" : "leer",
    });
  }

  if (ctx.tarjetas > 0) {
    lineas.push({
      id: "prog-tarjetas",
      texto: `Y tienes ${ctx.tarjetas} tarjeta${ctx.tarjetas === 1 ? "" : "s"} de realidad aumentada. Se imprimen y se miran con la cámara.`,
      idioma: "es",
      pose: "naturaleza",
    });
  }

  return { titulo: "Dónde estás", lineas };
}

/** Una palabra del diccionario, distinta cada día. */
export function guionPalabra(ctx: ContextoAlumno, semilla: number): Guion | null {
  if (ctx.palabras.length === 0) return null;
  const p = ctx.palabras[Math.abs(semilla) % ctx.palabras.length];
  return {
    titulo: "Una palabra",
    lineas: [
      { id: `palabra-${p.aymara}`, texto: p.aymara, idioma: "ay", pose: "ensenar", termino: p },
      { id: `palabra-${p.aymara}-es`, texto: `Quiere decir «${p.espanol}».`, idioma: "es", pose: "escucha" },
    ],
  };
}

/**
 * Frase corta para el acompañante flotante, según la pantalla en que esté el
 * alumno. Aquí no cabe un discurso: una sola frase.
 */
export function comentarioDePantalla(ruta: string, ctx: ContextoAlumno, semilla: number): Linea {
  const elegir = (opciones: Linea[]) => opciones[Math.abs(semilla) % opciones.length];

  if (ruta.startsWith("/map")) {
    return elegir([
      { id: "mapa-1", texto: "Este es tu camino. Cada piedra es una lección, y se abren de una en una.", idioma: "es", pose: "leer" },
      { id: "mapa-2", texto: "Puedes volver a cualquier nivel que ya hiciste. Repasar no borra nada.", idioma: "es", pose: "aprender" },
    ]);
  }
  if (ruta.startsWith("/dictionary")) {
    return elegir([
      { id: "dicc-1", texto: "Busca por aymara o por español, da igual el orden.", idioma: "es", pose: "buscar" },
      { id: "dicc-2", texto: "Si una palabra se te resiste, búscala aquí y vuelve al ejercicio.", idioma: "es", pose: "buscar" },
    ]);
  }
  if (ruta.startsWith("/exams")) {
    return { id: "examen-1", texto: "Tranquilo. Se guarda cada intento, así que puedes equivocarte.", idioma: "es", pose: "estudiar" };
  }
  if (ruta.startsWith("/ar-cards")) {
    return { id: "ar-1", texto: "Estas tarjetas se imprimen y se miran con la cámara. Cobran vida.", idioma: "es", pose: "naturaleza" };
  }
  if (ruta.startsWith("/logros")) {
    return {
      id: "logros-1",
      texto: `Llevas ${ctx.logros} logro${ctx.logros === 1 ? "" : "s"}. No son un premio: son un recuerdo de por dónde pasaste.`,
      idioma: "es",
      pose: "jugar",
    };
  }
  if (ruta.startsWith("/lessons") || ruta.startsWith("/topics") || ruta.startsWith("/play")) {
    return elegir([
      { id: "lec-1", texto: "Léelo sin correr. Nadie te está cronometrando aquí.", idioma: "es", pose: "leer" },
      { id: "lec-2", texto: "Si fallas un ejercicio, vuelve a intentarlo: no se penaliza.", idioma: "es", pose: "aprender" },
    ]);
  }

  // Inicio y todo lo demás: saludo con la palabra del día.
  const palabra = ctx.palabras.length ? ctx.palabras[Math.abs(semilla) % ctx.palabras.length] : null;
  if (palabra) {
    return {
      id: `saludo-palabra-${palabra.aymara}`,
      texto: `${SALUDO_AYMARA.aymara}, ${ctx.nombre}. ¿Sabías que «${palabra.aymara}» es «${palabra.espanol}»?`,
      idioma: "es",
      pose: "normal",
      termino: palabra,
    };
  }
  return {
    id: "saludo-simple",
    texto: `${SALUDO_AYMARA.aymara}, ${ctx.nombre}.`,
    idioma: "ay",
    pose: "normal",
    termino: SALUDO_AYMARA,
  };
}

/** Semilla estable por día: el cóndor no cambia de frase en cada recarga. */
export function semillaDelDia(extra = 0): number {
  const hoy = new Date();
  return hoy.getFullYear() * 10000 + (hoy.getMonth() + 1) * 100 + hoy.getDate() + extra;
}
