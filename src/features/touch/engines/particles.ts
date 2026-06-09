// Experiencia "Partículas": campo de ~1300 partículas con bloom y blend aditivo.
// Físicas simples: deriva + repulsión del puntero. Render WebGL con PixiJS, sin React.
import {
  cssVar,
  type EngineOptions,
  type PointerSample,
  type TouchEngine,
} from './engine';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  driftX: number;
  driftY: number;
  r: number;
  sprite: import('pixi.js').Sprite | null;
}

const REPEL_RADIUS = 110;

/** Convierte "#rrggbb" → 0xRRGGBB; cae al fallback si no parsea. */
function hexToInt(s: string, fallback: number): number {
  const m = s.trim().match(/^#([0-9a-fA-F]{6})$/);
  return m ? parseInt(m[1], 16) : fallback;
}

/** Textura discoide blanca con alfa-falloff (se tinte por sprite). */
function makeGlowTexture(
  PIXIns: typeof import('pixi.js'),
): import('pixi.js').Texture {
  const SIZE = 64;
  const off = document.createElement('canvas');
  off.width = SIZE;
  off.height = SIZE;
  const c = off.getContext('2d');
  if (!c) throw new Error('particles: 2D context for glow texture unavailable');
  const grad = c.createRadialGradient(
    SIZE / 2,
    SIZE / 2,
    0,
    SIZE / 2,
    SIZE / 2,
    SIZE / 2,
  );
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = grad;
  c.fillRect(0, 0, SIZE, SIZE);
  return PIXIns.Texture.from(off);
}

export function createParticlesEngine({
  canvas,
  reducedMotion,
  sound,
}: EngineOptions): TouchEngine {
  let app: import('pixi.js').Application | null = null;
  let container: import('pixi.js').Container | null = null;
  let texture: import('pixi.js').Texture | null = null;

  let cssW = 1;
  let cssH = 1;
  let running = false;
  const particles: Particle[] = [];
  let pointer: PointerSample | null = null;
  let tickerFn: (() => void) | null = null;

  const count = reducedMotion ? 700 : 1300;
  const driftScale = reducedMotion ? 0.26 : 0.45;

  function palette(): number[] {
    return [
      hexToInt(cssVar('--sa-lav-300', '#b8a6d9'), 0xb8a6d9),
      hexToInt(cssVar('--sa-lav-500', '#7b68a6'), 0x7b68a6),
      hexToInt(cssVar('--sa-mint', '#c5d5c0'), 0xc5d5c0),
      hexToInt(cssVar('--sa-mint-deep', '#7b9477'), 0x7b9477),
    ];
  }

  function seed(
    PIXIns: typeof import('pixi.js'),
    parent: import('pixi.js').Container,
  ): void {
    if (!texture) return;
    particles.length = 0;
    const pal = palette();
    for (let i = 0; i < count; i++) {
      const driftX = (Math.random() - 0.5) * driftScale;
      const driftY = (Math.random() - 0.5) * driftScale;
      const r = 1.5 + Math.random() * 3.5;
      const sprite = new PIXIns.Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.tint = pal[i % pal.length];
      sprite.alpha = 0.7;
      sprite.width = sprite.height = r * 5; // disco glow más grande que el "core"
      sprite.x = Math.random() * cssW;
      sprite.y = Math.random() * cssH;
      sprite.blendMode = 'add';
      parent.addChild(sprite);
      particles.push({
        x: sprite.x,
        y: sprite.y,
        vx: driftX,
        vy: driftY,
        driftX,
        driftY,
        r,
        sprite,
      });
    }
  }

  function tick(): void {
    for (const p of particles) {
      if (pointer) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < REPEL_RADIUS * REPEL_RADIUS && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const force = (1 - d / REPEL_RADIUS) * (reducedMotion ? 1.6 : 2.6);
          p.vx += (dx / d) * force;
          p.vy += (dy / d) * force;
        }
      }
      // Regreso suave a la velocidad de deriva (easing).
      p.vx += (p.driftX - p.vx) * 0.04;
      p.vy += (p.driftY - p.vy) * 0.04;
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -p.r) p.x = cssW + p.r;
      else if (p.x > cssW + p.r) p.x = -p.r;
      if (p.y < -p.r) p.y = cssH + p.r;
      else if (p.y > cssH + p.r) p.y = -p.r;
      if (p.sprite) {
        p.sprite.x = p.x;
        p.sprite.y = p.y;
      }
    }
  }

  return {
    start(): void {
      if (running) return;
      running = true;
      void Promise.all([import('pixi.js'), import('pixi-filters')]).then(
        async ([PIXIns, FILTERSns]) => {
          if (!running) return;
          const a = new PIXIns.Application();
          await a.init({
            canvas,
            width: cssW,
            height: cssH,
            backgroundAlpha: 0,
            antialias: true,
            resolution: Math.min(window.devicePixelRatio || 1, 2),
            autoDensity: true,
          });
          if (!running) {
            a.destroy(false);
            return;
          }
          app = a;
          texture = makeGlowTexture(PIXIns);
          const c = new PIXIns.Container();
          const bloom = new FILTERSns.AdvancedBloomFilter({
            threshold: 0,
            bloomScale: 1.0,
            brightness: 1.0,
            blur: 5,
            quality: 4,
          });
          c.filters = [bloom];
          a.stage.addChild(c);
          container = c;
          seed(PIXIns, c);
          tickerFn = () => tick();
          a.ticker.add(tickerFn);
        },
      );
    },

    stop(): void {
      running = false;
      pointer = null;
      if (app && tickerFn) app.ticker.remove(tickerFn);
      tickerFn = null;
      if (container) {
        try {
          container.destroy({ children: true });
        } catch {
          /* ignore */
        }
      }
      container = null;
      if (texture) {
        try {
          texture.destroy(true);
        } catch {
          /* ignore */
        }
      }
      texture = null;
      if (app) {
        try {
          // false: NO quitar el canvas del DOM (es de React, no de Pixi).
          app.destroy(false, { children: true, texture: true });
        } catch {
          /* ignore */
        }
      }
      app = null;
      particles.length = 0;
    },

    resize(width: number, height: number, _ratio: number): void {
      cssW = Math.max(1, width);
      cssH = Math.max(1, height);
      if (app) {
        try {
          app.renderer.resize(cssW, cssH);
        } catch {
          /* ignore */
        }
      }
    },

    pointerDown(p: PointerSample): void {
      pointer = p;
      sound?.tone();
    },

    pointerMove(p: PointerSample): void {
      pointer = p;
      sound?.tone();
    },

    pointerUp(): void {
      pointer = null;
    },
  };
}
