import { useCallback, useEffect, useRef, useState } from 'react';
import { useIonRouter } from '@ionic/react';
import { Preferences } from '@capacitor/preferences';
import { TOUCH_VARIANTS, type TouchVariant } from '../../data/types';
import { addTouchEntry } from '../../services/entries';
import { createBubblesEngine } from '../../features/touch/engines/bubbles';
import { createSandEngine } from '../../features/touch/engines/sand';
import { createParticlesEngine } from '../../features/touch/engines/particles';
import { createConstellationEngine } from '../../features/touch/engines/constellation';
import { createTouchAudio, type TouchSound } from '../../features/touch/audio';
import type {
  EngineOptions,
  TouchEngine,
} from '../../features/touch/engines/engine';

const SOUND_KEY = 'serenapp.sound';
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

/**
 * Lógica completa de la pantalla Siente: variant aleatorio (con override por
 * ?v=), cronómetro, hint que se desvanece, motor de la experiencia, gestos,
 * audio (ambient + sfx), botón de silencio persistido, reshuffle y cierre.
 *
 * Devuelve los refs (stageRef/canvasRef) para que la page los adjunte a su
 * JSX, además del estado y los handlers que la page usa.
 */
export function useTouchPage() {
  const router = useIonRouter();

  // Variant inicial: aleatorio, o forzado con ?v= para demo/test.
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
  // StrictMode monta/desmonta dos veces en dev: evita doble registro.
  const recordedRef = useRef(false);

  // Audio: instancia única; el AudioContext nace al primer gesto.
  const audioRef = useRef<TouchSound | null>(null);
  if (audioRef.current === null) audioRef.current = createTouchAudio(false);
  const audioStartedRef = useRef(false);
  const mutedRef = useRef(false);

  /** Registra la sesión una sola vez si superó el umbral. */
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

  // Hint que se desvanece tras ~4s; se reinicia al cambiar de experiencia.
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

    const toSample = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const onDown = (e: PointerEvent) => {
      // El AudioContext debe (re)activarse tras un gesto del usuario.
      if (!audioStartedRef.current) {
        audioStartedRef.current = true;
        audioRef.current?.resume();
        if (!mutedRef.current) audioRef.current?.startAmbient();
      }
      try {
        canvas.setPointerCapture?.(e.pointerId);
      } catch {
        /* pointerId no activo (eventos sintéticos): ignorar */
      }
      engine.pointerDown(toSample(e.clientX, e.clientY));
    };

    const onMove = (e: PointerEvent) => {
      if (e.buttons === 0 && e.pointerType === 'mouse') return;
      const sample = toSample(e.clientX, e.clientY);
      // Si el puntero salió del lienzo terminamos el gesto: evita estrellas
      // fuera de vista con líneas "que se van a la nada" en la constelación.
      if (
        sample.x < 0 ||
        sample.x > canvas.clientWidth ||
        sample.y < 0 ||
        sample.y > canvas.clientHeight
      ) {
        engine.pointerUp(sample);
        return;
      }
      engine.pointerMove(sample);
    };

    const onUp = (e: PointerEvent) => {
      engine.pointerUp(toSample(e.clientX, e.clientY));
      try {
        canvas.releasePointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
    };

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

  // Registra al desmontar (cubre back físico de Android / navegación).
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
    recordSession();
    recordedRef.current = false;
    startedAtRef.current = Date.now();
    setElapsed(0);
    setVariant((prev) => pickVariant(prev));
  }, [recordSession]);

  return {
    variant,
    elapsed,
    hintVisible,
    muted,
    stageRef,
    canvasRef,
    toggleMute,
    handleClose,
    handleReshuffle,
  };
}
