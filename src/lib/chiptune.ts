/*
  Música y efectos de 8 bits generados con la Web Audio API: no hay archivos de
  audio (nada que descargar ni licenciar). La melodía usa la pentatónica menor
  de La, la escala que se oye en buena parte de la música andina.

  Un AudioContext sólo puede arrancar tras un gesto del usuario: `unlock()` se
  llama desde el botón de empezar.
*/

const STORAGE_KEY = "aymara-chiptune";

/** Semitonos respecto de La4 (440 Hz); null = silencio. 8 compases de 8 corcheas. */
const LEAD: (number | null)[] = [
  0, null, 3, null, 7, null, 3, 5,
  7, null, 10, null, 12, null, 10, 7,
  5, null, 7, null, 3, null, 0, 3,
  5, 3, 0, null, -2, null, 0, null,
  12, null, 10, 7, 10, null, 7, 5,
  7, null, 5, 3, 5, null, 3, 0,
  3, null, 5, 7, 10, 12, 10, 7,
  5, null, 3, null, 0, null, null, null,
];
/** Fundamental de cada compás (semitonos respecto de La4). */
const BASS_ROOTS = [-24, -24, -19, -17, -24, -21, -19, -17];

const hz = (semitonos: number) => 440 * Math.pow(2, semitonos / 12);

export type Sfx = "select" | "correct" | "combo" | "wrong" | "tick" | "start" | "win" | "lose";

export class Chiptune {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private pulse: PeriodicWave | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private step = 0;
  private nextTime = 0;
  private playing = false;
  private hurry = false;
  private onVisibility = () => {
    if (!this.ctx) return;
    if (document.hidden) void this.ctx.suspend();
    else void this.ctx.resume();
  };

  musicOn = true;
  sfxOn = true;

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (saved && typeof saved === "object") {
        this.musicOn = saved.music !== false;
        this.sfxOn = saved.sfx !== false;
      }
    } catch { /* sin almacenamiento: valores por defecto */ }
  }

  private save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ music: this.musicOn, sfx: this.sfxOn })); } catch { /* ignorar */ }
  }

  /** Crea el contexto de audio. Debe llamarse dentro de un clic o toque. */
  unlock() {
    if (this.ctx) { void this.ctx.resume(); return; }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicOn ? 0.55 : 0;
    this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxOn ? 1 : 0;
    this.sfxBus.connect(this.master);

    // Ruido blanco de 1 s para la percusión.
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    // Onda de pulso al 25 %: el timbre clásico de las consolas de 8 bits.
    const N = 32, real = new Float32Array(N), imag = new Float32Array(N);
    for (let n = 1; n < N; n++) real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * 0.25);
    this.pulse = ctx.createPeriodicWave(real, imag);

    document.addEventListener("visibilitychange", this.onVisibility);
  }

  setMusic(on: boolean) {
    this.musicOn = on;
    this.save();
    if (this.ctx && this.musicBus) this.musicBus.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.05);
  }

  setSfx(on: boolean) {
    this.sfxOn = on;
    this.save();
    if (this.ctx && this.sfxBus) this.sfxBus.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.02);
  }

  /** Acelera la música (últimos segundos del examen). */
  setHurry(on: boolean) { this.hurry = on; }

  startMusic() {
    if (!this.ctx || this.playing) return;
    this.playing = true;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.agendar(), 25);
  }

  stopMusic() {
    this.playing = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  dispose() {
    this.stopMusic();
    document.removeEventListener("visibilitychange", this.onVisibility);
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
  }

  /* ───────────── música ───────────── */

  private agendar() {
    const ctx = this.ctx;
    if (!ctx || !this.playing) return;
    const dur = 60 / (this.hurry ? 160 : 128) / 2; // corchea
    while (this.nextTime < ctx.currentTime + 0.15) {
      this.nota(this.step, this.nextTime, dur);
      this.nextTime += dur;
      this.step = (this.step + 1) % LEAD.length;
    }
  }

  private nota(step: number, t: number, dur: number) {
    const bar = Math.floor(step / 8), pos = step % 8;
    const lead = LEAD[step];
    if (lead !== null) this.voz(hz(lead), t, dur * 0.9, "pulse", 0.1, this.musicBus!);
    if (pos === 0 || pos === 2 || pos === 6) this.voz(hz(BASS_ROOTS[bar]), t, dur * 1.7, "triangle", 0.2, this.musicBus!);
    if (pos === 4) this.voz(hz(BASS_ROOTS[bar] + 7), t, dur * 1.7, "triangle", 0.17, this.musicBus!);
    if (pos === 0 || pos === 4) this.bombo(t);
    if (pos === 2 || pos === 6) this.ruido(t, 0.09, 0.09, 1800, "bandpass");
    if (pos % 2 === 1) this.ruido(t, 0.03, 0.04, 7000, "highpass");
  }

  /* ───────────── síntesis ───────────── */

  private voz(freq: number, t: number, dur: number, tipo: "pulse" | OscillatorType, vol: number, bus: GainNode, hasta?: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    if (tipo === "pulse" && this.pulse) osc.setPeriodicWave(this.pulse);
    else osc.type = tipo === "pulse" ? "square" : tipo;
    osc.frequency.setValueAtTime(freq, t);
    if (hasta) osc.frequency.exponentialRampToValueAtTime(hasta, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private ruido(t: number, dur: number, vol: number, freq: number, filtro: BiquadFilterType) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = filtro;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.musicBus!);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  private bombo(t: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc.connect(g).connect(this.musicBus!);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  /* ───────────── efectos ───────────── */

  /** `nivel` sube el tono del acierto cuanto mayor es la racha. */
  sfx(nombre: Sfx, nivel = 0) {
    const ctx = this.ctx;
    if (!ctx || !this.sfxOn || !this.sfxBus) return;
    const t = ctx.currentTime + 0.01;
    const bus = this.sfxBus;
    const arpegio = (notas: number[], paso: number, tipo: "pulse" | OscillatorType = "pulse", vol = 0.16) =>
      notas.forEach((n, i) => this.voz(hz(n), t + i * paso, paso * 1.6, tipo, vol, bus));

    switch (nombre) {
      case "select": this.voz(hz(7), t, 0.05, "pulse", 0.12, bus); break;
      case "correct": arpegio([3 + nivel, 7 + nivel, 12 + nivel], 0.055); break;
      case "combo": arpegio([7, 12, 15, 19, 24], 0.05); break;
      case "wrong": this.voz(150, t, 0.26, "sawtooth", 0.16, bus, 55); break;
      case "tick": this.voz(hz(19), t, 0.04, "square", 0.1, bus); break;
      case "start": arpegio([-5, 0, 7, 12], 0.07); break;
      case "win": arpegio([0, 4, 7, 12, 7, 12, 16, 19], 0.1); break;
      case "lose": arpegio([7, 3, 0, -5], 0.16, "triangle", 0.2); break;
    }
  }
}
