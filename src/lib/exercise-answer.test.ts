import { describe, expect, it } from "vitest";
import { casillas, coincideRespuesta, intentosDe, normalizarRespuesta, sigmaDesenfoque, sinTildes } from "./exercise-answer";

describe("normalizarRespuesta", () => {
  it("ignora mayúsculas, espacios y el tipo de apóstrofo", () => {
    expect(normalizarRespuesta("  P’IQI ")).toBe("p'iqi");
    expect(normalizarRespuesta("Ch‘illiwa")).toBe("ch'illiwa");
    expect(normalizarRespuesta("jach'a   uta")).toBe("jach'a uta");
  });
});

describe("sinTildes", () => {
  it("quita tildes y diéresis de vocales pero conserva la ñ", () => {
    expect(sinTildes("jikxatäwa")).toBe("jikxatawa");
    expect(sinTildes("Ñiq'i")).toBe("Ñiq'i");
    expect(sinTildes("Üru")).toBe("Uru");
    expect(sinTildes("alaña")).toBe("alaña");
  });
});

describe("coincideRespuesta", () => {
  it("acepta cualquiera de las variantes, con o sin tildes", () => {
    expect(coincideRespuesta("p'iqi", ["P’iqi"])).toBe(true);
    expect(coincideRespuesta("uru", ["Üru"])).toBe(true);
    expect(coincideRespuesta("inti", ["sol", "Inti"])).toBe(true);
  });
  it("rechaza vacío y palabras distintas (la ñ no es n)", () => {
    expect(coincideRespuesta("   ", ["inti"])).toBe(false);
    expect(coincideRespuesta("alana", ["alaña"])).toBe(false);
    expect(coincideRespuesta("uma", ["inti"])).toBe(false);
  });
});

describe("sigmaDesenfoque", () => {
  it("empieza muy borrosa, se aclara con cada fallo y queda nítida al agotar los intentos", () => {
    const niveles = [0, 1, 2, 3, 4, 5].map((f) => sigmaDesenfoque(f, 5));
    expect(niveles[0]).toBe(14);
    for (let i = 1; i < 5; i++) expect(niveles[i]).toBeLessThan(niveles[i - 1]);
    expect(niveles[4]).toBeGreaterThan(0);
    expect(niveles[5]).toBe(0);
  });
});

describe("intentosDe", () => {
  it("usa el valor configurado dentro de límites y 5 por defecto", () => {
    expect(intentosDe(null)).toBe(5);
    expect(intentosDe({ maxIntentos: 3 })).toBe(3);
    expect(intentosDe({ maxIntentos: 99 })).toBe(8);
    expect(intentosDe({ maxIntentos: 0 })).toBe(2);
    expect(intentosDe({ maxIntentos: "x" })).toBe(5);
  });
});

describe("casillas", () => {
  it("una por letra y los espacios no cuentan como letra", () => {
    expect(casillas("jach'a uta").filter((c) => c.letra)).toHaveLength(9);
  });
});
