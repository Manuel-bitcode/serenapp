import { useState } from 'react';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
  IonToast,
  useIonRouter,
} from '@ionic/react';
import { cameraOutline, refreshOutline } from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { EMOTIONS, type EmotionTag } from '../../data/types';
import { addPhotoEntry } from '../../services/entries';
import ScreenHeader from '../../components/ScreenHeader';
import './capture.css';

/**
 * RF2 — Captura fotográfica emocional.
 * Toma una foto o la elige de galería (CameraSource.Prompt) y la asocia a una
 * de las 6 etiquetas emocionales. Todo se guarda local (RNF3): la dataURL se
 * persiste vía addPhotoEntry → Dexie. Sin red.
 */
const CapturePage: React.FC = () => {
  const router = useIonRouter();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [tag, setTag] = useState<EmotionTag | null>(null);
  const [saved, setSaved] = useState(false);

  // Abre la cámara/galería del dispositivo (en web usa @ionic/pwa-elements).
  const pickPhoto = async () => {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt, // cámara O galería (RF2)
        quality: 70,
      });
      if (photo.dataUrl) {
        setDataUrl(photo.dataUrl);
      }
    } catch {
      // getPhoto lanza si el usuario cancela: no es un error real, lo ignoramos.
    }
  };

  const save = async () => {
    if (!dataUrl || !tag) return;
    await addPhotoEntry(dataUrl, tag);
    setSaved(true);
  };

  return (
    <IonPage>
      <ScreenHeader title="Captura tu sentir" backHref="/tabs/home" />

      <IonContent className="sa-content" fullscreen>
        <div className="sa-screen capture">
          {!dataUrl ? (
            <div className="capture__intro">
              <span className="sa-ic sa-ic--mint capture__intro-ic">
                <IonIcon aria-hidden="true" icon={cameraOutline} />
              </span>
              <p className="capture__hint">
                Captura un objeto, lugar o gesto que represente cómo te sientes.
              </p>
              <IonButton
                expand="block"
                color="secondary"
                className="capture__cta"
                onClick={() => void pickPhoto()}
              >
                <IonIcon slot="start" icon={cameraOutline} />
                Tomar o elegir foto
              </IonButton>
            </div>
          ) : (
            <>
              <img
                className="capture__preview"
                src={dataUrl}
                alt="Foto que capturaste de tu sentir"
              />

              <IonButton
                fill="clear"
                size="small"
                color="secondary"
                className="capture__retake"
                onClick={() => void pickPhoto()}
              >
                <IonIcon slot="start" icon={refreshOutline} />
                Repetir foto
              </IonButton>

              <p className="capture__q sa-serif">¿Qué emoción la describe?</p>

              <div className="capture__grid" role="radiogroup" aria-label="Emoción">
                {EMOTIONS.map((e) => {
                  const selected = tag === e.tag;
                  return (
                    <button
                      key={e.tag}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      className={`capture__pill${selected ? ' is-selected' : ''}`}
                      onClick={() => setTag(e.tag)}
                    >
                      <span className="capture__emoji" aria-hidden="true">
                        {e.emoji}
                      </span>
                      <span className="capture__label">{e.label}</span>
                    </button>
                  );
                })}
              </div>

              <IonButton
                expand="block"
                color="secondary"
                className="capture__save"
                disabled={!dataUrl || !tag}
                onClick={() => void save()}
              >
                Guardar entrada
              </IonButton>
            </>
          )}
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

export default CapturePage;
