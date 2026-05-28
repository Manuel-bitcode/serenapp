import { useEffect, useState } from 'react';
import { Redirect, Route } from 'react-router-dom';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonToast,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { homeOutline, timeOutline, settingsOutline } from 'ionicons/icons';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Dark mode en modo "class": alternamos .ion-palette-dark desde services/theme.ts (RNF5) */
import '@ionic/react/css/palettes/dark.class.css';

/* Theme propio */
import './theme/variables.css';
import './theme/typography.css';
import './theme/app.css';

import Splash from './components/Splash';
import OnboardingPage from './pages/onboarding/OnboardingPage';
import HomePage from './pages/home/HomePage';
import TouchPage from './pages/touch/TouchPage';
import CapturePage from './pages/capture/CapturePage';
import WritePage from './pages/write/WritePage';
import HistoryPage from './pages/history/HistoryPage';
import EntryDetailPage from './pages/history/EntryDetailPage';
import SettingsPage from './pages/settings/SettingsPage';

import { getProfile } from './services/profile';
import { getSettings } from './services/settings';
import { initAppearance } from './services/theme';
import { useBackButton } from './hooks/useBackButton';

setupIonicReact();

/** Pestañas de la app: Inicio / Historial / Ajustes. */
const Tabs: React.FC = () => (
  <IonTabs>
    <IonRouterOutlet>
      <Route exact path="/tabs/home">
        <HomePage />
      </Route>
      <Route exact path="/tabs/history">
        <HistoryPage />
      </Route>
      <Route exact path="/tabs/settings">
        <SettingsPage />
      </Route>
      <Route exact path="/tabs">
        <Redirect to="/tabs/home" />
      </Route>
    </IonRouterOutlet>
    <IonTabBar slot="bottom">
      <IonTabButton tab="home" href="/tabs/home">
        <IonIcon aria-hidden="true" icon={homeOutline} />
        <IonLabel>Inicio</IonLabel>
      </IonTabButton>
      <IonTabButton tab="history" href="/tabs/history">
        <IonIcon aria-hidden="true" icon={timeOutline} />
        <IonLabel>Historial</IonLabel>
      </IonTabButton>
      <IonTabButton tab="settings" href="/tabs/settings">
        <IonIcon aria-hidden="true" icon={settingsOutline} />
        <IonLabel>Ajustes</IonLabel>
      </IonTabButton>
    </IonTabBar>
  </IonTabs>
);

/**
 * Shell raíz: aplica apariencia, decide la pantalla inicial (onboarding vs tabs)
 * y monta el router. Los módulos inmersivos (touch/capture/write) son rutas de nivel
 * superior que se apilan sobre las tabs → el back de Android vuelve a Home (RF8).
 */
const Shell: React.FC = () => {
  const { showExitHint, dismissExitHint } = useBackButton();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const settings = await getSettings();
      initAppearance(settings.theme, settings.textScale);
      const profile = await getProfile();
      setOnboarded(profile.onboarded);
    })();
  }, []);

  if (onboarded === null) return <Splash />;

  return (
    <>
      <IonRouterOutlet>
        <Route path="/onboarding">
          <OnboardingPage />
        </Route>
        <Route path="/tabs">
          <Tabs />
        </Route>
        <Route exact path="/touch">
          <TouchPage />
        </Route>
        <Route exact path="/capture">
          <CapturePage />
        </Route>
        <Route exact path="/write">
          <WritePage />
        </Route>
        <Route exact path="/entry/:id">
          <EntryDetailPage />
        </Route>
        <Route exact path="/">
          <Redirect to={onboarded ? '/tabs/home' : '/onboarding'} />
        </Route>
      </IonRouterOutlet>
      <IonToast
        isOpen={showExitHint}
        message="Pulsa atrás de nuevo para salir"
        duration={1800}
        onDidDismiss={dismissExitHint}
      />
    </>
  );
};

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <Shell />
    </IonReactRouter>
  </IonApp>
);

export default App;
