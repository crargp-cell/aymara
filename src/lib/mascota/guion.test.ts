import { describe, it, expect } from "vitest";
import {
  ARCHIVO_POSE,
  comentarioDePantalla,
  guionPalabra,
  guionPresentacion,
  guionProgreso,
  semillaDelDia,
  type ContextoAlumno,
  type Linea,
} from "./guion";

const base: ContextoAlumno = {
  nombre: "Ana",
  paralelo: '1º Secundaria "A"',
  leccionesHechas: 2,
  leccionesTotales: 5,
  siguiente: { tipo: "lesson", titulo: "Los colores", href: "/lessons/4" },
  logros: 3,
  tarjetas: 1,
  palabras: [
    { aymara: "añu", espanol: "perro" },
    { aymara: "ampara", espanol: "mano" },
  ],
};

/** Toda línea tiene que poder pintarse y, algún día, grabarse. */
function esUsable(l: Linea) {
  expect(l.id).toMatch(/\S/);
  expect(l.texto.trim().length).toBeGreaterThan(0);
  expect(ARCHIVO_POSE[l.pose]).toBeTruthy();
}

describe("guion del cóndor", () => {
  it("da a cada línea un id, texto y una pose que existe", () => {
    const todas = [
      ...guionPresentacion(base).lineas,
      ...guionProgreso(base).lineas,
      ...(guionPalabra(base, 0)?.lineas ?? []),
    ];
    expect(todas.length).toBeGreaterThan(0);
    todas.forEach(esUsable);
  });

  it("no repite ids dentro de un mismo guion, porque el id ata la grabación", () => {
    for (const g of [guionPresentacion(base), guionProgreso(base), guionPalabra(base, 0)!]) {
      const ids = g.lineas.map((l) => l.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("marca como aymara sólo lo que de verdad lo es", () => {
    // El saludo va en aymara; lo que lo explica, en español. De esa etiqueta
    // depende qué voz se usa y si se avisa de pronunciación aproximada.
    const [saludo, explicacion] = guionPresentacion(base).lineas;
    expect(saludo.idioma).toBe("ay");
    expect(saludo.termino?.aymara).toBe("Kamisaraki");
    expect(explicacion.idioma).toBe("es");
  });

  it("cuenta el progreso real en vez de hablar en abstracto", () => {
    const texto = guionProgreso(base).lineas.map((l) => l.texto).join(" ");
    expect(texto).toContain("2 de 5");
    expect(texto).toContain('1º Secundaria "A"');
    expect(texto).toContain("Los colores");
  });

  it("no felicita por terminar cuando no se ha terminado", () => {
    const casi = guionProgreso({ ...base, leccionesHechas: 4, leccionesTotales: 5 });
    expect(casi.lineas.some((l) => l.id === "prog-completo")).toBe(false);
    const entero = guionProgreso({ ...base, leccionesHechas: 5, leccionesTotales: 5, siguiente: null });
    expect(entero.lineas.some((l) => l.id === "prog-completo")).toBe(true);
  });

  it("avisa en lugar de inventar cuando el alumno no tiene paralelo", () => {
    const g = guionProgreso({ ...base, paralelo: null, leccionesTotales: 0, leccionesHechas: 0 });
    expect(g.lineas).toHaveLength(1);
    expect(g.lineas[0].id).toBe("prog-sin-paralelo");
  });

  it("se calla sobre las tarjetas si no hay ninguna", () => {
    const sin = guionProgreso({ ...base, tarjetas: 0 });
    expect(sin.lineas.some((l) => l.id === "prog-tarjetas")).toBe(false);
  });

  it("no intenta enseñar una palabra si el diccionario está vacío", () => {
    expect(guionPalabra({ ...base, palabras: [] }, 0)).toBeNull();
  });

  it("elige siempre una palabra que existe, sea cual sea la semilla", () => {
    for (const s of [0, 1, 7, 12345, -3, semillaDelDia()]) {
      const g = guionPalabra(base, s);
      expect(base.palabras.some((p) => p.aymara === g!.lineas[0].texto)).toBe(true);
    }
  });

  it("adapta el comentario a la pantalla en la que está el alumno", () => {
    const rutas = ["/map", "/dictionary", "/exams", "/ar-cards", "/logros", "/lessons/3", "/dashboard"];
    for (const r of rutas) esUsable(comentarioDePantalla(r, base, 0));
    expect(comentarioDePantalla("/dictionary", base, 0).pose).toBe("buscar");
    expect(comentarioDePantalla("/exams", base, 0).pose).toBe("estudiar");
  });

  it("sigue hablando aunque no haya nada que contar", () => {
    const vacio: ContextoAlumno = {
      nombre: "Ana",
      paralelo: null,
      leccionesHechas: 0,
      leccionesTotales: 0,
      siguiente: null,
      logros: 0,
      tarjetas: 0,
      palabras: [],
    };
    esUsable(comentarioDePantalla("/dashboard", vacio, 0));
    guionPresentacion(vacio).lineas.forEach(esUsable);
  });

  it("mantiene la misma frase durante todo el día", () => {
    expect(semillaDelDia()).toBe(semillaDelDia());
    expect(comentarioDePantalla("/map", base, semillaDelDia()).id).toBe(
      comentarioDePantalla("/map", base, semillaDelDia()).id,
    );
  });
});
