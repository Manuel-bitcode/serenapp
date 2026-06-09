// Experiencia "Burbujas": física con matter.js, render WebGL con PixiJS.
// El bloom da el glow tipo "luz dentro del agua". Cada cuerpo de matter tiene un
// sprite vinculado; al tocar una burbuja se elimina y queda un ripple que se desvanece.
import type Matter from 'matter-js';
import {
  cssVar,
  type EngineOptions,
  type PointerSample,
  type TouchEngine,
} from './engine';

type MatterNS = typeof Matter;

interface PopRipple {
  x: number;
  y: number;
  r: number;
  /** 0→1 progreso de animación. */
  t: number;
}

const MIN_BUBBLES = 8;
const MAX_BUBBLES = 12;
const SPAWN_MS = 1400;

function hexToInt(s: string, fallback: number): number {
  const m = s.trim().match(/^#([0-9a-fA-F]{6})$/);
  return m ? parseInt(m[1], 16) : fallback;
}

/** Textura de burbuja: degradado radial lavanda + reflejo especular blanco. */
function makeBubbleTexture(
  PIXIns: typeof import('pixi.js'),
): import('pixi.js').Texture {
  const SIZE = 128;
  const off = document.createElement('canvas');
  off.width = SIZE;
  off.height = SIZE;
  const c = off.getContext('2d');
  if (!c) throw new Error('bubbles: 2D context for texture unavailable');
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  // cuerpo: brillo central → lavanda → transparente
  const body = c.createRadialGradient(
    cx - SIZE * 0.18,
    cy - SIZE * 0.18,
    SIZE * 0.05,
    cx,
    cy,
    SIZE / 2,
  );
  body.addColorStop(0, 'rgba(255,255,255,0.55)');
  body.addColorStop(0.55, 'rgba(184,166,217,0.4)');
  body.addColorStop(1, 'rgba(123,104,166,0)');
  c.fillStyle = body;
  c.beginPath();
  c.arc(cx, cy, SIZE / 2, 0, Math.PI * 2);
  c.fill();
  // contorno tenue
  c.strokeStyle = 'rgba(255,255,255,0.35)';
  c.lineWidth = 1.5;
  c.stroke();
  // reflejo especular
  c.beginPath();
  c.arc(cx - SIZE * 0.18, cy - SIZE * 0.18, SIZE * 0.09, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,255,255,0.65)';
  c.fill();
  return PIXIns.Texture.from(off);
}

export function createBubblesEngine({
  canvas,
  reducedMotion,
  sound,
}: EngineOptions): TouchEngine {
  let app: import('pixi.js').Application | null = null;
  let container: import('pixi.js').Container | null = null;
  let ripplesGfx: import('pixi.js').Graphics | null = null;
  let texture: import('pixi.js').Texture | null = null;

  let M: MatterNS | null = null;
  let engine: Matter.Engine | null = null;

  let cssW = 1;
  let cssH = 1;
  let running = false;
  let spawnTimer: ReturnType<typeof setInterval> | null = null;
  let tickerFn: (() => void) | null = null;
  const bubbles: { body: Matter.Body; sprite: import('pixi.js').Sprite }[] = [];
  const pops: PopRipple[] = [];

  const lavTint = () => hexToInt(cssVar('--sa-lav-300', '#b8a6d9'), 0xb8a6d9);
  const ripStroke = () => hexToInt(cssVar('--sa-lav-500', '#7b68a6'), 0x7b68a6);

  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  function spawnBubble(atY?: number): void {
    if (!M || !engine) return;
    const radius = rand(16, 42);
    const x = rand(radius, Math.max(radius, cssW - radius));
    const y = atY ?? cssH + radius + rand(0, 80);
    const body = M.Bodies.circle(x, y, radius, {
      restitution: 0.6,
      friction: 0.001,
      // frictionAir alto = más arrastre = suben lento y flotando.
      frictionAir: 0.04,
      density: 0.0006,
      label: 'bubble',
    });
    bubbles.push({ body, sprite: spriteFor(body, radius) });
    M.Composite.add(engine.world, body);
  }

  // Helper que necesita acceso a PIXIns; lo cierro con una variable seteada en start().
  // (Se sobreescribe al iniciar Pixi.)
  let spriteFor: (body: Matter.Body, radius: number) => import('pixi.js').Sprite =
    () => {
      throw new Error('spriteFor not initialized');
    };

  function removeBubble(idx: number): void {
    if (!M || !engine) return;
    const b = bubbles[idx];
    if (!b) return;
    try {
      b.sprite.destroy();
    } catch {
      /* ignore */
    }
    M.Composite.remove(engine.world, b.body);
    bubbles.splice(idx, 1);
  }

  function popAt(idx: number): void {
    const b = bubbles[idx];
    if (!b) return;
    pops.push({
      x: b.body.position.x,
      y: b.body.position.y,
      r: b.body.circleRadius ?? 20,
      t: 0,
    });
    removeBubble(idx);
    sound?.pop();
  }

  function applyBuoyancy(): void {
    if (!M) return;
    const lift = reducedMotion ? 0.0003 : 0.0006;
    const jitter = reducedMotion ? 0.00012 : 0.0003;
    for (const { body } of bubbles) {
      M.Body.applyForce(body, body.position, {
        x: (Math.random() - 0.5) * jitter * body.mass,
        y: -lift * body.mass,
      });
    }
  }

  function recycle(): void {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const { body } = bubbles[i];
      const r = body.circleRadius ?? 20;
      if (body.position.y < -r - 60) removeBubble(i);
    }
    while (bubbles.length < MIN_BUBBLES) spawnBubble();
  }

  function drawRipples(): void {
    if (!ripplesGfx) return;
    ripplesGfx.clear();
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      p.t += 0.06;
      if (p.t >= 1) {
        pops.splice(i, 1);
        continue;
      }
      const r = p.r * (1 + p.t * 1.6);
      const alpha = 0.5 * (1 - p.t);
      ripplesGfx
        .circle(p.x, p.y, r)
        .stroke({ color: ripStroke(), width: 2 * (1 - p.t), alpha });
    }
  }

  function frame(): void {
    if (!M || !engine) return;
    applyBuoyancy();
    M.Engine.update(engine, 1000 / 60);
    recycle();
    // sincroniza sprites con cuerpos
    for (const { body, sprite } of bubbles) {
      sprite.x = body.position.x;
      sprite.y = body.position.y;
      sprite.rotation = body.angle;
    }
    drawRipples();
  }

  return {
    start(): void {
      if (running) return;
      running = true;
      void Promise.all([
        import('pixi.js'),
        import('pixi-filters'),
        import('matter-js'),
      ]).then(async ([PIXIns, FILTERSns, matterMod]) => {
        if (!running) return;
        M = ((matterMod as unknown as { default?: MatterNS }).default ??
          (matterMod as unknown as MatterNS)) as MatterNS;
        engine = M.Engine.create();
        engine.gravity.y = reducedMotion ? 0.1 : 0.2;
        engine.gravity.scale = 0.001;

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
        texture = makeBubbleTexture(PIXIns);
        const c = new PIXIns.Container();
        const bloom = new FILTERSns.AdvancedBloomFilter({
          threshold: 0.35,
          bloomScale: 0.9,
          brightness: 1.0,
          blur: 4,
          quality: 4,
        });
        c.filters = [bloom];
        a.stage.addChild(c);
        container = c;

        // Capa de ripples encima (sin bloom intenso).
        const rip = new PIXIns.Graphics();
        a.stage.addChild(rip);
        ripplesGfx = rip;

        // Configura el helper que crea Sprites con el Pixi ya cargado.
        spriteFor = (body: Matter.Body, radius: number) => {
          const s = new PIXIns.Sprite(texture!);
          s.anchor.set(0.5);
          s.tint = lavTint();
          s.alpha = 0.95;
          // Sprite ligeramente mayor que el cuerpo para que el bloom no se corte.
          s.width = s.height = radius * 2.2;
          s.x = body.position.x;
          s.y = body.position.y;
          c.addChild(s);
          return s;
        };

        for (let i = 0; i < MIN_BUBBLES; i++) {
          spawnBubble(rand(cssH * 0.3, cssH));
        }
        spawnTimer = setInterval(
          () => {
            if (bubbles.length < MAX_BUBBLES) spawnBubble();
          },
          reducedMotion ? SPAWN_MS * 2 : SPAWN_MS,
        );

        tickerFn = () => frame();
        a.ticker.add(tickerFn);
      });
    },

    stop(): void {
      running = false;
      if (spawnTimer) clearInterval(spawnTimer);
      spawnTimer = null;
      if (app && tickerFn) app.ticker.remove(tickerFn);
      tickerFn = null;
      if (M && engine) {
        M.Composite.clear(engine.world, false);
        M.Engine.clear(engine);
      }
      engine = null;
      M = null;
      bubbles.length = 0;
      pops.length = 0;
      if (container) {
        try {
          container.destroy({ children: true });
        } catch {
          /* ignore */
        }
      }
      container = null;
      if (ripplesGfx) {
        try {
          ripplesGfx.destroy();
        } catch {
          /* ignore */
        }
      }
      ripplesGfx = null;
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
      // Estalla la burbuja más al frente con +12px de tolerancia.
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const { body } = bubbles[i];
        const r = body.circleRadius ?? 20;
        const hit = r + 12;
        const dx = p.x - body.position.x;
        const dy = p.y - body.position.y;
        if (dx * dx + dy * dy <= hit * hit) {
          popAt(i);
          return;
        }
      }
    },

    pointerMove(): void {
      /* burbujas solo reaccionan al tap */
    },

    pointerUp(): void {
      /* sin estado de arrastre */
    },
  };
}
