/* ajustes en Capacitor Preferences (tema, tamaño de texto, recordatorio). */
import { Preferences } from '@capacitor/preferences';
import type { Settings } from '../data/types';

const KEY = 'serenapp.settings';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  textScale: 'normal',
  reminderEnabled: false,
  reminderTime: '20:30',
};

export async function getSettings(): Promise<Settings> {
  const { value } = await Preferences.get({ key: KEY });
  if (!value) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(value) as Partial<Settings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next: Settings = { ...current, ...patch };
  await Preferences.set({ key: KEY, value: JSON.stringify(next) });
  return next;
}

export async function clearSettings(): Promise<void> {
  await Preferences.remove({ key: KEY });
}
