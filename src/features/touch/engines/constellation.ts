/* SerenApp · RF1 — experiencia "Constelación".
 *
 * Un cielo nocturno que respira: estrellas de fondo que titilan y derivan muy lento.
 * Tocar coloca una estrella (con una campana); arrastrar va colocando estrellas a
 * intervalos y las une con líneas suaves (dibujas una constelación con el dedo). Las
 * estrellas y líneas que colocas se desvanecen lentamente para no saturar el cielo.
 * Canvas puro + requestAnimationFrame; sin React.
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
}

interface Link {
  from: UserStar;
  to: UserStar;
}

interface BgStar {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  phase: number;
  speed: number;
  base: number;
}

const HOLD_MS = 5000;
const FADE_MS = 3000;
/** Distancia mínima entre estrellas al arrastrar (px CSS). */
const STEP_PX = 30;

export function createConstellationEngine({
  canvas,
  reducedMotion,
  sound,
}: EngineOptions): TouchEngine {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('constellation: 2D context unavailable');
  const render = ctx;

  let cssW = 1;
  let cssH = 1;
  let raf = 0;
  let running = false;

  const bg: BgStar[] = [];
  const stars: UserStar[] = [];
  const links: Link[] = [];

  // Estado de arrastre: última estrella colocada en el trazo actual.
  let dragging = false;
  let lastInPath: UserStar | null = null;

  const lav = () => cssVar('--sa-lav-300', '#b8a6d9');

  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  function seedBackground(): void {
    bg.length = 0;
    const density = reducedMotion ? 9000 : 6000;
    const count = Math.max(24, Math.floor((cssW * cssH) / density));
    for (let i = 0; i < count; i++) {
      bg.push({
        x: rand(0, cssW),
        y: rand(0, cssH),
        r: rand(0.5, 1.6),
        vx: rand(-3, 3) / 1000,
        vy: rand(-2, 2) / 1000,
        phase: rand(0, Math.PI * 2),
        speed: rand(0.6, 1.6) * (reducedMotion ? 0.4 : 1),
        base: rand(0.25, 0.7),
      });
    }
  }

  function placeStar(x: number, y: number): UserStar {
    const star: UserStar = { x, y, r: rand(2.2, 3.6), born: Date.now(), alpha: 0 };
    stars.push(star);
    sound?.chime();
    return star;
  }

  function nightBackground(): void {
    const g = render.createLinearGradient(0, 0, 0, cssH);
    g.addColorStop(0, '#171327');
    g.addColorStop(1, '#241d3e');
    render.fillStyle = g;
    render.fillRect(0, 0, cssW, cssH);
  }

  function drawGlow(x: number, y: number, r: number, alpha: number): void {
    const grad = render.createRadialGradient(x, y, 0, x, y, r * 3.2);
    grad.addColorStop(0, `rgba(255,255,255,${0.95 * alpha})`);
    grad.addColorStop(0.4, hexAlpha(lav(), 0.7 * alpha));
    grad.addColorStop(1, hexAlpha(lav(), 0));
    render.beginPath();
    render.arc(x, y, r * 3.2, 0, Math.PI * 2);
    render.fillStyle = grad;
    render.fill();
  }

  function frame(): void {
    if (!running) return;
    const t = Date.now();
    const tw = t / 1000;

    nightBackground();

    // Estrellas de fondo: derivan y titilan.
    const twAmp = reducedMotion ? 0.12 : 0.3;
    for (const s of bg) {
      s.x += s.vx;
      s.y += s.vy;
      if (s.x < 0) s.x += cssW;
      else if (s.x > cssW) s.x -= cssW;
      if (s.y < 0) s.y += cssH;
      else if (s.y > cssH) s.y -= cssH;
      const a = s.base + twAmp * Math.sin(tw * s.speed + s.phase);
      render.beginPath();
      render.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      render.fillStyle = `rgba(255,255,255,${Math.max(0, a)})`;
      render.fill();
    }

    // Caduca estrellas y calcula alpha por edad.
    for (let i = stars.length - 1; i >= 0; i--) {
      const st = stars[i];
      const age = t - st.born;
      if (age >= HOLD_MS + FADE_MS) {
        stars.splice(i, 1);
        continue;
      }
      st.alpha =
        age < 250
          ? age / 250
          : age < HOLD_MS
            ? 1
            : 1 - (age - HOLD_MS) / FADE_MS;
    }
    // Quita líneas cuyos extremos ya no existen.
    for (let i = links.length - 1; i >= 0; i--) {
      if (!stars.includes(links[i].from) || !stars.includes(links[i].to)) {
        links.splice(i, 1);
      }
    }

    // Líneas de la constelación.
    render.lineWidth = 1;
    for (const l of links) {
      const a = Math.min(l.from.alpha, l.to.alpha) * 0.55;
      if (a <= 0) continue;
      render.beginPath();
      render.moveTo(l.from.x, l.from.y);
      render.lineTo(l.to.x, l.to.y);
      render.strokeStyle = hexAlpha(lav(), a);
      render.stroke();
    }

    // Estrellas colocadas (glow).
    for (const st of stars) {
      if (st.alpha <= 0) continue;
      drawGlow(st.x, st.y, st.r, st.alpha);
    }

    raf = requestAnimationFrame(frame);
  }

  return {
    start(): void {
      if (running) return;
      running = true;
      seedBackground();
      raf = requestAnimationFrame(frame);
    },

    stop(): void {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      bg.length = 0;
      stars.length = 0;
      links.length = 0;
      lastInPath = null;
      dragging = false;
    },

    resize(width: number, height: number, ratio: number): void {
      cssW = Math.max(1, width);
      cssH = Math.max(1, height);
      canvas.width = Math.round(cssW * ratio);
      canvas.height = Math.round(cssH * ratio);
      render.setTransform(ratio, 0, 0, ratio, 0, 0);
      seedBackground();
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
      links.push({ from: lastInPath, to: next });
      lastInPath = next;
    },

    pointerUp(): void {
      dragging = false;
      lastInPath = null; // un nuevo trazo empieza una constelación nueva
    },
  };
}

/** #rrggbb + alpha → rgba(); deja pasar valores no-hex tal cual. */
function hexAlpha(color: string, alpha: number): string {
  const hex = color.trim();
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
