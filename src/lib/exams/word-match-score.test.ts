import { describe, expect, it } from "vitest";
import { PENALTY_PER_ERROR, enGruposCompletos, sinAmbiguas, wordMatchPct } from "./word-match-score";

describe("wordMatchPct", () => {
  it("es el porcentaje de cartas acertadas", () => {
    expect(wordMatchPct(10, 10, 0)).toBe(100);
    expect(wordMatchPct(10, 6, 0)).toBe(60);
    expect(wordMatchPct(10, 0, 0)).toBe(0);
  });

  it("descuenta los errores y nunca baja de 0", () => {
    expect(wordMatchPct(10, 10, 2)).toBe(100 - Math.round(((2 * PENALTY_PER_ERROR) / 10) * 100));
    expect(wordMatchPct(10, 1, 50)).toBe(0);
  });

  it("sin palabras no hay nota", () => {
    expect(wordMatchPct(0, 0, 0)).toBe(0);
  });
});

describe("sinAmbiguas", () => {
  const w = (id: number, text: string, category: string) => ({ id, text, category });

  it("descarta la palabra escrita en dos categorías distintas", () => {
    const r = sinAmbiguas([w(1, "awki", "Familia"), w(2, "awki", "Animales"), w(3, "kimsa", "Números")]);
    expect(r.map((x) => x.id)).toEqual([3]);
  });

  it("deja una sola carta si la palabra se repite en la misma categoría", () => {
    const r = sinAmbiguas([w(1, "Wawa", "Familia"), w(2, "wawa", "Familia")]);
    expect(r.map((x) => x.id)).toEqual([1]);
  });
});

describe("enGruposCompletos", () => {
  const w = (id: number, category: string) => ({ id, text: `p${id}`, category });

  it("deja las categorías en múltiplos de 4 y descarta las que no llegan a 4", () => {
    const pool = [...[1, 2, 3, 4, 5, 6].map((i) => w(i, "A")), ...[7, 8, 9].map((i) => w(i, "B")), ...[10, 11, 12, 13].map((i) => w(i, "C"))];
    const r = enGruposCompletos(pool);
    expect(r.filter((x) => x.category === "A").map((x) => x.id)).toEqual([1, 2, 3, 4]);
    expect(r.some((x) => x.category === "B")).toBe(false);
    expect(r.filter((x) => x.category === "C")).toHaveLength(4);
  });
});
