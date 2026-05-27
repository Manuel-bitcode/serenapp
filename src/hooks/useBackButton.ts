/* RF8 — botón de retroceso de Android.
 * Si hay historial, navega atrás (no rompe el stack). En la raíz, exige doble pulsación
 * para salir, evitando cierres accidentales. Solo activo en plataforma nativa.
 */
import { useEffect, useState } from 'react';
import { useIonRouter } from '@ionic/react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export function useBackButton() {
  const router = useIonRouter();
  const [showExitHint, setShowExitHint] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let lastPress = 0;
    const sub = App.addListener('backButton', () => {
      if (router.canGoBack()) {
        router.goBack();
      } else {
        const now = Date.now();
        if (now - lastPress < 2000) {
          App.exitApp();
        } else {
          lastPress = now;
          setShowExitHint(true);
        }
      }
    });
    return () => {
      sub.then((s) => s.remove());
    };
  }, [router]);

  return { showExitHint, dismissExitHint: () => setShowExitHint(false) };
}
