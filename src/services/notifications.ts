/* SerenApp — recordatorio diario programable (RF6) con @capacitor/local-notifications.
 * En web el plugin no programa notificaciones nativas: el ajuste igual se guarda y la UI
 * informa que el recordatorio aplica en el dispositivo. Todo guardado con guardas de plataforma.
 */
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const REMINDER_ID = 1001;

export function notificationsAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

export async function ensurePermission(): Promise<boolean> {
  if (!notificationsAvailable()) return false;
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === 'granted';
  } catch {
    return false;
  }
}

export async function cancelDailyReminder(): Promise<void> {
  if (!notificationsAvailable()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
  } catch {
    /* nada que cancelar */
  }
}

/**
 * Programa (o reprograma) el recordatorio diario a la hora "HH:mm".
 * Devuelve true si quedó programado en el dispositivo.
 */
export async function scheduleDailyReminder(
  time: string,
  name?: string,
): Promise<boolean> {
  if (!notificationsAvailable()) return false;
  const granted = await ensurePermission();
  if (!granted) return false;

  const [hour, minute] = time.split(':').map((n) => parseInt(n, 10));
  await cancelDailyReminder();
  await LocalNotifications.schedule({
    notifications: [
      {
        id: REMINDER_ID,
        title: 'SerenApp',
        body: `${name ? `${name}, ` : ''}¿cómo te sientes ahora? Tómate un momento para registrarlo.`,
        schedule: { on: { hour, minute }, allowWhileIdle: true },
      },
    ],
  });
  return true;
}

/** Sincroniza el estado del recordatorio con los ajustes actuales. */
export async function syncReminder(
  enabled: boolean,
  time: string,
  name?: string,
): Promise<boolean> {
  if (!enabled) {
    await cancelDailyReminder();
    return false;
  }
  return scheduleDailyReminder(time, name);
}
