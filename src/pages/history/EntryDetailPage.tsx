import {
  IonAlert,
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
} from '@ionic/react';
import { trashOutline } from 'ionicons/icons';
import EmptyState from '../../components/empty-state/EmptyState';
import EntryIcon from '../../components/entry-icon/EntryIcon';
import ScreenHeader from '../../components/screen-header/ScreenHeader';
import { emotionByTag, touchVariantLabel } from '../../data/types';
import { useEntryDetailPage } from './useEntryDetailPage';
import './history.css';

/** mm:ss legible a partir de una duración en ms. */
function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}

const fullDateFmt = new Intl.DateTimeFormat('es', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

/** Fecha completa en español, con primera letra en mayúscula. */
function formatFullDate(ts: number): string {
  const text = fullDateFmt.format(new Date(ts));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Detalle de una entrada del historial. */
const EntryDetailPage: React.FC = () => {
  const { entry, loaded, confirmOpen, openConfirm, closeConfirm, handleDelete } =
    useEntryDetailPage();

  return (
    <IonPage>
      <ScreenHeader title="Entrada" backHref="/tabs/history" />
      <IonContent className="sa-content" fullscreen>
        <div className="sa-screen detail">
          {!entry ? (
            loaded && (
              <EmptyState title="Entrada no encontrada">
                Es posible que la hayas eliminado.
              </EmptyState>
            )
          ) : (
            <>
              <div className="detail__head">
                <EntryIcon type={entry.type} />
                <div className="detail__date">{formatFullDate(entry.createdAt)}</div>
              </div>

              {entry.type === 'text' && (
                <div className="sa-card detail__card">
                  <div className="detail__prompt sa-serif">{entry.prompt}</div>
                  <p className="detail__body">{entry.body}</p>
                </div>
              )}

              {entry.type === 'photo' && (
                <div className="sa-card detail__card detail__card--photo">
                  <img className="detail__photo" src={entry.dataUrl} alt="Foto guardada" />
                  <div className="detail__chip">
                    <span aria-hidden="true">{emotionByTag(entry.tag).emoji}</span>
                    {emotionByTag(entry.tag).label}
                  </div>
                </div>
              )}

              {entry.type === 'touch' && (
                <div className="sa-card detail__card">
                  <div className="detail__title sa-serif">Sesión de calma</div>
                  <dl className="detail__meta">
                    <div>
                      <dt>Experiencia</dt>
                      <dd>{touchVariantLabel[entry.variant]}</dd>
                    </div>
                    <div>
                      <dt>Duración</dt>
                      <dd>{formatDuration(entry.durationMs)}</dd>
                    </div>
                  </dl>
                </div>
              )}

              <IonButton
                expand="block"
                fill="clear"
                color="danger"
                className="detail__delete"
                onClick={openConfirm}
              >
                <IonIcon aria-hidden="true" icon={trashOutline} slot="start" />
                Eliminar entrada
              </IonButton>
            </>
          )}
        </div>

        <IonAlert
          isOpen={confirmOpen}
          header="Eliminar entrada"
          message="Esta acción es permanente y solo afecta a este dispositivo."
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            {
              text: 'Eliminar',
              role: 'destructive',
              handler: () => {
                void handleDelete();
              },
            },
          ]}
          onDidDismiss={closeConfirm}
        />
      </IonContent>
    </IonPage>
  );
};

export default EntryDetailPage;
