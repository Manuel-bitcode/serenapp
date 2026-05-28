import {
  IonContent,
  IonIcon,
  IonPage,
  useIonRouter,
  useIonViewWillEnter,
} from '@ionic/react';
import { sparklesOutline } from 'ionicons/icons';
import EmptyState from '../../components/EmptyState';
import EntryIcon from '../../components/EntryIcon';
import ScreenHeader from '../../components/ScreenHeader';
import { useEntries } from '../../hooks/useEntries';
import {
  emotionByTag,
  touchVariantLabel,
  type Entry,
} from '../../data/types';
import './history.css';

/** mm:ss legible a partir de una duración en ms. */
function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}

/** Clave de día (YYYY-MM-DD en hora local) para agrupar entradas. */
function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const dayLabelFmt = new Intl.DateTimeFormat('es', {
  day: 'numeric',
  month: 'short',
});

/** "Hoy", "Ayer" o "D MMM" en español. */
function dayHeader(ts: number): string {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const k = dayKey(ts);
  if (k === dayKey(today.getTime())) return 'Hoy';
  if (k === dayKey(yesterday.getTime())) return 'Ayer';
  return dayLabelFmt.format(new Date(ts));
}

interface DayGroup {
  key: string;
  header: string;
  entries: Entry[];
}

/** Agrupa entradas (ya ordenadas desc) por día conservando el orden. */
function groupByDay(entries: Entry[]): DayGroup[] {
  const groups: DayGroup[] = [];
  let current: DayGroup | null = null;
  for (const entry of entries) {
    const key = dayKey(entry.createdAt);
    if (!current || current.key !== key) {
      current = { key, header: dayHeader(entry.createdAt), entries: [] };
      groups.push(current);
    }
    current.entries.push(entry);
  }
  return groups;
}

/** Texto título+descripción para la tarjeta de una entrada (ícono y color
 *  se resuelven con <EntryIcon type={entry.type} /> vía ENTRY_VISUAL). */
function cardText(entry: Entry): { title: string; desc: string } {
  switch (entry.type) {
    case 'touch':
      return {
        title: 'Sesión de calma',
        desc: `${touchVariantLabel[entry.variant]} · ${formatDuration(entry.durationMs)}`,
      };
    case 'photo': {
      const emotion = emotionByTag(entry.tag);
      return {
        title: 'Capturaste una foto',
        desc: `Etiqueta: ${emotion.label} ${emotion.emoji}`,
      };
    }
    case 'text': {
      const body = entry.body.trim().replace(/\s+/g, ' ');
      const snippet = body.length > 45 ? `${body.slice(0, 45)}…` : body;
      return {
        title: 'Escribiste',
        desc: snippet || 'Entrada de escritura',
      };
    }
  }
}

/** Pantalla 08 — Historial cronológico unificado (RF3/RF5). */
const HistoryPage: React.FC = () => {
  const router = useIonRouter();
  const { entries, refresh } = useEntries();

  // Recargar al volver a la pestaña para que nuevas entradas aparezcan (RF3/RF5).
  useIonViewWillEnter(() => {
    void refresh();
  });

  const groups = entries ? groupByDay(entries) : [];
  const isEmpty = entries !== null && entries.length === 0;

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
                      onClick={() => router.push(`/entry/${entry.id}`, 'forward', 'push')}
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
