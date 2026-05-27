/* SerenApp · RF1 — contrato común de los motores táctiles.
 *
 * Cada experiencia (bubbles / sand / particles) implementa esta interfaz como un
 * módulo aislado: SIN React adentro, solo canvas + eventos de puntero. La página
 * (TouchPage) crea el motor, le pasa pointerdown/move/up en tiempo real y llama a
 * stop() para limpiar (cancelar rAF, intervalos, listeners, engines) en el unmount.
 */

/** Punto del puntero en coordenadas CSS del canvas (origen arriba-izquierda). */
export interface PointerSample {
  x: number;
  y: number;
}

export interface TouchEngine {
  /** Arranca el bucle de animación / física. */
  start(): void;
  /** Detiene y libera todo: rAF, intervalos, listeners, engine de Matter, etc. */
  stop(): void;
  /** Reajusta el tamaño interno del canvas al contenedor (devicePixelRatio). */
  resize(cssWidth: number, cssHeight: number, dpr: number): void;
  /** Gesto: el dedo/cursor toca la superficie. */
  pointerDown(p: PointerSample): void;
  /** Gesto: arrastre en tiempo real. */
  pointerMove(p: PointerSample): void;
  /** Gesto: se levanta el dedo/cursor. */
  pointerUp(p: PointerSample): void;
}

/** Opciones comunes que la página inyecta a cada motor al construirlo. */
export interface EngineOptions {
  canvas: HTMLCanvasElement;
  /** RNF1/accesibilidad: reduce spawns y velocidad si el SO pide menos movimiento. */
  reducedMotion: boolean;
}

/** Lee un token de color del tema (CSS var) resuelto sobre el documento. */
export function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}
