import { describe, it, expect } from "vitest";
import { palabrasEnsenables } from "./contexto";

/*
  El diccionario cargado tiene entradas que se contradicen entre sí: una misma
  forma aymara aparece con decenas de significados españoles distintos. Si el
  cóndor sacara una de ésas enseñaría vocabulario falso, así que el filtro es
  parte del contenido, no un detalle: merece quedar fijado.
*/

describe("palabrasEnsenables", () => {
  it("deja pasar las palabras con un único significado", () => {
    const r = palabrasEnsenables([
      { aymara: "añu", espanol: "perro" },
      { aymara: "chaka", espanol: "puente" },
    ]);
    expect(r).toEqual([
      { aymara: "añu", espanol: "perro" },
      { aymara: "chaka", espanol: "puente" },
    ]);
  });

  it("descarta la palabra que los datos definen de varias maneras", () => {
    const r = palabrasEnsenables([
      { aymara: "añu", espanol: "perro" },
      { aymara: "chh'ajña", espanol: "maíz" },
      { aymara: "chh'ajña", espanol: "sal" },
      { aymara: "chh'ajña", espanol: "sol" },
    ]);
    expect(r.map((p) => p.aymara)).toEqual(["añu"]);
  });

  it("no cuenta como contradicción la misma entrada repetida", () => {
    const r = palabrasEnsenables([
      { aymara: "añu", espanol: "perro" },
      { aymara: "Añu", espanol: "Perro" },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].aymara).toBe("añu");
  });

  it("ignora las entradas a medias en vez de enseñarlas incompletas", () => {
    const r = palabrasEnsenables([
      { aymara: "añu", espanol: null },
      { aymara: null, espanol: "perro" },
      { aymara: "chaka", espanol: "puente" },
    ]);
    expect(r).toEqual([{ aymara: "chaka", espanol: "puente" }]);
  });

  it("devuelve una lista vacía sin romperse cuando no hay nada usable", () => {
    expect(palabrasEnsenables([])).toEqual([]);
    expect(palabrasEnsenables([{ aymara: null, espanol: null }])).toEqual([]);
  });
});
