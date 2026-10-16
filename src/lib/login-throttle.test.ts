import { describe, expect, it } from "vitest";
import { MAX_FALLOS_IP, MAX_FALLOS_USUARIO_IP, VENTANA_MINUTOS, bloqueado, desdeVentana } from "./login-throttle";

describe("bloqueado", () => {
  it("deja entrar mientras haya pocos fallos", () => {
    expect(bloqueado({ usuarioIp: 0, ip: 0 })).toBe(false);
    expect(bloqueado({ usuarioIp: MAX_FALLOS_USUARIO_IP - 1, ip: MAX_FALLOS_IP - 1 })).toBe(false);
  });
  it("bloquea al repetir contraseñas de una cuenta desde la misma dirección", () => {
    expect(bloqueado({ usuarioIp: MAX_FALLOS_USUARIO_IP, ip: MAX_FALLOS_USUARIO_IP })).toBe(true);
  });
  it("bloquea el barrido de muchos usuarios desde una dirección", () => {
    expect(bloqueado({ usuarioIp: 1, ip: MAX_FALLOS_IP })).toBe(true);
  });
});

describe("desdeVentana", () => {
  it("cuenta sólo los últimos minutos de la ventana", () => {
    const ahora = Date.UTC(2026, 0, 1, 12, 0, 0);
    expect(ahora - desdeVentana(ahora).getTime()).toBe(VENTANA_MINUTOS * 60_000);
  });
});
