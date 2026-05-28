import { useState } from 'react';
import { useIonRouter, useIonViewWillEnter } from '@ionic/react';
import { getProfile } from '../../services/profile';

/** Lógica de Home: nombre del perfil + navegación a un módulo. */
export function useHomePage() {
  const router = useIonRouter();
  const [name, setName] = useState('');

  useIonViewWillEnter(() => {
    void getProfile().then((p) => setName(p.name));
  });

  const go = (route: string) => router.push(route, 'forward', 'push');

  return { name, go };
}
