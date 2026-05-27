/* SerenApp — servicio de entradas. CRUD del historial unificado (RF3/RF5).
 * Única vía de acceso a la tabla `entries`; los módulos no tocan Dexie directo.
 */
import { db } from '../data/db';
import type { Entry, EmotionTag, TouchVariant } from '../data/types';

export async function addTouchEntry(
  variant: TouchVariant,
  durationMs: number,
): Promise<number> {
  return db.entries.add({
    type: 'touch',
    variant,
    durationMs,
    createdAt: Date.now(),
  });
}

export async function addPhotoEntry(
  dataUrl: string,
  tag: EmotionTag,
): Promise<number> {
  return db.entries.add({
    type: 'photo',
    dataUrl,
    tag,
    createdAt: Date.now(),
  });
}

export async function addTextEntry(
  prompt: string,
  body: string,
): Promise<number> {
  return db.entries.add({
    type: 'text',
    prompt,
    body,
    createdAt: Date.now(),
  });
}

/** Historial completo en orden cronológico inverso (lo más reciente primero). */
export async function listEntries(): Promise<Entry[]> {
  return db.entries.orderBy('createdAt').reverse().toArray();
}

export async function getEntry(id: number): Promise<Entry | undefined> {
  return db.entries.get(id);
}

export async function deleteEntry(id: number): Promise<void> {
  await db.entries.delete(id);
}

/** Borra todas las entradas (acción "Borrar todos los datos" de Ajustes). */
export async function clearAllEntries(): Promise<void> {
  await db.entries.clear();
}

export interface EntryCounts {
  text: number;
  photo: number;
  touch: number;
  total: number;
}

export async function entryCounts(): Promise<EntryCounts> {
  const all = await db.entries.toArray();
  const count = (t: Entry['type']) => all.filter((e) => e.type === t).length;
  return {
    text: count('text'),
    photo: count('photo'),
    touch: count('touch'),
    total: all.length,
  };
}
