import { useCallback, useEffect, useState } from 'react';
import type { Profile } from '../data/types';
import { getProfile, saveProfile } from '../services/profile';

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setProfile(await getProfile());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const update = useCallback(async (patch: Partial<Profile>) => {
    const next = await saveProfile(patch);
    setProfile(next);
    return next;
  }, []);

  return { profile, loading, refresh, update };
}
