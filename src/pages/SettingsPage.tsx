import { useState } from 'react';
import {
  IonAlert,
  IonButton,
  IonContent,
  IonDatetime,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonToggle,
  useIonRouter,
  useIonViewWillEnter,
} from '@ionic/react';
import ScreenHeader from '../components/ScreenHeader';
import { chevronForward } from 'ionicons/icons';
import { useSettings } from '../hooks/useSettings';
import { useProfile } from '../hooks/useProfile';
import { setName as persistName } from '../services/profile';
import { syncReminder, notificationsAvailable } from '../services/notifications';
import {
  clearAllEntries,
  entryCounts,
  type EntryCounts,
} from '../services/entries';
import { clearSettings } from '../services/settings';
import { clearProfile } from '../services/profile';
import type { ThemePref, TextScale } from '../data/types';
import './settings.css';

const APP_VERSION = '0.1.0';

const textScaleLabel: Record<TextScale, string> = {
  normal: 'Normal',
  grande: 'Grande',
  mayor: 'Mayor',
};

/** Pantalla 09 — Ajustes: perfil (RF7), notificaciones (RF6), apariencia (RNF5), datos (RNF3). */
const SettingsPage: React.FC = () => {
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

  // Persistir recordatorio + reprogramar la notificación local nativa (RF6).
  const applyReminder = async (enabled: boolean, time: string) => {
    await update({ reminderEnabled: enabled, reminderTime: time });
    await syncReminder(enabled, time, profileName);
  };

  const handleToggleReminder = (enabled: boolean) => {
    void applyReminder(enabled, reminderTime);
  };

  const handleTimeChange = (value: string | string[] | null | undefined) => {
    const raw = Array.isArray(value) ? value[0] : value;
    if (!raw) return;
    // IonDatetime devuelve ISO; nos quedamos con HH:mm.
    const time = raw.includes('T') ? raw.slice(11, 16) : raw.slice(0, 5);
    void applyReminder(reminderEnabled, time);
  };

  const handleWipe = async () => {
    await clearAllEntries();
    await clearSettings();
    await clearProfile();
    router.push('/onboarding', 'root', 'replace');
  };

  // Valor ISO para el datetime a partir de "HH:mm".
  const reminderIso = `2024-01-01T${reminderTime}:00`;

  const countsLabel = counts
    ? `${counts.text} escritas · ${counts.photo} fotos · ${counts.touch} sesiones`
    : 'Cargando…';

  return (
    <IonPage>
      <ScreenHeader title="Ajustes" />
      <IonContent className="sa-content" fullscreen>
        <div className="sa-screen settings">
          {/* ---------- Perfil local (RF7) ---------- */}
          <div className="sa-section-label">Perfil local</div>
          <IonList inset className="set-list">
            <IonItem button detail={false} onClick={() => setNameAlertOpen(true)}>
              <IonLabel>
                <h3>Nombre</h3>
                <p>Se muestra en el saludo del Home</p>
              </IonLabel>
              <IonNote slot="end" className="set-val">
                {profileName || 'Sin nombre'}
              </IonNote>
              <IonIcon
                aria-hidden="true"
                icon={chevronForward}
                slot="end"
                className="set-chev"
              />
            </IonItem>
          </IonList>

          {/* ---------- Notificaciones (RF6) ---------- */}
          <div className="sa-section-label">Notificaciones</div>
          <IonList inset className="set-list">
            <IonItem>
              <IonLabel>
                <h3>Recordatorio diario</h3>
                <p>Invita a registrar tu sentir</p>
              </IonLabel>
              <IonToggle
                slot="end"
                checked={reminderEnabled}
                onIonChange={(e) => handleToggleReminder(e.detail.checked)}
                aria-label="Activar recordatorio diario"
              />
            </IonItem>
            <IonItem
              button
              detail={false}
              disabled={!reminderEnabled}
              onClick={() => setTimeModalOpen(true)}
            >
              <IonLabel>
                <h3>Hora</h3>
                <p>Cuándo llega la notificación</p>
              </IonLabel>
              <IonNote slot="end" className="set-val">
                {reminderTime}
              </IonNote>
              <IonIcon
                aria-hidden="true"
                icon={chevronForward}
                slot="end"
                className="set-chev"
              />
            </IonItem>
          </IonList>
          {!notificationsAvailable() && (
            <p className="set-hint">
              El recordatorio se activará en tu dispositivo (Android/iOS).
            </p>
          )}

          {/* ---------- Apariencia (RNF5) ---------- */}
          <div className="sa-section-label">Apariencia</div>
          <IonList inset className="set-list">
            <IonItem lines="full" className="set-segment-item">
              <IonLabel>
                <h3>Tema</h3>
                <p>Claro, oscuro o según el sistema</p>
              </IonLabel>
            </IonItem>
            <IonItem lines="none" className="set-segment-wrap">
              <IonSegment
                value={settings?.theme ?? 'system'}
                onIonChange={(e) =>
                  void update({ theme: (e.detail.value as ThemePref) ?? 'system' })
                }
              >
                <IonSegmentButton value="system">
                  <IonLabel>Sistema</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="light">
                  <IonLabel>Claro</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="dark">
                  <IonLabel>Oscuro</IonLabel>
                </IonSegmentButton>
              </IonSegment>
            </IonItem>
            <IonItem>
              <IonLabel>
                <h3>Tamaño de texto</h3>
                <p>Mejora la legibilidad</p>
              </IonLabel>
              <IonSelect
                slot="end"
                interface="action-sheet"
                value={settings?.textScale ?? 'normal'}
                onIonChange={(e) =>
                  void update({ textScale: e.detail.value as TextScale })
                }
                aria-label="Tamaño de texto"
              >
                <IonSelectOption value="normal">{textScaleLabel.normal}</IonSelectOption>
                <IonSelectOption value="grande">{textScaleLabel.grande}</IonSelectOption>
                <IonSelectOption value="mayor">{textScaleLabel.mayor}</IonSelectOption>
              </IonSelect>
            </IonItem>
          </IonList>

          {/* ---------- Datos (RNF3) ---------- */}
          <div className="sa-section-label">Datos</div>
          <IonList inset className="set-list">
            <IonItem>
              <IonLabel>
                <h3>Tus entradas</h3>
                <p>{countsLabel}</p>
              </IonLabel>
            </IonItem>
            <IonItem
              button
              detail={false}
              onClick={() => router.push('/onboarding', 'forward', 'push')}
            >
              <IonLabel>
                <h3>Volver a ver el tutorial</h3>
                <p>Onboarding inicial</p>
              </IonLabel>
              <IonIcon
                aria-hidden="true"
                icon={chevronForward}
                slot="end"
                className="set-chev"
              />
            </IonItem>
            <IonItem
              button
              detail={false}
              className="set-danger"
              onClick={() => setWipeStep1Open(true)}
            >
              <IonLabel color="danger">
                <h3>Borrar todos los datos</h3>
                <p>Acción irreversible · solo local</p>
              </IonLabel>
            </IonItem>
          </IonList>

          {/* ---------- Acerca de ---------- */}
          <div className="sa-section-label">Acerca de</div>
          <IonList inset className="set-list">
            <IonItem lines="full">
              <IonLabel>
                <h3>SerenApp</h3>
                <p>Versión {APP_VERSION} · Proyecto académico</p>
              </IonLabel>
            </IonItem>
            <IonItem>
              <IonLabel>
                <p className="set-privacy">Datos guardados solo en este dispositivo</p>
              </IonLabel>
            </IonItem>
          </IonList>
        </div>

        {/* Editar nombre (RF7) */}
        <IonAlert
          isOpen={nameAlertOpen}
          header="Tu nombre"
          message="Se usa solo en tu dispositivo para saludarte."
          inputs={[
            {
              name: 'name',
              type: 'text',
              value: profileName,
              placeholder: 'Tu nombre',
              attributes: { maxlength: 40 },
            },
          ]}
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            {
              text: 'Guardar',
              handler: (data: { name?: string }) => {
                void (async () => {
                  await persistName(data.name ?? '');
                  await refreshProfile();
                })();
              },
            },
          ]}
          onDidDismiss={() => setNameAlertOpen(false)}
        />

        {/* Selector de hora del recordatorio (RF6) */}
        <IonModal
          isOpen={timeModalOpen}
          onDidDismiss={() => setTimeModalOpen(false)}
          className="set-time-modal"
        >
          <div className="set-time">
            <IonDatetime
              presentation="time"
              value={reminderIso}
              locale="es-ES"
              onIonChange={(e) => handleTimeChange(e.detail.value)}
            />
            <IonButton expand="block" onClick={() => setTimeModalOpen(false)}>
              Listo
            </IonButton>
          </div>
        </IonModal>

        {/* Borrar datos — doble confirmación (RNF3) */}
        <IonAlert
          isOpen={wipeStep1Open}
          header="Borrar todos los datos"
          message="Se eliminarán tus entradas, ajustes y nombre. Esta acción no se puede deshacer."
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            {
              text: 'Continuar',
              role: 'destructive',
              handler: () => {
                setWipeStep2Open(true);
              },
            },
          ]}
          onDidDismiss={() => setWipeStep1Open(false)}
        />
        <IonAlert
          isOpen={wipeStep2Open}
          header="¿Seguro?"
          message="Confirma para borrar definitivamente todo en este dispositivo."
          buttons={[
            { text: 'No, conservar', role: 'cancel' },
            {
              text: 'Sí, borrar todo',
              role: 'destructive',
              handler: () => {
                void handleWipe();
              },
            },
          ]}
          onDidDismiss={() => setWipeStep2Open(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default SettingsPage;
