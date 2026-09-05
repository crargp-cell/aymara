import { describe, it, expect } from "vitest";
import { CUADROS, cuadroEn } from "./CondorHablante";

/*
  El orden de los dibujos es lo que hace que el pico parezca hablar. En pantalla
  cada cuadro dura 120 ms, así que un índice equivocado se vería como un tic raro
  y nadie sabría por qué: mejor dejarlo fijado aquí.
*/

describe("cuadroEn", () => {
  it("recorre 1, 2, 3, 2 y vuelve a empezar", () => {
    // Los índices son 0,1,2 sobre CUADROS, o sea los dibujos 1.png, 2.png y 3.png.
    const doceP = Array.from({ length: 12 }, (_, n) => cuadroEn(n) + 1);
    expect(doceP).toEqual([1, 2, 3, 2, 1, 2, 3, 2, 1, 2, 3, 2]);
  });

  it("nunca salta del pico abierto al cerrado de golpe", () => {
    // Entre abierto (3) y cerrado (1) tiene que pasar por el medio (2); si no,
    // el pico da un tirón en vez de articular.
    for (let n = 0; n < 40; n++) {
      const salto = Math.abs(cuadroEn(n + 1) - cuadroEn(n));
      expect(salto).toBe(1);
    }
  });

  it("empieza con el pico cerrado", () => {
    expect(cuadroEn(0)).toBe(0);
    expect(CUADROS[cuadroEn(0)]).toBe("/mascota/1.png");
  });

  it("devuelve un dibujo que existe para cualquier paso", () => {
    for (const n of [0, 1, 7, 999, 100000]) {
      expect(CUADROS[cuadroEn(n)]).toBeTruthy();
    }
  });

  it("aguanta un paso negativo sin devolver un hueco", () => {
    // El reloj no debería ir hacia atrás, pero si lo hiciera no puede salir
    // `undefined` y dejar al cóndor sin cara.
    for (const n of [-1, -3, -12]) {
      expect(CUADROS[cuadroEn(n)]).toBeTruthy();
    }
  });
});
