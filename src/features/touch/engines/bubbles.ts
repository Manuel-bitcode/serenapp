/* SerenApp · RF1 — experiencia "Burbujas".
 *
 * Físicas reales con matter.js (import dinámico, RNF1). Las burbujas son cuerpos
 * circulares con una leve flotabilidad hacia arriba y jitter horizontal suave.
 * El render es PROPIO (no Matter.Render): leemos las posiciones de los cuerpos y
 * pintamos círculos lavanda translúcidos con brillo, para controlar el look.
 * Tocar una burbuja la estalla (se elimina el cuerpo + ripple de pop).
 * Se reponen burbujas periódicamente para mantener ~8–12 en pantalla.
 */
import type Matter from 'matter-js';
import { cssVar, type EngineOptions, type PointerSample, type TouchEngine } from './engine';

/** Acceso a las clases del namespace de Matter (tipado fuerte, sin React). */
type MatterNS = typeof Matter;

interface Pop {
  x: number;
  y: number;
  r: number;
  /** 0→1 progreso de la animación del ripple. */
  t: number;
}

const MIN_BUBBLES = 8;
const MAX_BUBBLES = 12;
const SPAWN_MS = 1400;

export function createBubblesEngine({
  canvas,
  reducedMotion,
}: EngineOptions): TouchEngine {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('bubbles: 2D context unavailable');
  const render = ctx;

  let M: MatterNS | null = null;
  let engine: Matter.Engine | null = null;
  let raf = 0;
  let spawnTimer: ReturnType<typeof setInterval> | null = null;
  let running = false;

  // Tamaño en px CSS (independiente del backing store escalado por dpr).
  let cssW = canvas.clientWidth || 1;
  let cssH = canvas.clientHeight || 1;

  const bubbles: Matter.Body[] = [];
  const pops: Pop[] = [];

  const lav300 = () => cssVar('--sa-lav-300', '#b8a6d9');
  const lav500 = () => cssVar('--sa-lav-500', '#7b68a6');

  const rand = (min: number, max: number) => min + Math.random() * (max - min);

  function spawnBubble(atY?: number): void {
    if (!M || !engine) return;
    const radius = rand(16, 42);
    const x = rand(radius, Math.max(radius, cssW - radius));
    const y = atY ?? cssH + radius + rand(0, 80);
    const body = M.Bodies.circle(x, y, radius, {
      restitution: 0.6,
      friction: 0.001,
      frictionAir: 0.02,
      // densidad baja → la gravedad apenas las afecta; la flotabilidad domina.
      density: 0.0006,
      label: 'bubble',
    });
    bubbles.push(body);
    M.Composite.add(engine.world, body);
  }

  function removeBubble(body: Matter.Body): void {
    if (!M || !engine) return;
    const i = bubbles.indexOf(body);
    if (i >= 0) bubbles.splice(i, 1);
    M.Composite.remove(engine.world, body);
  }

  function popAt(body: Matter.Body): void {
    pops.push({ x: body.position.x, y: body.position.y, r: body.circleRadius ?? 20, t: 0 });
    removeBubble(body);
  }

  /** Empuje hacia arriba (flotabilidad) + jitter horizontal por frame. */
  function applyBuoyancy(): void {
    if (!M) return;
    const lift = reducedMotion ? 0.00045 : 0.0009;
    const jitter = reducedMotion ? 0.00012 : 0.0003;
    for (const b of bubbles) {
      M.Body.applyForce(b, b.position, {
        x: (Math.random() - 0.5) * jitter * b.mass,
        y: -lift * b.mass,
      });
    }
  }

  /** Saca de juego las burbujas que escaparon por arriba y rellena el cupo. */
  function recycle(): void {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      const r = b.circleRadius ?? 20;
      if (b.position.y < -r - 60) removeBubble(b);
    }
    while (bubbles.length < MIN_BUBBLES) spawnBubble();
  }

  function drawBubble(b: Matter.Body): void {
    const r = b.circleRadius ?? 20;
    const { x, y } = b.position;
    const grad = render.createRadialGradient(
      x - r * 0.35,
      y - r * 0.35,
      r * 0.1,
      x,
      y,
      r,
    );
    grad.addColorStop(0, hexAlpha('#ffffff', 0.55));
    grad.addColorStop(0.55, hexAlpha(lav300(), 0.35));
    grad.addColorStop(1, hexAlpha(lav500(), 0.18));
    render.beginPath();
    render.arc(x, y, r, 0, Math.PI * 2);
    render.fillStyle = grad;
    render.fill();
    render.lineWidth = 1;
    render.strokeStyle = hexAlpha('#ffffff', 0.4);
    render.stroke();
    // brillo especular
    render.beginPath();
    render.arc(x - r * 0.32, y - r * 0.32, r * 0.18, 0, Math.PI * 2);
    render.fillStyle = hexAlpha('#ffffff', 0.6);
    render.fill();
  }

  function drawPops(): void {
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      p.t += 0.06;
      if (p.t >= 1) {
        pops.splice(i, 1);
        continue;
      }
      const r = p.r * (1 + p.t * 1.6);
      render.beginPath();
      render.arc(p.x, p.y, r, 0, Math.PI * 2);
      render.lineWidth = 2 * (1 - p.t);
      render.strokeStyle = hexAlpha(lav500(), 0.5 * (1 - p.t));
      render.stroke();
    }
  }

  function frame(): void {
    if (!running || !M || !engine) return;
    applyBuoyancy();
    M.Engine.update(engine, 1000 / 60);
    recycle();

    render.clearRect(0, 0, cssW, cssH);
    for (const b of bubbles) drawBubble(b);
    drawPops();

    raf = requestAnimationFrame(frame);
  }

  return {
    start(): void {
      if (running) return;
      running = true;
      void import('matter-js').then((mod) => {
        if (!running) return; // se detuvo durante la carga
        // El módulo expone el namespace como default (export =) o como objeto raíz.
        M = ((mod as unknown as { default?: MatterNS }).default ??
          (mod as unknown as MatterNS)) as MatterNS;
        engine = M.Engine.create();
        // Gravedad muy suave: la flotabilidad la contrarresta para un flotar calmo.
        engine.gravity.y = reducedMotion ? 0.15 : 0.3;
        engine.gravity.scale = 0.001;
        for (let i = 0; i < MIN_BUBBLES; i++) {
          spawnBubble(rand(cssH * 0.3, cssH));
        }
        spawnTimer = setInterval(() => {
          if (bubbles.length < MAX_BUBBLES) spawnBubble();
        }, reducedMotion ? SPAWN_MS * 2 : SPAWN_MS);
        raf = requestAnimationFrame(frame);
      });
    },

    stop(): void {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (spawnTimer) clearInterval(spawnTimer);
      spawnTimer = null;
      if (M && engine) {
        M.Composite.clear(engine.world, false);
        M.Engine.clear(engine);
      }
      bubbles.length = 0;
      pops.length = 0;
      engine = null;
      M = null;
    },

    resize(width: number, height: number, ratio: number): void {
      cssW = Math.max(1, width);
      cssH = Math.max(1, height);
      canvas.width = Math.round(cssW * ratio);
      canvas.height = Math.round(cssH * ratio);
      render.setTransform(ratio, 0, 0, ratio, 0, 0);
    },

    pointerDown(p: PointerSample): void {
      // Estalla la burbuja más al frente cuyo radio contiene el toque.
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        const r = b.circleRadius ?? 20;
        const dx = p.x - b.position.x;
        const dy = p.y - b.position.y;
        if (dx * dx + dy * dy <= r * r) {
          popAt(b);
          return;
        }
      }
    },

    pointerMove(): void {
      /* burbujas reaccionan solo al tap; el arrastre no hace nada */
    },

    pointerUp(): void {
      /* sin estado de arrastre */
    },
  };
}

/** #rrggbb + alpha → rgba(). Acepta ya-rgb()/rgba() devolviéndolo tal cual. */
function hexAlpha(color: string, alpha: number): string {
  const hex = color.trim();
  if (!hex.startsWith('#')) return hex;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  } else if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
