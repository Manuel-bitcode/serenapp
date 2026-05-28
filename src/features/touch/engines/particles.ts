/* SerenApp · RF1 — experiencia "Partículas".
 *
 * Campo calmo de ~80–120 partículas (lavanda/menta) a la deriva. El puntero las
 * REPELE dentro de un radio con una fuerza dependiente de la distancia; al levantar
 * el dedo vuelven con suavidad a su deriva natural. Canvas propio + rAF. Sin React.
 */
import { cssVar, type EngineOptions, type PointerSample, type TouchEngine } from './engine';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  /** velocidad base de deriva (para regresar tras la repulsión). */
  driftX: number;
  driftY: number;
}

const REPEL_RADIUS = 110;

export function createParticlesEngine({
  canvas,
  reducedMotion,
  sound,
}: EngineOptions): TouchEngine {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('particles: 2D context unavailable');
  const render = ctx;

  let cssW = 1;
  let cssH = 1;
  let raf = 0;
  let running = false;

  const particles: Particle[] = [];
  let pointer: PointerSample | null = null;

  const count = reducedMotion ? 100 : 150;
  const driftScale = reducedMotion ? 0.26 : 0.45;

  function colors(): string[] {
    return [
      cssVar('--sa-lav-300', '#b8a6d9'),
      cssVar('--sa-lav-500', '#7b68a6'),
      cssVar('--sa-mint', '#c5d5c0'),
      cssVar('--sa-mint-deep', '#7b9477'),
    ];
  }

  function seed(): void {
    particles.length = 0;
    const pal = colors();
    for (let i = 0; i < count; i++) {
      const driftX = (Math.random() - 0.5) * driftScale;
      const driftY = (Math.random() - 0.5) * driftScale;
      particles.push({
        x: Math.random() * cssW,
        y: Math.random() * cssH,
        vx: driftX,
        vy: driftY,
        driftX,
        driftY,
        r: 1.5 + Math.random() * 3.5,
        color: pal[i % pal.length],
      });
    }
  }

  function update(): void {
    for (const p of particles) {
      if (pointer) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < REPEL_RADIUS * REPEL_RADIUS && d2 > 0.01) {
          const d = Math.sqrt(d2);
          // fuerza ∝ (1 − d/R): más cerca → empuje más fuerte.
          const force = (1 - d / REPEL_RADIUS) * (reducedMotion ? 1.6 : 2.6);
          p.vx += (dx / d) * force;
          p.vy += (dy / d) * force;
        }
      }

      // Regreso suave hacia la velocidad de deriva (easing) cuando no hay empuje.
      p.vx += (p.driftX - p.vx) * 0.04;
      p.vy += (p.driftY - p.vy) * 0.04;

      p.x += p.vx;
      p.y += p.vy;

      // Envolver en los bordes para un campo continuo.
      if (p.x < -p.r) p.x = cssW + p.r;
      else if (p.x > cssW + p.r) p.x = -p.r;
      if (p.y < -p.r) p.y = cssH + p.r;
      else if (p.y > cssH + p.r) p.y = -p.r;
    }
  }

  function draw(): void {
    render.clearRect(0, 0, cssW, cssH);
    for (const p of particles) {
      render.beginPath();
      render.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      render.fillStyle = p.color;
      render.globalAlpha = 0.7;
      render.fill();
    }
    render.globalAlpha = 1;
  }

  function frame(): void {
    if (!running) return;
    update();
    draw();
    raf = requestAnimationFrame(frame);
  }

  return {
    start(): void {
      if (running) return;
      running = true;
      if (particles.length === 0) seed();
      raf = requestAnimationFrame(frame);
    },

    stop(): void {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      pointer = null;
      particles.length = 0;
    },

    resize(width: number, height: number, ratio: number): void {
      const first = particles.length === 0;
      cssW = Math.max(1, width);
      cssH = Math.max(1, height);
      canvas.width = Math.round(cssW * ratio);
      canvas.height = Math.round(cssH * ratio);
      render.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (first) seed();
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
