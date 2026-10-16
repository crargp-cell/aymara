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

/**
 * Lo que está pasando en un juego o ejercicio, para que Mallku reaccione.
 * `termino` es la palabra aymara que el juego acaba de enseñar (se puede oír).
 */
export type EstadoJuego =
  | { tipo: "intro"; juego: "adivina" | "arrastra" | "ejercicio" | "examen" }
  /** «Adivina la imagen» en curso: cuanto menos nítida, más tímido. */
  | { tipo: "borrosa"; fallos: number; intentos: number }
  | { tipo: "pensando"; palabra?: string }
  | { tipo: "acierto"; racha?: number; termino?: { aymara: string; espanol: string } }
  | { tipo: "fallo"; restantes?: number }
  | { tipo: "pierde"; termino?: { aymara: string; espanol: string } }
  | { tipo: "forzado" }
  | { tipo: "completada" }
  | { tipo: "resultado"; aprobado: boolean }
  | { tipo: "vacio"; donde: "mapa" | "diccionario" | "examenes" | "ejercicios" };

/**
 * Frase y pose de Mallku para un momento de un juego. Pura y sin azar propio: la
 * `semilla` elige entre las variantes, así la misma partida no cambia de frase en
 * cada repintado. Cada línea lleva un id estable para poder grabarla algún día.
 */
export function guionJuego(estado: EstadoJuego, semilla = 0): Linea {
  const elegir = (opciones: Linea[]) => opciones[Math.abs(semilla) % opciones.length];
  const es = (id: string, texto: string, pose: Pose, termino?: Linea["termino"]): Linea => ({ id, texto, idioma: "es", pose, ...(termino ? { termino } : {}) });

  switch (estado.tipo) {
    case "intro":
      if (estado.juego === "adivina") return es("juego-intro-adivina", "Escondí una imagen tras la niebla. Dime qué palabra es y se irá aclarando.", "jugar");
      if (estado.juego === "arrastra") return es("juego-intro-arrastra", "Te doy una palabra y tú arrastras la tarjeta que le corresponde.", "jugar");
      if (estado.juego === "examen") return es("juego-intro-examen", "Tranquilo, respira. Lo que sabes, sabes; lo demás se aprende.", "estudiar");
      return es("juego-intro-ejercicio", "Vamos con este ejercicio. Tómate tu tiempo.", "jugar");

    case "borrosa": {
      const avance = estado.intentos > 0 ? estado.fallos / estado.intentos : 0;
      if (avance < 0.4) return elegir([
        es("juego-borrosa-1", "No miro… ¿qué crees que es?", "timido"),
        es("juego-borrosa-2", "Aún no se ve nada. Prueba con lo primero que se te ocurra.", "timido"),
      ]);
      if (avance < 0.8) return es("juego-borrosa-3", "Ya se asoma… ¡fíjate en las formas!", "buscar");
      return es("juego-borrosa-4", "Casi nítida. Última oportunidad: ¿qué ves?", "estudiar");
    }

    case "pensando":
      return estado.palabra
        ? es("juego-pensando-palabra", `¿Dónde estará «${estado.palabra}»? Busca la tarjeta que le corresponde.`, "buscar")
        : es("juego-pensando", "Piénsalo con calma.", "estudiar");

    case "acierto":
      if (estado.termino) return es("juego-acierto-termino", estado.termino.espanol ? `¡Eso es! «${estado.termino.aymara}» significa «${estado.termino.espanol}».` : `¡Eso es! Se dice «${estado.termino.aymara}».`, "ensenar", estado.termino);
      if ((estado.racha ?? 0) >= 3) return es("juego-acierto-racha", `¡${estado.racha} seguidas! Vas volando.`, "jugar");
      return elegir([es("juego-acierto-1", "¡Muy bien!", "aprender"), es("juego-acierto-2", "¡Correcto! Así se hace.", "aprender")]);

    case "fallo":
      if (estado.restantes === 1) return es("juego-fallo-ultimo", "Ups. Te queda un intento: piénsalo bien.", "escucha");
      return elegir([
        es("juego-fallo-1", "Casi. Escucha otra vez y prueba de nuevo.", "escucha"),
        es("juego-fallo-2", "No pasa nada: equivocarse también enseña.", "escucha"),
      ]);

    case "pierde":
      return estado.termino
        ? es("juego-pierde-termino", estado.termino.espanol ? `Era «${estado.termino.aymara}» (${estado.termino.espanol}). Ahora ya la conoces.` : `Era «${estado.termino.aymara}». Ahora ya la conoces.`, "ensenar", estado.termino)
        : es("juego-pierde", "Esta vez no salió. Mírala bien y la próxima será tuya.", "aprender");

    case "forzado":
      return es("juego-forzado", "Repasemos el tema juntos antes de seguir. Te ayudará.", "leer");

    case "completada":
      return es("juego-completada", "¡Lección completada! Estoy muy orgulloso de ti.", "naturaleza");

    case "resultado":
      return estado.aprobado
        ? es("juego-resultado-ok", "¡Aprobaste! Lo hiciste muy bien.", "jugar")
        : es("juego-resultado-no", "Todavía no, pero puedes intentarlo otra vez. Yo te acompaño.", "estudiar");

    case "vacio":
      if (estado.donde === "diccionario") return es("juego-vacio-diccionario", "No encontré nada. Prueba con otra palabra.", "buscar");
      if (estado.donde === "examenes") return es("juego-vacio-examenes", "Aún no hay exámenes por aquí. Practica y vuelve pronto.", "estudiar");
      if (estado.donde === "ejercicios") return es("juego-vacio-ejercicios", "Todavía no hay ejercicios en esta lección.", "leer");
      return es("juego-vacio-mapa", "Tu camino empieza aquí. ¡Elige una lección!", "leer");
  }
}

/**
 * Pose de Mallku para una pantalla: la que lleva en la cabecera de cada sección.
 * Pura y por prefijo de ruta, así una sección nueva sólo necesita una línea aquí.
 */
export function poseDeRuta(ruta: string): Pose {
  const tabla: [string, Pose][] = [
    ["/dictionary", "buscar"],
    ["/exams", "estudiar"],
    ["/topics", "leer"],
    ["/lessons", "leer"],
    ["/map", "aprender"],
    ["/play", "jugar"],
    ["/logros", "jugar"],
    ["/ar-cards", "naturaleza"],
    ["/admin/ar", "naturaleza"],
    ["/admin/analitica", "estudiar"],
    ["/analitica", "estudiar"],
    ["/admin", "ensenar"],
  ];
  return tabla.find(([prefijo]) => ruta === prefijo || ruta.startsWith(prefijo + "/"))?.[1] ?? "normal";
}

/** Semilla estable por día: el cóndor no cambia de frase en cada recarga. */
export function semillaDelDia(extra = 0): number {
  const hoy = new Date();
  return hoy.getFullYear() * 10000 + (hoy.getMonth() + 1) * 100 + hoy.getDate() + extra;
}
