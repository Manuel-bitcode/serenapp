import { useCallback, useEffect, useState } from 'react';
import type { Settings } from '../data/types';
import { getSettings, saveSettings } from '../services/settings';
import { initAppearance } from '../services/theme';

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);

  const refresh = useCallback(async () => {
    const s = await getSettings();
    setSettings(s);
    initAppearance(s.theme, s.textScale);
    return s;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Persiste cambios y re-aplica apariencia cuando cambia tema o tamaño de texto. */
  const update = useCallback(async (patch: Partial<Settings>) => {
    const next = await saveSettings(patch);
    setSettings(next);
    if (patch.theme !== undefined || patch.textScale !== undefined) {
      initAppearance(next.theme, next.textScale);
    }
    return next;
  }, []);

  return { settings, refresh, update };
}
