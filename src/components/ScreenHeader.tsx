import type { ReactNode } from 'react';
import {
  IonBackButton,
  IonButtons,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/react';

interface ScreenHeaderProps {
  title: string;
  /** Si se da, muestra un <IonBackButton defaultHref={backHref} /> al inicio. */
  backHref?: string;
  /** Contenido opcional del slot="end" (p. ej. botón de acción a la derecha). */
  end?: ReactNode;
}

/**
 * Header de pantalla unificado para las páginas con barra superior (capture, write,
 * history, entry-detail, settings). Mantiene una sola fuente de verdad para el
 * look de los toolbars y reduce boilerplate.
 */
const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, backHref, end }) => (
  <IonHeader>
    <IonToolbar>
      {backHref && (
        <IonButtons slot="start">
          <IonBackButton defaultHref={backHref} />
        </IonButtons>
      )}
      <IonTitle>{title}</IonTitle>
      {end && <IonButtons slot="end">{end}</IonButtons>}
    </IonToolbar>
  </IonHeader>
);

export default ScreenHeader;
