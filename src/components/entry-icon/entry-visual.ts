/* Mapping único type → {ícono, color de marca} para los 3 módulos de SerenApp.
 * Antes vivía duplicado en HomePage (módulos), HistoryPage (lista) y
 * EntryDetailPage (detalle). Hoy hay UNA sola fuente de verdad.
 */
import { cameraOutline, createOutline, handLeftOutline } from 'ionicons/icons';
import type { EntryType } from '../../data/types';

export type EntryAccent = 'lav' | 'mint' | 'warm';

export interface EntryVisual {
  icon: string;
  color: EntryAccent;
}

export const ENTRY_VISUAL: Record<EntryType, EntryVisual> = {
  touch: { icon: handLeftOutline, color: 'lav' },
  photo: { icon: cameraOutline, color: 'mint' },
  text: { icon: createOutline, color: 'warm' },
};
