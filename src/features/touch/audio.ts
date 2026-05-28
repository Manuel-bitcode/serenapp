/* SerenApp · RF1 — audio procedural del módulo "Siente".
 *
 * Todo se genera con la Web Audio API (sin archivos → 100% offline, RNF3):
 *   - pad ambiental relajante (osciladores suaves + filtro + LFO lento)
 *   - sonidos por interacción: granos de arena, pop de burbuja, campana de estrella, tono
 *
 * El AudioContext se crea/resume tras el primer gesto del usuario (política de autoplay).
 * Los motores reciben un TouchSound y disparan los efectos; no saben de Web Audio.
 */

export interface TouchSound {
  /** Crea/reanuda el AudioContext. Llamar en el primer gesto. */
  resume(): void;
  startAmbient(): void;
  stopAmbient(): void;
  setMuted(muted: boolean): void;
  /** Arena: grano de ruido filtrado (rate-limited). */
  grain(): void;
  /** Burbuja: blip corto con caída de tono. */
  pop(): void;
  /** Estrella: campana de escala pentatónica. */
  chime(): void;
  /** Partículas: tono muy suave (rate-limited). */
  tone(): void;
  /** Libera todo (cerrar contexto). */
  dispose(): void;
}

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

const PENTATONIC = [523.25, 587.33, 698.46, 783.99, 880.0]; // C5 mayor pentatónica

export function createTouchAudio(initialMuted = false): TouchSound {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let muted = initialMuted;

  // Música de fondo: pista MP3 (Lavender Meter) en loop, ruteada por el master gain
  // para que el botón de silencio y los fades sigan aplicando.
  let ambient: {
    audio: HTMLAudioElement;
    src: MediaElementAudioSourceNode;
    gain: GainNode;
  } | null = null;

  let noiseBuffer: AudioBuffer | null = null;
  let lastGrain = 0;
  let lastTone = 0;

  function ensure(): boolean {
    if (ctx) return true;
    const Ctor =
      window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!Ctor) return false;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    // Buffer de ruido blanco reutilizable (1 s).
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffer = buf;
    return true;
  }

  function now(): number {
    return ctx ? ctx.currentTime : 0;
  }

  return {
    resume(): void {
      if (!ensure() || !ctx) return;
      if (ctx.state === 'suspended') void ctx.resume();
    },

    startAmbient(): void {
      if (!ensure() || !ctx || !master || ambient) return;

      // Pista generada en Suno; vive en public/audio/ y se sirve desde la raíz.
      const audio = new Audio('/audio/lavender-meter.mp3');
      audio.loop = true; // se reinicia automáticamente al terminar
      audio.preload = 'auto';

      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      // Fade-in suave para no entrar de golpe.
      gain.gain.linearRampToValueAtTime(0.7, now() + 2.5);

      const src = ctx.createMediaElementSource(audio);
      src.connect(gain);
      gain.connect(master);

      ambient = { audio, src, gain };
      // play() puede rechazar si aún no hubo gesto; el primer toque ya llamó a resume(),
      // así que normalmente arranca. Si rechaza, lo intentará el próximo toque.
      void audio.play().catch(() => {
        /* política de autoplay: ignorar; reintentar al siguiente gesto */
      });
    },

    stopAmbient(): void {
      if (!ctx || !ambient) return;
      const a = ambient;
      ambient = null;
      // Fade-out suave y luego pausa + desconexión.
      a.gain.gain.cancelScheduledValues(now());
      a.gain.gain.setValueAtTime(Math.max(0.0001, a.gain.gain.value), now());
      a.gain.gain.linearRampToValueAtTime(0.0001, now() + 0.6);
      setTimeout(() => {
        try {
          a.audio.pause();
        } catch {
          /* ignore */
        }
        try {
          a.src.disconnect();
          a.gain.disconnect();
        } catch {
          /* ignore */
        }
      }, 700);
    },

    setMuted(next: boolean): void {
      muted = next;
      if (!master || !ctx) return;
      master.gain.cancelScheduledValues(now());
      master.gain.linearRampToValueAtTime(muted ? 0 : 1, now() + 0.15);
    },

    grain(): void {
      if (muted || !ensure() || !ctx || !master || !noiseBuffer) return;
      const t = now();
      if (t - lastGrain < 0.055) return; // throttle del arrastre
      lastGrain = t;

      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      src.loop = true;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 900 + Math.random() * 1600;
      band.Q.value = 0.9;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.03, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      src.connect(band);
      band.connect(g);
      g.connect(master);
      src.start(t);
      src.stop(t + 0.1);
    },

    pop(): void {
      if (muted || !ensure() || !ctx || !master) return;
      const t = now();
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(440, t);
      o.frequency.exponentialRampToValueAtTime(170, t + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.07, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 0.18);
    },

    chime(): void {
      if (muted || !ensure() || !ctx || !master) return;
      const t = now();
      const freq = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
      // dos parciales para un timbre tipo campana
      for (const [mult, peak] of [
        [1, 0.06],
        [2.01, 0.025],
      ] as const) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = freq * mult;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(peak, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
        o.connect(g);
        g.connect(master);
        o.start(t);
        o.stop(t + 0.95);
      }
    },

    tone(): void {
      // Partículas: soplido de aire suave (ruido filtrado que decae), no un "beep".
      if (muted || !ensure() || !ctx || !master || !noiseBuffer) return;
      const t = now();
      if (t - lastTone < 0.09) return;
      lastTone = t;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      const f0 = 900 + Math.random() * 700;
      lp.frequency.setValueAtTime(f0, t);
      lp.frequency.exponentialRampToValueAtTime(Math.max(220, f0 * 0.5), t + 0.3);
      lp.Q.value = 0.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.018, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      src.connect(lp);
      lp.connect(g);
      g.connect(master);
      src.start(t);
      src.stop(t + 0.36);
    },

    dispose(): void {
      this.stopAmbient();
      if (ctx) {
        const c = ctx;
        ctx = null;
        master = null;
        noiseBuffer = null;
        setTimeout(() => void c.close(), 800);
      }
    },
  };
}
