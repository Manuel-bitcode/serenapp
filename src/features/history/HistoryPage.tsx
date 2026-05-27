import {
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonRouter,
  useIonViewWillEnter,
} from '@ionic/react';
import {
  cameraOutline,
  createOutline,
  handLeftOutline,
  sparklesOutline,
} from 'ionicons/icons';
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

interface CardContent {
  icon: string;
  color: 'lav' | 'mint' | 'warm';
  title: string;
  desc: string;
}

/** Deriva ícono, color, título y descripción de una línea según el tipo. */
function cardContent(entry: Entry): CardContent {
  switch (entry.type) {
    case 'touch':
      return {
        icon: handLeftOutline,
        color: 'lav',
        title: 'Sesión de calma',
        desc: `${touchVariantLabel[entry.variant]} · ${formatDuration(entry.durationMs)}`,
      };
    case 'photo': {
      const emotion = emotionByTag(entry.tag);
      return {
        icon: cameraOutline,
        color: 'mint',
        title: 'Capturaste una foto',
        desc: `Etiqueta: ${emotion.label} ${emotion.emoji}`,
      };
    }
    case 'text': {
      const body = entry.body.trim().replace(/\s+/g, ' ');
      const snippet = body.length > 45 ? `${body.slice(0, 45)}…` : body;
      return {
        icon: createOutline,
        color: 'warm',
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
      <IonHeader>
        <IonToolbar>
          <IonTitle>Tu historial</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="sa-content" fullscreen>
        <div className="sa-screen hist">
          {isEmpty ? (
            <div className="sa-empty">
              <span className="sa-ic sa-ic--lav hist-empty__ic">
                <IonIcon aria-hidden="true" icon={sparklesOutline} />
              </span>
              <div className="sa-empty__title sa-serif">Aún no hay entradas</div>
              <p>
                Cuando sientas, captures o escribas algo, lo encontrarás aquí,
                en orden, solo para ti.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <div className="hist-day" key={group.key}>
                <div className="sa-section-label">{group.header}</div>
                {group.entries.map((entry) => {
                  const c = cardContent(entry);
                  return (
                    <button
                      key={entry.id}
                      className="sa-card hist-card"
                      onClick={() => router.push(`/entry/${entry.id}`, 'forward', 'push')}
                    >
                      <span className={`sa-ic sa-ic--${c.color}`}>
                        <IonIcon aria-hidden="true" icon={c.icon} />
                      </span>
                      <span className="hist-card__body">
                        <span className="hist-card__title">{c.title}</span>
                        <span className="hist-card__desc">{c.desc}</span>
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
