/* SerenApp · RF1 — experiencia "Constelación" (renderizado con PixiJS/WebGL).
 *
 * Cielo nocturno con bloom real:
 *  - ~180 estrellas de fondo que titilan y derivan muy lento.
 *  - El usuario coloca estrellas grandes con glow (toque + campana).
 *  - Arrastre conecta estrellas con líneas suaves.
 *  - Las estrellas/líneas se desvanecen para no saturar.
 */
import {
  cssVar,
  type EngineOptions,
  type PointerSample,
  type TouchEngine,
} from './engine';

interface UserStar {
  x: number;
  y: number;
  r: number;
  born: number;
  alpha: number;
  sprite: import('pixi.js').Sprite | null;
}

interface Link {
  from: UserStar;
  to: UserStar;
}

interface BgStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  speed: number;
  base: number;
  sprite: import('pixi.js').Sprite | null;
}

const HOLD_MS = 5000;
const FADE_MS = 3000;
const STEP_PX = 30;

function hexToInt(s: string, fallback: number): number {
  const m = s.trim().match(/^#([0-9a-fA-F]{6})$/);
  return m ? parseInt(m[1], 16) : fallback;
}

/** Textura de estrella: disco blanco con falloff suave (se tinta por sprite). */
function makeStarTexture(
  PIXIns: typeof import('pixi.js'),
): import('pixi.js').Texture {
  const SIZE = 96;
  const off = document.createElement('canvas');
  off.width = SIZE;
  off.height = SIZE;
  const c = off.getContext('2d');
  if (!c) throw new Error('constellation: 2D context unavailable');
  const g = c.createRadialGradient(
    SIZE / 2,
    SIZE / 2,
    0,
    SIZE / 2,
    SIZE / 2,
    SIZE / 2,
  );
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, SIZE, SIZE);
  return PIXIns.Texture.from(off);
}

export function createConstellationEngine({
  canvas,
  reducedMotion,
  sound,
}: EngineOptions): TouchEngine {
  let app: import('pixi.js').Application | null = null;
  let starTex: import('pixi.js').Texture | null = null;
  let bgContainer: import('pixi.js').Container | null = null;
  let userContainer: import('pixi.js').Container | null = null;
  let linksGfx: import('pixi.js').Graphics | null = null;

  let cssW = 1;
  let cssH = 1;
  let running = false;
  let tickerFn: (() => void) | null = null;

  const bg: BgStar[] = [];
  const stars: UserStar[] = [];
  const links: Link[] = [];
  const userLavTint = () => hexToInt(cssVar('--sa-lav-300', '#b8a6d9'), 0xb8a6d9);
  const linkColor = () => hexToInt(cssVar('--sa-lav-300', '#b8a6d9'), 0xb8a6d9);

  let dragging = false;
  let lastInPath: UserStar | null = null;

  let pixiNs: typeof import('pixi.js') | null = null;

  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  function seedBackground(): void {
    if (!pixiNs || !bgContainer || !starTex) return;
    // Limpia sprites existentes.
    for (const s of bg) {
      if (s.sprite) {
        try {
          s.sprite.destroy();
        } catch {
          /* ignore */
        }
      }
    }
    bg.length = 0;
    const density = reducedMotion ? 9000 : 6000;
    const totalArea = cssW * cssH;
    const cnt = Math.max(24, Math.floor(totalArea / density));
    for (let i = 0; i < cnt; i++) {
      const r = rand(0.5, 1.6);
      const sprite = new pixiNs.Sprite(starTex);
      sprite.anchor.set(0.5);
      sprite.width = sprite.height = r * 5;
      sprite.tint = 0xffffff;
      sprite.x = rand(0, cssW);
      sprite.y = rand(0, cssH);
      sprite.alpha = 0.5;
      bgContainer.addChild(sprite);
      bg.push({
        x: sprite.x,
        y: sprite.y,
        vx: rand(-3, 3) / 1000,
        vy: rand(-2, 2) / 1000,
        phase: rand(0, Math.PI * 2),
        speed: rand(0.6, 1.6) * (reducedMotion ? 0.4 : 1),
        base: rand(0.25, 0.7),
        sprite,
      });
    }
  }

  function placeStar(x: number, y: number): UserStar | null {
    if (!pixiNs || !userContainer || !starTex) return null;
    const r = rand(2.2, 3.6);
    const sprite = new pixiNs.Sprite(starTex);
    sprite.anchor.set(0.5);
    // Glow visible (mucho mayor que el "core" lógico).
    sprite.width = sprite.height = r * 10;
    sprite.tint = userLavTint();
    sprite.alpha = 0;
    sprite.x = x;
    sprite.y = y;
    sprite.blendMode = 'add';
    userContainer.addChild(sprite);
    const star: UserStar = { x, y, r, born: Date.now(), alpha: 0, sprite };
    stars.push(star);
    sound?.chime();
    return star;
  }

  function tick(): void {
    const t = Date.now();
    const tw = t / 1000;

    // Estrellas de fondo: deriva + titileo (alfa).
    const twAmp = reducedMotion ? 0.12 : 0.3;
    for (const s of bg) {
      s.x += s.vx;
      s.y += s.vy;
      if (s.x < 0) s.x += cssW;
      else if (s.x > cssW) s.x -= cssW;
      if (s.y < 0) s.y += cssH;
      else if (s.y > cssH) s.y -= cssH;
      const a = s.base + twAmp * Math.sin(tw * s.speed + s.phase);
      if (s.sprite) {
        s.sprite.x = s.x;
        s.sprite.y = s.y;
        s.sprite.alpha = Math.max(0, Math.min(1, a));
      }
    }

    // Caduca estrellas y calcula alpha por edad.
    for (let i = stars.length - 1; i >= 0; i--) {
      const st = stars[i];
      const age = t - st.born;
      if (age >= HOLD_MS + FADE_MS) {
        if (st.sprite) {
          try {
            st.sprite.destroy();
          } catch {
            /* ignore */
          }
        }
        stars.splice(i, 1);
        continue;
      }
      st.alpha =
        age < 250
          ? age / 250
          : age < HOLD_MS
            ? 1
            : 1 - (age - HOLD_MS) / FADE_MS;
      if (st.sprite) st.sprite.alpha = st.alpha;
    }
    // Quita links cuyos extremos ya no existen.
    for (let i = links.length - 1; i >= 0; i--) {
      if (!stars.includes(links[i].from) || !stars.includes(links[i].to)) {
        links.splice(i, 1);
      }
    }

    // Líneas de la constelación.
    if (linksGfx) {
      linksGfx.clear();
      for (const l of links) {
        const a = Math.min(l.from.alpha, l.to.alpha) * 0.6;
        if (a <= 0) continue;
        linksGfx
          .moveTo(l.from.x, l.from.y)
          .lineTo(l.to.x, l.to.y)
          .stroke({ color: linkColor(), width: 1, alpha: a });
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
          pixiNs = PIXIns;
          const a = new PIXIns.Application();
          await a.init({
            canvas,
            width: cssW,
            height: cssH,
            background: 0x171327, // índigo profundo (nocturno)
            backgroundAlpha: 1,
            antialias: true,
            resolution: Math.min(window.devicePixelRatio || 1, 2),
            autoDensity: true,
          });
          if (!running) {
            a.destroy(false);
            return;
          }
          app = a;
          starTex = makeStarTexture(PIXIns);

          // Capa de fondo (sin bloom intenso, sutil).
          const bgC = new PIXIns.Container();
          a.stage.addChild(bgC);
          bgContainer = bgC;

          // Capa de líneas (debajo de estrellas usuario).
          const rip = new PIXIns.Graphics();
          a.stage.addChild(rip);
          linksGfx = rip;

          // Capa de estrellas del usuario con bloom fuerte.
          const userC = new PIXIns.Container();
          const bloom = new FILTERSns.AdvancedBloomFilter({
            threshold: 0,
            bloomScale: 1.4,
            brightness: 1.0,
            blur: 7,
            quality: 4,
          });
          userC.filters = [bloom];
          a.stage.addChild(userC);
          userContainer = userC;

          seedBackground();
          tickerFn = () => tick();
          a.ticker.add(tickerFn);
        },
      );
    },

    stop(): void {
      running = false;
      if (app && tickerFn) app.ticker.remove(tickerFn);
      tickerFn = null;
      bg.length = 0;
      stars.length = 0;
      links.length = 0;
      dragging = false;
      lastInPath = null;
      if (bgContainer) {
        try {
          bgContainer.destroy({ children: true });
        } catch {
          /* ignore */
        }
      }
      bgContainer = null;
      if (userContainer) {
        try {
          userContainer.destroy({ children: true });
        } catch {
          /* ignore */
        }
      }
      userContainer = null;
      if (linksGfx) {
        try {
          linksGfx.destroy();
        } catch {
          /* ignore */
        }
      }
      linksGfx = null;
      if (starTex) {
        try {
          starTex.destroy(true);
        } catch {
          /* ignore */
        }
      }
      starTex = null;
      if (app) {
        try {
          // false: NO quitar el canvas del DOM (es de React, no de Pixi).
          app.destroy(false, { children: true, texture: true });
        } catch {
          /* ignore */
        }
      }
      app = null;
      pixiNs = null;
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
      // Si el fondo ya estaba sembrado, re-distribuirlo.
      if (bg.length > 0) seedBackground();
    },

    pointerDown(p: PointerSample): void {
      dragging = true;
      lastInPath = placeStar(p.x, p.y);
    },

    pointerMove(p: PointerSample): void {
      if (!dragging || !lastInPath) return;
      const dx = p.x - lastInPath.x;
      const dy = p.y - lastInPath.y;
      if (dx * dx + dy * dy < STEP_PX * STEP_PX) return;
      const next = placeStar(p.x, p.y);
      if (next) {
        links.push({ from: lastInPath, to: next });
        lastInPath = next;
      }
    },

    pointerUp(): void {
      dragging = false;
      lastInPath = null;
    },
  };
}
