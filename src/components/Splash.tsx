import { IonContent, IonPage } from '@ionic/react';
import './Splash.css';

/** Pantalla 01 — splash de marca mientras carga el estado inicial. */
const Splash: React.FC = () => (
  <IonPage>
    <IonContent fullscreen className="sa-content">
      <div className="splash">
        <div className="splash__mark" aria-hidden="true">
          <span className="splash__dot splash__dot--lav" />
          <span className="splash__dot splash__dot--mint" />
          <span className="splash__dot splash__dot--warm" />
        </div>
        <h1 className="splash__title sa-serif">SerenApp</h1>
        <p className="splash__tagline">Respira. Siente. Escribe.</p>
      </div>
    </IonContent>
  </IonPage>
);

export default Splash;
