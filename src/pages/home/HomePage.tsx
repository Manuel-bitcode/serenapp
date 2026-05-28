import { useState } from 'react';
import {
  IonContent,
  IonPage,
  useIonRouter,
  useIonViewWillEnter,
} from '@ionic/react';
import EntryIcon from '../../components/EntryIcon';
import type { EntryType } from '../../data/types';
import { getProfile } from '../../services/profile';
import './home.css';

/** Cada tile referencia el módulo por su EntryType canónico (touch/photo/text);
 *  el ícono y color salen de ENTRY_VISUAL vía <EntryIcon />. */
const MODULES: {
  type: EntryType;
  route: string;
  title: string;
  desc: string;
}[] = [
  { type: 'touch', route: '/touch', title: 'Siente', desc: 'Calma con interacciones táctiles' },
  { type: 'photo', route: '/capture', title: 'Captura', desc: 'Una foto de tu sentir ahora' },
  { type: 'text', route: '/write', title: 'Escribe', desc: 'Pon en palabras tus pensamientos' },
];

/** Pantalla 03 — Home / Dashboard. Punto de partida a los 3 módulos. */
const HomePage: React.FC = () => {
  const router = useIonRouter();
  const [name, setName] = useState('');

  useIonViewWillEnter(() => {
    void getProfile().then((p) => setName(p.name));
  });

  return (
    <IonPage>
      <IonContent className="sa-content" fullscreen>
        <div className="sa-screen home">
          <h1 className="sa-greet">Hola{name ? `, ${name}` : ''}</h1>
          <p className="sa-sub">¿Cómo te sientes ahora mismo?</p>

          {MODULES.map((m) => (
            <button
              key={m.type}
              className="sa-tile"
              onClick={() => router.push(m.route, 'forward', 'push')}
            >
              <EntryIcon type={m.type} />
              <span className="sa-tile__body">
                <span className="sa-tile__title">{m.title}</span>
                <span className="sa-tile__desc">{m.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default HomePage;
