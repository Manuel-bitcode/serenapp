import { IonContent, IonIcon, IonPage } from '@ionic/react';
import { sparklesOutline } from 'ionicons/icons';
import EmptyState from '../../components/empty-state/EmptyState';
import EntryIcon from '../../components/entry-icon/EntryIcon';
import ScreenHeader from '../../components/screen-header/ScreenHeader';
import { useHistoryPage } from './useHistoryPage';
import './history.css';

/** Pantalla 08 — Historial cronológico unificado. */
const HistoryPage: React.FC = () => {
  const { groups, isEmpty, openEntry, cardText } = useHistoryPage();

  return (
    <IonPage>
      <ScreenHeader title="Tu historial" />
      <IonContent className="sa-content" fullscreen>
        <div className="sa-screen hist">
          {isEmpty ? (
            <EmptyState
              icon={
                <span className="sa-ic sa-ic--lav hist-empty__ic">
                  <IonIcon aria-hidden="true" icon={sparklesOutline} />
                </span>
              }
              title="Aún no hay entradas"
            >
              Cuando sientas, captures o escribas algo, lo encontrarás aquí,
              en orden, solo para ti.
            </EmptyState>
          ) : (
            groups.map((group) => (
              <div className="hist-day" key={group.key}>
                <div className="sa-section-label">{group.header}</div>
                {group.entries.map((entry) => {
                  const t = cardText(entry);
                  return (
                    <button
                      key={entry.id}
                      className="sa-card hist-card"
                      onClick={() => openEntry(entry.id)}
                    >
                      <EntryIcon type={entry.type} />
                      <span className="hist-card__body">
                        <span className="hist-card__title">{t.title}</span>
                        <span className="hist-card__desc">{t.desc}</span>
                      </span>
                      {entry.type === 'photo' && (
                        <img
                          className="hist-card__thumb"
                          src={entry.dataUrl}
                          alt=""
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default HistoryPage;
