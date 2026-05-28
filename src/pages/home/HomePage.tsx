import { useState } from 'react';
import {
  IonContent,
  IonIcon,
  IonPage,
  useIonRouter,
  useIonViewWillEnter,
} from '@ionic/react';
import { handLeftOutline, cameraOutline, createOutline } from 'ionicons/icons';
import { getProfile } from '../../services/profile';
import './home.css';

const MODULES = [
  {
    key: 'touch',
    route: '/touch',
    icon: handLeftOutline,
    color: 'lav',
    title: 'Siente',
    desc: 'Calma con interacciones táctiles',
  },
  {
    key: 'capture',
    route: '/capture',
    icon: cameraOutline,
    color: 'mint',
    title: 'Captura',
    desc: 'Una foto de tu sentir ahora',
  },
  {
    key: 'write',
    route: '/write',
    icon: createOutline,
    color: 'warm',
    title: 'Escribe',
    desc: 'Pon en palabras tus pensamientos',
  },
] as const;

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
              key={m.key}
              className="sa-tile"
              onClick={() => router.push(m.route, 'forward', 'push')}
            >
              <span className={`sa-ic sa-ic--${m.color}`}>
                <IonIcon aria-hidden="true" icon={m.icon} />
              </span>
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
