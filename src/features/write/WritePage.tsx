import { useCallback, useEffect, useRef, useState } from 'react';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
  IonTextarea,
  IonToast,
  useIonRouter,
} from '@ionic/react';
import { shuffleOutline } from 'ionicons/icons';
import { Preferences } from '@capacitor/preferences';
import { WRITING_PROMPTS } from '../../data/types';
import { addTextEntry } from '../../services/entries';
import ScreenHeader from '../../components/ScreenHeader';
import './write.css';

const DRAFT_KEY = 'serenapp.draft';
const DAY_MS = 86400000;

/** Pregunta del día: determinista por jornada, rota a diario (RF4). */
const promptOfTheDay = (): string =>
  WRITING_PROMPTS[Math.floor(Date.now() / DAY_MS) % WRITING_PROMPTS.length];

interface Draft {
  prompt: string;
  body: string;
}

/**
 * RF4/RF5 — Escritura guiada.
 * Pregunta detonadora rotativa (banco de ≥5) con opción de cambiarla, área de
 * texto sin límite, autoguardado de borrador en Preferences y guardado final
 * en el historial local (RNF3). Sin red.
 */
const WritePage: React.FC = () => {
  const router = useIonRouter();
  const [prompt, setPrompt] = useState<string>(promptOfTheDay);
  const [body, setBody] = useState('');
  const [saved, setSaved] = useState(false);
  // Tras montar y cargar el borrador, habilitamos el autoguardado para no
  // pisar el borrador almacenado con el estado inicial vacío.
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carga el borrador guardado al entrar (si existe).
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
          // Borrador corrupto: lo ignoramos y seguimos con la pregunta del día.
        }
      }
      hydrated.current = true;
    })();
    return () => {
      active = false;
    };
  }, []);

  // Autoguardado del borrador (debounce) ante cualquier cambio.
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

  // "otra pregunta": elige otra distinta del banco al azar.
  const rotatePrompt = useCallback(() => {
    if (WRITING_PROMPTS.length <= 1) return;
    setPrompt((current) => {
      const options = WRITING_PROMPTS.filter((p) => p !== current);
      return options[Math.floor(Math.random() * options.length)];
    });
  }, []);

  const trimmed = body.trim();
  const canSave = trimmed.length > 0;

  const save = async () => {
    if (!canSave) return;
    await addTextEntry(prompt, body);
    await Preferences.remove({ key: DRAFT_KEY });
    setSaved(true);
  };

  return (
    <IonPage>
      <ScreenHeader
        title="Escribe"
        backHref="/tabs/home"
        end={
          <IonButton
            onClick={rotatePrompt}
            aria-label="Cambiar pregunta"
            title="Otra pregunta"
          >
            <IonIcon slot="icon-only" icon={shuffleOutline} />
          </IonButton>
        }
      />

      <IonContent className="sa-content" fullscreen>
        <div className="sa-screen write">
          <div className="write__prompt-head">
            <span className="write__tag sa-serif">Pregunta del día</span>
            <button
              type="button"
              className="write__rotate"
              onClick={rotatePrompt}
            >
              <IonIcon aria-hidden="true" icon={shuffleOutline} />
              otra pregunta
            </button>
          </div>

          <p className="write__prompt sa-serif">{prompt}</p>

          <IonTextarea
            className="write__area"
            value={body}
            onIonInput={(e) => setBody(e.detail.value ?? '')}
            autoGrow
            placeholder="Escribe libremente…"
            aria-label="Tu escrito"
          />

          <div className="write__foot">
            <span className="write__count">{body.length} caracteres</span>
            <IonButton
              color="tertiary"
              className="write__save"
              disabled={!canSave}
              onClick={() => void save()}
            >
              Guardar
            </IonButton>
          </div>
        </div>
      </IonContent>

      <IonToast
        isOpen={saved}
        message="Entrada guardada"
        duration={1400}
        onDidDismiss={() => router.push('/tabs/history', 'root', 'replace')}
      />
    </IonPage>
  );
};

export default WritePage;
