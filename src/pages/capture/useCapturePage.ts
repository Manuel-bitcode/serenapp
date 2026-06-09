import { useState } from 'react';
import { useIonRouter } from '@ionic/react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import type { EmotionTag } from '../../data/types';
import { addPhotoEntry } from '../../services/entries';

/** Lógica de Captura: foto/galería + etiqueta + guardado local. */
export function useCapturePage() {
  const router = useIonRouter();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [tag, setTag] = useState<EmotionTag | null>(null);
  const [saved, setSaved] = useState(false);

  // Abre cámara o galería del dispositivo (en web usa @ionic/pwa-elements).
  const pickPhoto = async () => {
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        quality: 70,
      });
      if (photo.dataUrl) setDataUrl(photo.dataUrl);
    } catch {
      /* getPhoto lanza al cancelar: no es un error real */
    }
  };

  const save = async () => {
    if (!dataUrl || !tag) return;
    await addPhotoEntry(dataUrl, tag);
    setSaved(true);
  };

  const finish = () => router.push('/tabs/history', 'root', 'replace');

  return {
    dataUrl,
    tag,
    setTag,
    saved,
    pickPhoto,
    save,
    finish,
    canSave: Boolean(dataUrl && tag),
  };
}
