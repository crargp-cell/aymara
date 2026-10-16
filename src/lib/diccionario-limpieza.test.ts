import { describe, expect, it } from "vitest";
import { normalizarCategoria, planLimpieza, type FilaDiccionario } from "./diccionario-limpieza";

const f = (id: number, aymara: string, espanol: string, categoria = ""): FilaDiccionario => ({ id, aymara, espanol, categoria });

describe("normalizarCategoria", () => {
  it("unifica las categorías escritas de dos maneras", () => {
    expect(normalizarCategoria("Animal")).toBe("Animales");
    expect(normalizarCategoria(" animales ")).toBe("Animales");
    expect(normalizarCategoria("Familia")).toBe("Familia");
  });
});

describe("planLimpieza", () => {
  it("elimina repetidas exactas y se queda con la que tiene categoría", () => {
    const p = planLimpieza([f(1, "ampara", "mano", "Cuerpo"), f(2, "Ampara", "mano", "Cuerpo"), f(3, "awicha", "abuela", "Familia"), f(4, "awicha", "abuela")]);
    expect([...p.eliminar].sort()).toEqual([2, 4]);
  });

  it("la repetida sin categoría hereda la de su gemela", () => {
    const p = planLimpieza([f(1, "uma", "agua"), f(2, "uma", "agua", "Naturaleza")]);
    expect(p.eliminar.has(1)).toBe(true);
    expect(p.categoria.get(2)).toBe("Naturaleza");
  });

  it("no toca palabras iguales con significados distintos", () => {
    const p = planLimpieza([f(1, "awki", "abuelo", "Familia"), f(2, "awki", "padre", "Familia")]);
    expect(p.eliminar.size).toBe(0);
  });

  it("oculta la palabra aymara «traducida» a muchas cosas sin relación", () => {
    const basura = ["sol", "pan", "agua", "mesa", "casa", "sal", "flor"].map((e, i) => f(10 + i, "chh'ajña", e));
    const p = planLimpieza([...basura, f(1, "uma", "agua", "Naturaleza")]);
    expect(basura.every((b) => p.deshabilitar.has(b.id))).toBe(true);
    expect(p.deshabilitar.has(1)).toBe(false);
  });

  it("unifica Animal/Animales en las filas que se conservan", () => {
    const p = planLimpieza([f(1, "añu", "perro", "Animal"), f(2, "wallpa", "gallina", "Animales")]);
    expect(p.categoria.get(1)).toBe("Animales");
  });
});
