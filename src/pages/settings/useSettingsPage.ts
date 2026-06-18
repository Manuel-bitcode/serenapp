import { useState } from 'react';
import { useIonRouter, useIonViewWillEnter } from '@ionic/react';
import { useProfile } from '../../hooks/useProfile';
import { useSettings } from '../../hooks/useSettings';
import {
  setName as persistName,
  clearProfile,
} from '../../services/profile';
import {
  syncReminder,
  notificationsAvailable,
} from '../../services/notifications';
import {
  clearAllEntries,
  entryCounts,
  type EntryCounts,
} from '../../services/entries';
import { clearSettings } from '../../services/settings';

/**
 * Lógica completa de Ajustes: perfil, recordatorio,
 * tema/texto y borrado de datos. La page solo cablea props del hook a la UI.
 */
export function useSettingsPage() {
  const router = useIonRouter();
  const { settings, update } = useSettings();
  const { profile, refresh: refreshProfile } = useProfile();

  const [counts, setCounts] = useState<EntryCounts | null>(null);
  const [nameAlertOpen, setNameAlertOpen] = useState(false);
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [wipeStep1Open, setWipeStep1Open] = useState(false);
  const [wipeStep2Open, setWipeStep2Open] = useState(false);

  useIonViewWillEnter(() => {
    void entryCounts().then(setCounts);
    void refreshProfile();
  });

  const profileName = profile?.name ?? '';
  const reminderEnabled = settings?.reminderEnabled ?? false;
  const reminderTime = settings?.reminderTime ?? '20:30';
  // Valor ISO para IonDatetime a partir de "HH:mm".
  const reminderIso = `2024-01-01T${reminderTime}:00`;

  const countsLabel = counts
    ? `${counts.text} escritas · ${counts.photo} fotos · ${counts.touch} sesiones`
    : 'Cargando…';

  // Persistir recordatorio + reprogramar la notificación local nativa.
  const applyReminder = async (enabled: boolean, time: string) => {
    await update({ reminderEnabled: enabled, reminderTime: time });
    await syncReminder(enabled, time, profileName);
  };

  const toggleReminder = (enabled: boolean) => {
    void applyReminder(enabled, reminderTime);
  };

  const setReminderFromIso = (
    value: string | string[] | null | undefined,
  ): void => {
    const raw = Array.isArray(value) ? value[0] : value;
    if (!raw) return;
    const time = raw.includes('T') ? raw.slice(11, 16) : raw.slice(0, 5);
    void applyReminder(reminderEnabled, time);
  };

  const saveName = (name: string): void => {
    void (async () => {
      await persistName(name);
      await refreshProfile();
    })();
  };

  const goToTutorial = () => router.push('/onboarding', 'forward', 'push');

  const wipeAll = async () => {
    await clearAllEntries();
    await clearSettings();
    await clearProfile();
    router.push('/onboarding', 'root', 'replace');
  };

  return {
    settings,
    profileName,
    reminderEnabled,
    reminderTime,
    reminderIso,
    countsLabel,
    nativeNotifications: notificationsAvailable(),

    // acciones / handlers
    update,
    toggleReminder,
    setReminderFromIso,
    saveName,
    goToTutorial,

    // diálogos
    nameAlertOpen,
    openNameAlert: () => setNameAlertOpen(true),
    closeNameAlert: () => setNameAlertOpen(false),
    timeModalOpen,
    openTimeModal: () => setTimeModalOpen(true),
    closeTimeModal: () => setTimeModalOpen(false),
    wipeStep1Open,
    openWipe: () => setWipeStep1Open(true),
    closeWipe1: () => setWipeStep1Open(false),
    wipeStep2Open,
    advanceWipe: () => setWipeStep2Open(true),
    closeWipe2: () => setWipeStep2Open(false),
    confirmWipe: () => {
      void wipeAll();
    },
  };
}
