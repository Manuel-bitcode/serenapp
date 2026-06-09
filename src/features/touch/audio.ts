// Audio de la pantalla Siente.
// Música de fondo en loop + sfx por interacción cargados desde mp3 (con fallback
// procedural si no cargan). Todo pasa por un master gain para el mute global.
// El AudioContext arranca en el primer gesto por la política de autoplay.

export interface TouchSound {
  /** Crea/reanuda el AudioContext. Llamar en el primer gesto. */
  resume(): void;
  startAmbient(): void;
  stopAmbient(): void;
  setMuted(muted: boolean): void;
  /** Arena: grano. */
  grain(): void;
  /** Burbuja: pop. */
  pop(): void;
  /** Estrella: campana (con transposición pentatónica). */
  chime(): void;
  /** Partículas: soplido aireado. */
  tone(): void;
  /** Libera todo (cerrar contexto). */
  dispose(): void;
}

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

const SFX_FILES = {
  grain: '/audio/sfx/grain.mp3',
  pop: '/audio/sfx/pop.mp3',
  chime: '/audio/sfx/chime.mp3',
  whoosh: '/audio/sfx/whoosh.mp3',
} as const;
type SfxKey = keyof typeof SFX_FILES;

// pentatónica mayor (ratios) para variar el tono de la campana sin re-sintetizar
const CHIME_RATIOS = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3];

// pentatónica en Hz (C5), solo para el fallback procedural
const PENTATONIC_HZ = [523.25, 587.33, 698.46, 783.99, 880.0];

export function createTouchAudio(initialMuted = false): TouchSound {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let muted = initialMuted;

  let ambient: {
    audio: HTMLAudioElement;
    src: MediaElementAudioSourceNode;
    gain: GainNode;
  } | null = null;

  /** Buffer de ruido blanco reutilizable (solo para fallbacks procedurales). */
  let noiseBuffer: AudioBuffer | null = null;
  /** SFX cargados desde MP3; lo que falte se sustituye por el fallback procedural. */
  const sfxBuffers: Partial<Record<SfxKey, AudioBuffer>> = {};
  let sfxLoading = false;

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
    // ruido blanco para fallbacks (decoders fallidos o archivos ausentes).
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffer = buf;
    // arrancar carga de los 4 SFX en paralelo (no bloquea).
    void loadSfx();
    return true;
  }

  async function loadSfx(): Promise<void> {
    if (sfxLoading || !ctx) return;
    sfxLoading = true;
    const entries = Object.entries(SFX_FILES) as [SfxKey, string][];
    await Promise.all(
      entries.map(async ([key, url]) => {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const ab = await res.arrayBuffer();
          if (!ctx) return; // se cerró el contexto mientras cargaba
          const buf = await ctx.decodeAudioData(ab);
          sfxBuffers[key] = buf;
        } catch {
          /* silencio: si falla, queda el fallback procedural */
        }
      }),
    );
  }

  function now(): number {
    return ctx ? ctx.currentTime : 0;
  }

  /** Reproduce un sample del buffer cacheado. Devuelve true si lo logró. */
  function playSample(key: SfxKey, peak: number, rate = 1): boolean {
    const buf = sfxBuffers[key];
    if (!buf || !ctx || !master) return false;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = peak;
    src.connect(g);
    g.connect(master);
    src.start(0);
    return true;
  }

  return {
    resume(): void {
      if (!ensure() || !ctx) return;
      if (ctx.state === 'suspended') void ctx.resume();
    },

    startAmbient(): void {
      if (!ensure() || !ctx || !master || ambient) return;

      const audio = new Audio('/audio/lavender-meter.mp3');
      audio.loop = true;
      audio.preload = 'auto';

      const gain = ctx.createGain();
      gain.gain.value = 0.0001;
      gain.gain.linearRampToValueAtTime(0.7, now() + 2.5);

      const src = ctx.createMediaElementSource(audio);
      src.connect(gain);
      gain.connect(master);

      ambient = { audio, src, gain };
      void audio.play().catch(() => {
        /* política de autoplay: ignorar; el próximo gesto reintentará */
      });
    },

    stopAmbient(): void {
      if (!ctx || !ambient) return;
      const a = ambient;
      ambient = null;
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
      if (muted || !ensure() || !ctx || !master) return;
      const t = now();
      if (t - lastGrain < 0.055) return; // throttle del arrastre
      lastGrain = t;
      // Sample real (si está cargado), con leve variación de tono.
      if (playSample('grain', 0.4, 0.85 + Math.random() * 0.3)) return;
      // Fallback procedural: ruido bandpass corto.
      if (!noiseBuffer) return;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      src.loop = true;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 900 + Math.random() * 1600;
      band.Q.value = 0.9;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.015, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      src.connect(band);
      band.connect(g);
      g.connect(master);
      src.start(t);
      src.stop(t + 0.1);
    },

    pop(): void {
      if (muted || !ensure() || !ctx || !master) return;
      // Sample real con micro variación de tono para que tap-tap-tap no suene clonado.
      if (playSample('pop', 0.5, 0.92 + Math.random() * 0.13)) return;
      // Fallback procedural: sine con caída de tono.
      const t = now();
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(440, t);
      o.frequency.exponentialRampToValueAtTime(170, t + 0.12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.03, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 0.18);
    },

    chime(): void {
      if (muted || !ensure() || !ctx || !master) return;
      // Sample real transpuesto a un grado pentatónico aleatorio → variedad musical.
      const rate = CHIME_RATIOS[Math.floor(Math.random() * CHIME_RATIOS.length)];
      if (playSample('chime', 0.5, rate)) return;
      // Fallback procedural: dos parciales tipo campana.
      const t = now();
      const freq =
        PENTATONIC_HZ[Math.floor(Math.random() * PENTATONIC_HZ.length)];
      for (const [mult, peak] of [
        [1, 0.03],
        [2.01, 0.012],
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
      if (muted || !ensure() || !ctx || !master) return;
      const t = now();
      if (t - lastTone < 0.09) return;
      lastTone = t;
      // Sample real (whoosh) con leve variación de tono.
      if (playSample('whoosh', 0.35, 0.9 + Math.random() * 0.2)) return;
      // Fallback procedural: soplido (ruido lowpass que decae).
      if (!noiseBuffer) return;
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
      g.gain.linearRampToValueAtTime(0.01, t + 0.04);
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
        for (const k of Object.keys(sfxBuffers) as SfxKey[]) {
          delete sfxBuffers[k];
        }
        sfxLoading = false;
        setTimeout(() => void c.close(), 800);
      }
    },
  };
}
