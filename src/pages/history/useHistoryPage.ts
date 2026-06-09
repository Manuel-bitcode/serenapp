import { useIonRouter, useIonViewWillEnter } from '@ionic/react';
import { useEntries } from '../../hooks/useEntries';
import {
  emotionByTag,
  touchVariantLabel,
  type Entry,
} from '../../data/types';

/** mm:ss legible a partir de una duración en ms. */
function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}

/** Clave de día (YYYY-M-D en hora local) para agrupar entradas. */
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

export interface DayGroup {
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

/** Texto título+descripción para la tarjeta (ícono y color salen de EntryIcon). */
export function cardText(entry: Entry): { title: string; desc: string } {
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

/** Lógica del Historial: entries cargadas, agrupadas por día, navegación al detalle. */
export function useHistoryPage() {
  const router = useIonRouter();
  const { entries, refresh } = useEntries();

  // Recargar al volver a la pestaña para que aparezcan nuevas entradas.
  useIonViewWillEnter(() => {
    void refresh();
  });

  const groups = entries ? groupByDay(entries) : [];
  const isEmpty = entries !== null && entries.length === 0;

  const openEntry = (id?: number) => {
    if (id !== undefined) router.push(`/entry/${id}`, 'forward', 'push');
  };

  return { groups, isEmpty, openEntry, cardText };
}
