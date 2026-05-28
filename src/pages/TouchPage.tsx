import { useCallback, useEffect, useRef, useState } from 'react';
import { IonContent, IonIcon, IonPage, useIonRouter } from '@ionic/react';
import { close, refresh, volumeHigh, volumeMute } from 'ionicons/icons';
import { Preferences } from '@capacitor/preferences';
import { TOUCH_VARIANTS, type TouchVariant } from '../data/types';
import { addTouchEntry } from '../services/entries';
import { createBubblesEngine } from '../features/touch/engines/bubbles';
import { createSandEngine } from '../features/touch/engines/sand';
import { createParticlesEngine } from '../features/touch/engines/particles';
import { createConstellationEngine } from '../features/touch/engines/constellation';
import { createTouchAudio, type TouchSound } from '../features/touch/audio';
import type { EngineOptions, TouchEngine } from '../features/touch/engines/engine';
import './touch.css';

/* RF1 — módulo "Siente": 3 mini-experiencias táctiles elegidas al azar, que
 * responden a los gestos en tiempo real. Al cerrar (si la sesión superó el umbral)
 * se registra en el historial vía addTouchEntry(). */

const HINTS: Record<TouchVariant, string> = {
  bubbles: 'Toca las burbujas para estallarlas',
  sand: 'Desliza para mover la arena',
  particles: 'Mueve las partículas con el dedo',
  constellation: 'Toca para crear estrellas; arrastra para unirlas',
};

const SOUND_KEY = 'serenapp.sound';

/** Solo se registra la sesión si duró más que esto (evita toques accidentales). */
const MIN_SESSION_MS = 2000;
const HINT_FADE_MS = 4000;

const FACTORIES: Record<TouchVariant, (opts: EngineOptions) => TouchEngine> = {
  bubbles: createBubblesEngine,
  sand: createSandEngine,
  particles: createParticlesEngine,
  constellation: createConstellationEngine,
};

/** Permite forzar una experiencia con ?v=… (demo / pruebas visuales). */
function variantFromQuery(): TouchVariant | null {
  const v = new URLSearchParams(window.location.search).get('v');
  return v && (TOUCH_VARIANTS as string[]).includes(v)
    ? (v as TouchVariant)
    : null;
}

function pickVariant(exclude?: TouchVariant): TouchVariant {
  const pool = exclude
    ? TOUCH_VARIANTS.filter((v) => v !== exclude)
    : TOUCH_VARIANTS;
  const list = pool.length > 0 ? pool : TOUCH_VARIANTS;
  return list[Math.floor(Math.random() * list.length)];
}

function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

const TouchPage: React.FC = () => {
  const router = useIonRouter();

  // El variant se fija una vez al montar (aleatorio, o forzado con ?v= para demo/test).
  const [variant, setVariant] = useState<TouchVariant>(
    () => variantFromQuery() ?? pickVariant(),
  );
  const [elapsed, setElapsed] = useState(0);
  const [hintVisible, setHintVisible] = useState(true);
  const [muted, setMuted] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const engineRef = useRef<TouchEngine | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  // Guarda contra doble-registro (StrictMode monta/desmonta dos veces en dev).
  const recordedRef = useRef(false);

  // Audio procedural: instancia única; el AudioContext nace en el primer gesto.
  const audioRef = useRef<TouchSound | null>(null);
  if (audioRef.current === null) audioRef.current = createTouchAudio(false);
  const audioStartedRef = useRef(false);
  const mutedRef = useRef(false);

  /** Registra la sesión actual una sola vez si superó el umbral. */
  const recordSession = useCallback(() => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    const dur = Date.now() - startedAtRef.current;
    if (dur > MIN_SESSION_MS) {
      void addTouchEntry(variant, dur);
    }
  }, [variant]);

  // Cronómetro mm:ss ascendente.
  useEffect(() => {
    startedAtRef.current = Date.now();
    setElapsed(0);
    const id = setInterval(() => {
      setElapsed(Date.now() - startedAtRef.current);
    }, 250);
    return () => clearInterval(id);
  }, []);

  // Hint que se desvanece tras ~4s; se reinicia al reordenar la experiencia.
  useEffect(() => {
    setHintVisible(true);
    const id = setTimeout(() => setHintVisible(false), HINT_FADE_MS);
    return () => clearTimeout(id);
  }, [variant]);

  // Motor de la experiencia: crear, dimensionar, conectar gestos, limpiar.
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const engine = FACTORIES[variant]({
      canvas,
      reducedMotion,
      sound: audioRef.current ?? undefined,
    });
    engineRef.current = engine;

    const sizeToStage = () => {
      const rect = stage.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      engine.resize(rect.width, rect.height, dpr);
    };
    sizeToStage();
    engine.start();

    const ro = new ResizeObserver(sizeToStage);
    ro.observe(stage);

    // Coordenadas del puntero relativas al canvas (px CSS).
    const toSample = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const onDown = (e: PointerEvent) => {
      // El AudioContext debe (re)activarse tras un gesto del usuario (autoplay).
      if (!audioStartedRef.current) {
        audioStartedRef.current = true;
        audioRef.current?.resume();
        if (!mutedRef.current) audioRef.current?.startAmbient();
      }
      try {
        canvas.setPointerCapture?.(e.pointerId);
      } catch {
        /* pointerId no activo (p. ej. eventos sintéticos): ignorar */
      }
      engine.pointerDown(toSample(e.clientX, e.clientY));
    };
    const onMove = (e: PointerEvent) => {
      // Solo procesamos move con botón/dedo presionado para sand/bubbles;
      // particles repele también al pasar, pero exigir presión es más calmo.
      if (e.buttons === 0 && e.pointerType === 'mouse') return;
      engine.pointerMove(toSample(e.clientX, e.clientY));
    };
    const onUp = (e: PointerEvent) => {
      engine.pointerUp(toSample(e.clientX, e.clientY));
      try {
        canvas.releasePointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
    };

    // touch-action:none ya está en .sa-canvas-stage → no hace falta preventDefault.
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      ro.disconnect();
      engine.stop();
      engineRef.current = null;
    };
  }, [variant]);

  // Registro al desmontar (cubre back físico de Android / navegación externa, RF8).
  useEffect(() => recordSession, [recordSession]);

  // Carga la preferencia de sonido (por defecto activado).
  useEffect(() => {
    let active = true;
    void Preferences.get({ key: SOUND_KEY }).then(({ value }) => {
      if (!active || value !== 'off') return;
      mutedRef.current = true;
      setMuted(true);
      audioRef.current?.setMuted(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Libera el audio al desmontar.
  useEffect(() => () => audioRef.current?.dispose(), []);

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    const a = audioRef.current;
    a?.setMuted(next);
    if (!next) {
      a?.resume();
      a?.startAmbient();
    }
    void Preferences.set({ key: SOUND_KEY, value: next ? 'off' : 'on' });
  }, []);

  const handleClose = useCallback(() => {
    audioRef.current?.stopAmbient();
    recordSession();
    router.goBack();
  }, [recordSession, router]);

  const handleReshuffle = useCallback(() => {
    // Cuenta la sesión en curso como completada, luego arranca otra experiencia.
    recordSession();
    recordedRef.current = false;
    startedAtRef.current = Date.now();
    setElapsed(0);
    setVariant((prev) => pickVariant(prev));
  }, [recordSession]);

  return (
    <IonPage>
      <IonContent className="touch-content" fullscreen scrollY={false}>
        <div className="touch-stage" ref={stageRef}>
          <canvas
            // key por variant: React entrega un canvas FRESCO al reordenar (↻).
            // PixiJS no puede reusar el mismo canvas tras destruir su contexto WebGL.
            key={variant}
            ref={canvasRef}
            className="sa-canvas-stage touch-canvas"
            aria-label={`Experiencia táctil: ${HINTS[variant]}`}
            role="img"
          />

          <div className="touch-ui">
            <div className="touch-top">
              <button
                type="button"
                className="touch-btn"
                aria-label="Cerrar y volver"
                onClick={handleClose}
              >
                <IonIcon icon={close} aria-hidden="true" />
              </button>

              <div className="touch-timer" aria-live="off">
                {formatClock(elapsed)}
              </div>

              <div className="touch-actions">
                <button
                  type="button"
                  className="touch-btn"
                  aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
                  aria-pressed={muted}
                  onClick={toggleMute}
                >
                  <IonIcon
                    icon={muted ? volumeMute : volumeHigh}
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  className="touch-btn"
                  aria-label="Otra experiencia"
                  onClick={handleReshuffle}
                >
                  <IonIcon icon={refresh} aria-hidden="true" />
                </button>
              </div>
            </div>

            <p
              className={`touch-hint${hintVisible ? '' : ' touch-hint--hidden'}`}
            >
              {HINTS[variant]}
            </p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default TouchPage;
