import { IonContent, IonIcon, IonPage } from '@ionic/react';
import { close, refresh, volumeHigh, volumeMute } from 'ionicons/icons';
import type { TouchVariant } from '../../data/types';
import { useTouchPage } from './useTouchPage';
import './touch.css';

/* RF1 — módulo "Siente": 4 mini-experiencias táctiles elegidas al azar.
 * Toda la lógica (variant, cronómetro, motor, gestos, audio, mute, reshuffle,
 * registro de sesión) vive en useTouchPage. Aquí solo el JSX y el cableado. */

const HINTS: Record<TouchVariant, string> = {
  bubbles: 'Toca las burbujas para estallarlas',
  sand: 'Desliza para mover la arena',
  particles: 'Mueve las partículas con el dedo',
  constellation: 'Toca para crear estrellas; arrastra para unirlas',
};

function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

const TouchPage: React.FC = () => {
  const {
    variant,
    elapsed,
    hintVisible,
    muted,
    stageRef,
    canvasRef,
    toggleMute,
    handleClose,
    handleReshuffle,
  } = useTouchPage();

  return (
    <IonPage>
      <IonContent className="touch-content" fullscreen scrollY={false}>
        <div className={`touch-stage touch-stage--${variant}`} ref={stageRef}>
          <canvas
            // key por variant: React entrega un canvas FRESCO al reordenar (↻).
            // PixiJS no puede reusar el mismo canvas tras destruir su contexto WebGL.
            key={variant}
            ref={canvasRef}
            className="sa-canvas-stage touch-canvas"
            aria-label={`Experiencia táctil: ${HINTS[variant]}`}
            role="img"
          />

          <div className="touch-ui">
            <div className="touch-top">
              <button
                type="button"
                className="touch-btn"
                aria-label="Cerrar y volver"
                onClick={handleClose}
              >
                <IonIcon icon={close} aria-hidden="true" />
              </button>

              <div className="touch-timer" aria-live="off">
                {formatClock(elapsed)}
              </div>

              <div className="touch-actions">
                <button
                  type="button"
                  className="touch-btn"
                  aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
                  aria-pressed={muted}
                  onClick={toggleMute}
                >
                  <IonIcon
                    icon={muted ? volumeMute : volumeHigh}
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  className="touch-btn"
                  aria-label="Otra experiencia"
                  onClick={handleReshuffle}
                >
                  <IonIcon icon={refresh} aria-hidden="true" />
                </button>
              </div>
            </div>

            <p
              className={`touch-hint${hintVisible ? '' : ' touch-hint--hidden'}`}
            >
              {HINTS[variant]}
            </p>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default TouchPage;
