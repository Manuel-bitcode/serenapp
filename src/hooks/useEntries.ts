import { useCallback, useEffect, useState } from 'react';
import type { Entry } from '../data/types';
import { listEntries } from '../services/entries';

export function useEntries() {
  const [entries, setEntries] = useState<Entry[] | null>(null);

  const refresh = useCallback(async () => {
    setEntries(await listEntries());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { entries, refresh };
}
