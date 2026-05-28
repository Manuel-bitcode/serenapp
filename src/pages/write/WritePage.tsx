import {
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
  IonTextarea,
  IonToast,
} from '@ionic/react';
import { shuffleOutline } from 'ionicons/icons';
import ScreenHeader from '../../components/screen-header/ScreenHeader';
import { useWritePage } from './useWritePage';
import './write.css';

/**
 * RF4/RF5 — Escritura guiada. Toda la lógica (carga/autoguardado de borrador,
 * rotación de pregunta, guardado final, navegación) vive en useWritePage.
 */
const WritePage: React.FC = () => {
  const { prompt, body, setBody, saved, canSave, rotatePrompt, save, finish } =
    useWritePage();

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
        onDidDismiss={finish}
      />
    </IonPage>
  );
};

export default WritePage;
