import { IonButton, IonContent, IonInput, IonPage } from '@ionic/react';
import { useOnboardingPage } from './useOnboardingPage';
import './onboarding.css';

interface Slide {
  title: string;
  desc: string;
  accent: 'lav' | 'mint' | 'warm';
}

const SLIDES: Slide[] = [
  {
    title: 'Siente con tus manos',
    desc: 'Calma la ansiedad moviendo burbujas, arena y partículas con simples gestos en la pantalla.',
    accent: 'lav',
  },
  {
    title: 'Captura tu sentir',
    desc: 'Toma una foto o elígela de tu galería y asóciala a cómo te sientes ahora.',
    accent: 'mint',
  },
  {
    title: 'Escribe lo que sientes',
    desc: 'Responde preguntas suaves que te ayudan a poner en palabras tu día.',
    accent: 'warm',
  },
];

/** Pantalla 02 — Onboarding + captura del nombre local. */
const OnboardingPage: React.FC = () => {
  const { step, name, setName, isNameStep, next, skip, finish } =
    useOnboardingPage();
  const slide = SLIDES[Math.min(step, SLIDES.length - 1)];

  return (
    <IonPage>
      <IonContent fullscreen className="sa-content">
        <div className="onb">
          {!isNameStep && (
            <button className="onb__skip" onClick={skip}>
              Saltar
            </button>
          )}

          {!isNameStep ? (
            <>
              <div className={`onb__illu onb__illu--${slide.accent}`} aria-hidden="true">
                <span className="onb__blob onb__blob--a" />
                <span className="onb__blob onb__blob--b" />
                <span className="onb__blob onb__blob--c" />
              </div>
              <div className="onb__text">
                <h1 className="onb__title sa-serif">{slide.title}</h1>
                <p className="onb__desc">{slide.desc}</p>
              </div>
            </>
          ) : (
            <div className="onb__name">
              <div className="onb__illu onb__illu--lav" aria-hidden="true">
                <span className="onb__blob onb__blob--a" />
                <span className="onb__blob onb__blob--b" />
                <span className="onb__blob onb__blob--c" />
              </div>
              <h1 className="onb__title sa-serif">¿Cómo te llamas?</h1>
              <p className="onb__desc">
                Solo se guarda en tu dispositivo para saludarte. Sin cuentas ni correos.
              </p>
              <div className="onb__field">
                <IonInput
                  value={name}
                  onIonInput={(e) => setName(e.detail.value ?? '')}
                  placeholder="Tu nombre"
                  fill="solid"
                  className="onb__input"
                  maxlength={40}
                  enterkeyhint="done"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void finish();
                  }}
                />
              </div>
            </div>
          )}

          <div className="onb__bottom">
            <div className="onb__dots">
              {[...SLIDES, 'name'].map((_, i) => (
                <span key={i} className={`onb__dot ${i === step ? 'is-on' : ''}`} />
              ))}
            </div>
            <IonButton
              className="onb__next"
              onClick={next}
              shape="round"
            >
              {isNameStep ? 'Entrar a SerenApp' : 'Siguiente'}
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default OnboardingPage;
