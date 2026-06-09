// Experiencia "Arena": autómata celular falling-sand sobre una grilla mapeada al canvas.
// Arrastrar deposita granos que caen por "gravedad" y se apilan en diagonal.
// Bucle con requestAnimationFrame; la grilla se acota en resolución para ir fluido.
import { cssVar, type EngineOptions, type PointerSample, type TouchEngine } from './engine';

// 0 = vacío; >0 = índice de paleta (1-based) del grano.
type Grid = Uint8Array;

// lado de cada celda en px css (más grande = menos celdas = más rápido)
const CELL = 6;
/** Tope de celdas por eje para acotar el coste por frame en gama media. */
const MAX_COLS = 160;
const MAX_ROWS = 280;

export function createSandEngine({
  canvas,
  reducedMotion,
  sound,
}: EngineOptions): TouchEngine {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('sand: 2D context unavailable');
  const render = ctx;

  let cols = 1;
  let rows = 1;
  let grid: Grid = new Uint8Array(1);
  let cssW = 1;
  let cssH = 1;
  let raf = 0;
  let running = false;

  // Arrastre activo: pintamos granos en cada move/down.
  let painting = false;
  let last: PointerSample | null = null;

  // Paleta cálida (tonos derivados de los tokens del tema).
  let palette: string[] = [];
  function refreshPalette(): void {
    const warm = cssVar('--sa-warm', '#e8c9a8');
    const deep = cssVar('--sa-warm-deep', '#b88860');
    const rose = cssVar('--sa-rose', '#e5bfc2');
    palette = [warm, deep, rose, mix(warm, deep, 0.5)];
  }

  const idx = (c: number, r: number) => r * cols + c;

  function allocGrid(): void {
    cols = Math.min(MAX_COLS, Math.max(1, Math.floor(cssW / CELL)));
    rows = Math.min(MAX_ROWS, Math.max(1, Math.floor(cssH / CELL)));
    grid = new Uint8Array(cols * rows);
  }

  /** Deposita un pincel circular de granos alrededor de la celda (c,r). */
  function deposit(px: number, py: number): void {
    const c0 = Math.floor((px / cssW) * cols);
    const r0 = Math.floor((py / cssH) * rows);
    const brush = reducedMotion ? 1 : 2;
    for (let dc = -brush; dc <= brush; dc++) {
      for (let dr = -brush; dr <= brush; dr++) {
        if (dc * dc + dr * dr > brush * brush + 1) continue;
        const c = c0 + dc;
        const r = r0 + dr;
        if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
        if (grid[idx(c, r)] === 0 && Math.random() < 0.75) {
          grid[idx(c, r)] = 1 + Math.floor(Math.random() * palette.length);
        }
      }
    }
  }

  /** Traza granos a lo largo del segmento desde `last` hasta el punto actual. */
  function paintLine(p: PointerSample): void {
    const from = last ?? p;
    const dist = Math.hypot(p.x - from.x, p.y - from.y);
    const steps = Math.max(1, Math.floor(dist / (CELL * 0.5)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      deposit(from.x + (p.x - from.x) * t, from.y + (p.y - from.y) * t);
    }
    last = p;
  }

  /** Un paso del autómata: cada grano cae si puede (abajo, o diagonal). */
  function step(): void {
    // Recorremos de abajo hacia arriba para no mover un grano dos veces por frame.
    for (let r = rows - 2; r >= 0; r--) {
      // Alternamos la dirección de barrido para no sesgar los montículos.
      const leftFirst = (r & 1) === 0;
      for (let k = 0; k < cols; k++) {
        const c = leftFirst ? k : cols - 1 - k;
        const v = grid[idx(c, r)];
        if (v === 0) continue;
        const below = idx(c, r + 1);
        if (grid[below] === 0) {
          grid[below] = v;
          grid[idx(c, r)] = 0;
          continue;
        }
        // Diagonal: probar izquierda/derecha en orden aleatorio.
        const dir = Math.random() < 0.5 ? -1 : 1;
        for (const d of [dir, -dir]) {
          const nc = c + d;
          if (nc < 0 || nc >= cols) continue;
          const diag = idx(nc, r + 1);
          if (grid[diag] === 0) {
            grid[diag] = v;
            grid[idx(c, r)] = 0;
            break;
          }
        }
      }
    }
  }

  function draw(): void {
    render.clearRect(0, 0, cssW, cssH);
    const cw = cssW / cols;
    const ch = cssH / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const v = grid[idx(c, r)];
        if (v === 0) continue;
        render.fillStyle = palette[(v - 1) % palette.length];
        // +1 evita costuras (seams) por redondeo entre celdas.
        render.fillRect(c * cw, r * ch, cw + 1, ch + 1);
      }
    }
  }

  function frame(): void {
    if (!running) return;
    step();
    draw();
    raf = requestAnimationFrame(frame);
  }

  return {
    start(): void {
      if (running) return;
      running = true;
      refreshPalette();
      raf = requestAnimationFrame(frame);
    },

    stop(): void {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      painting = false;
      last = null;
      grid = new Uint8Array(1);
    },

    resize(width: number, height: number, ratio: number): void {
      cssW = Math.max(1, width);
      cssH = Math.max(1, height);
      canvas.width = Math.round(cssW * ratio);
      canvas.height = Math.round(cssH * ratio);
      render.setTransform(ratio, 0, 0, ratio, 0, 0);
      allocGrid();
    },

    pointerDown(p: PointerSample): void {
      painting = true;
      last = p;
      deposit(p.x, p.y);
      sound?.grain();
    },

    pointerMove(p: PointerSample): void {
      if (!painting) return;
      paintLine(p);
      sound?.grain();
    },

    pointerUp(): void {
      painting = false;
      last = null;
    },
  };
}

/** Mezcla lineal de dos colores hex (#rrggbb) → #rrggbb. */
function mix(a: string, b: string, t: number): string {
  const pa = toRgb(a);
  const pb = toRgb(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function toRgb(hex: string): [number, number, number] {
  const h = hex.trim();
  if (h.startsWith('#') && h.length === 7) {
    return [
      parseInt(h.slice(1, 3), 16),
      parseInt(h.slice(3, 5), 16),
      parseInt(h.slice(5, 7), 16),
    ];
  }
  return [200, 160, 120];
}
