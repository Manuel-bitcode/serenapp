/* perfil local. Nombre + flag de onboarding en Capacitor Preferences.
 * Sin registro, correo, contraseña ni backend.
 */
import { Preferences } from '@capacitor/preferences';
import type { Profile } from '../data/types';

const KEY = 'serenapp.profile';
const DEFAULT: Profile = { name: '', onboarded: false };

export async function getProfile(): Promise<Profile> {
  const { value } = await Preferences.get({ key: KEY });
  if (!value) return { ...DEFAULT };
  try {
    return { ...DEFAULT, ...(JSON.parse(value) as Partial<Profile>) };
  } catch {
    return { ...DEFAULT };
  }
}

export async function saveProfile(patch: Partial<Profile>): Promise<Profile> {
  const current = await getProfile();
  const next: Profile = { ...current, ...patch };
  await Preferences.set({ key: KEY, value: JSON.stringify(next) });
  return next;
}

export async function setName(name: string): Promise<Profile> {
  return saveProfile({ name: name.trim() });
}

/** Cierra el onboarding guardando el nombre local. */
export async function completeOnboarding(name: string): Promise<Profile> {
  return saveProfile({ name: name.trim(), onboarded: true });
}

/** Borra el perfil (parte de "Borrar todos los datos"). */
export async function clearProfile(): Promise<void> {
  await Preferences.remove({ key: KEY });
}
