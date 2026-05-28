import { useCallback, useEffect, useRef, useState } from 'react';
import { useIonRouter } from '@ionic/react';
import { Preferences } from '@capacitor/preferences';
import { WRITING_PROMPTS } from '../../data/types';
import { addTextEntry } from '../../services/entries';

const DRAFT_KEY = 'serenapp.draft';
const DAY_MS = 86400000;

/** Pregunta del día: determinista por jornada, rota a diario (RF4). */
function promptOfTheDay(): string {
  return WRITING_PROMPTS[Math.floor(Date.now() / DAY_MS) % WRITING_PROMPTS.length];
}

interface Draft {
  prompt: string;
  body: string;
}

/**
 * Lógica de Escritura (RF4/RF5): pregunta rotativa, autoguardado de borrador
 * en Preferences (debounced), guardado final en Dexie, navegación al historial.
 */
export function useWritePage() {
  const router = useIonRouter();
  const [prompt, setPrompt] = useState<string>(promptOfTheDay);
  const [body, setBody] = useState('');
  const [saved, setSaved] = useState(false);
  // Tras hidratar el borrador habilitamos el autoguardado, para no pisar el
  // borrador guardado con el estado inicial vacío.
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carga el borrador guardado al montar (si existe).
  useEffect(() => {
    let active = true;
    void (async () => {
      const { value } = await Preferences.get({ key: DRAFT_KEY });
      if (active && value) {
        try {
          const draft = JSON.parse(value) as Draft;
          if (draft.prompt) setPrompt(draft.prompt);
          if (draft.body) setBody(draft.body);
        } catch {
          /* borrador corrupto: ignorar y seguir con la pregunta del día */
        }
      }
      hydrated.current = true;
    })();
    return () => {
      active = false;
    };
  }, []);

  // Autoguardado del borrador (debounce 400ms) ante cualquier cambio.
  useEffect(() => {
    if (!hydrated.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void Preferences.set({
        key: DRAFT_KEY,
        value: JSON.stringify({ prompt, body } satisfies Draft),
      });
    }, 400);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [prompt, body]);

  const rotatePrompt = useCallback(() => {
    if (WRITING_PROMPTS.length <= 1) return;
    setPrompt((current) => {
      const options = WRITING_PROMPTS.filter((p) => p !== current);
      return options[Math.floor(Math.random() * options.length)];
    });
  }, []);

  const canSave = body.trim().length > 0;

  const save = async () => {
    if (!canSave) return;
    await addTextEntry(prompt, body);
    await Preferences.remove({ key: DRAFT_KEY });
    setSaved(true);
  };

  const finish = () => router.push('/tabs/history', 'root', 'replace');

  return {
    prompt,
    body,
    setBody,
    saved,
    canSave,
    rotatePrompt,
    save,
    finish,
  };
}
