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
} from '@ionic/react';
import { chevronForward } from 'ionicons/icons';
import ScreenHeader from '../../components/screen-header/ScreenHeader';
import type { TextScale, ThemePref } from '../../data/types';
import { useSettingsPage } from './useSettingsPage';
import './settings.css';

const APP_VERSION = '0.1.0';

const textScaleLabel: Record<TextScale, string> = {
  normal: 'Normal',
  grande: 'Grande',
  mayor: 'Mayor',
};

/** Pantalla 09 — Ajustes: perfil, notificaciones, apariencia, datos. */
const SettingsPage: React.FC = () => {
  const s = useSettingsPage();

  return (
    <IonPage>
      <ScreenHeader title="Ajustes" />
      <IonContent className="sa-content" fullscreen>
        <div className="sa-screen settings">
          {/* ---------- Perfil local ---------- */}
          <div className="sa-section-label">Perfil local</div>
          <IonList inset className="set-list">
            <IonItem button detail={false} onClick={s.openNameAlert}>
              <IonLabel>
                <h3>Nombre</h3>
                <p>Se muestra en el saludo del Home</p>
              </IonLabel>
              <IonNote slot="end" className="set-val">
                {s.profileName || 'Sin nombre'}
              </IonNote>
              <IonIcon
                aria-hidden="true"
                icon={chevronForward}
                slot="end"
                className="set-chev"
              />
            </IonItem>
          </IonList>

          {/* ---------- Notificaciones ---------- */}
          <div className="sa-section-label">Notificaciones</div>
          <IonList inset className="set-list">
            <IonItem>
              <IonLabel>
                <h3>Recordatorio diario</h3>
                <p>Invita a registrar tu sentir</p>
              </IonLabel>
              <IonToggle
                slot="end"
                checked={s.reminderEnabled}
                onIonChange={(e) => s.toggleReminder(e.detail.checked)}
                aria-label="Activar recordatorio diario"
              />
            </IonItem>
            <IonItem
              button
              detail={false}
              disabled={!s.reminderEnabled}
              onClick={s.openTimeModal}
            >
              <IonLabel>
                <h3>Hora</h3>
                <p>Cuándo llega la notificación</p>
              </IonLabel>
              <IonNote slot="end" className="set-val">
                {s.reminderTime}
              </IonNote>
              <IonIcon
                aria-hidden="true"
                icon={chevronForward}
                slot="end"
                className="set-chev"
              />
            </IonItem>
          </IonList>
          {!s.nativeNotifications && (
            <p className="set-hint">
              El recordatorio se activará en tu dispositivo (Android/iOS).
            </p>
          )}

          {/* ---------- Apariencia ---------- */}
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
                value={s.settings?.theme ?? 'system'}
                onIonChange={(e) =>
                  void s.update({ theme: (e.detail.value as ThemePref) ?? 'system' })
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
                value={s.settings?.textScale ?? 'normal'}
                onIonChange={(e) =>
                  void s.update({ textScale: e.detail.value as TextScale })
                }
                aria-label="Tamaño de texto"
              >
                <IonSelectOption value="normal">{textScaleLabel.normal}</IonSelectOption>
                <IonSelectOption value="grande">{textScaleLabel.grande}</IonSelectOption>
                <IonSelectOption value="mayor">{textScaleLabel.mayor}</IonSelectOption>
              </IonSelect>
            </IonItem>
          </IonList>

          {/* ---------- Datos ---------- */}
          <div className="sa-section-label">Datos</div>
          <IonList inset className="set-list">
            <IonItem>
              <IonLabel>
                <h3>Tus entradas</h3>
                <p>{s.countsLabel}</p>
              </IonLabel>
            </IonItem>
            <IonItem button detail={false} onClick={s.goToTutorial}>
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
            <IonItem button detail={false} className="set-danger" onClick={s.openWipe}>
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

        {/* Editar nombre */}
        <IonAlert
          isOpen={s.nameAlertOpen}
          header="Tu nombre"
          message="Se usa solo en tu dispositivo para saludarte."
          inputs={[
            {
              name: 'name',
              type: 'text',
              value: s.profileName,
              placeholder: 'Tu nombre',
              attributes: { maxlength: 40 },
            },
          ]}
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            {
              text: 'Guardar',
              handler: (data: { name?: string }) => s.saveName(data.name ?? ''),
            },
          ]}
          onDidDismiss={s.closeNameAlert}
        />

        {/* Selector de hora del recordatorio */}
        <IonModal
          isOpen={s.timeModalOpen}
          onDidDismiss={s.closeTimeModal}
          className="set-time-modal"
        >
          <div className="set-time">
            <IonDatetime
              presentation="time"
              value={s.reminderIso}
              locale="es-ES"
              onIonChange={(e) => s.setReminderFromIso(e.detail.value)}
            />
            <IonButton expand="block" onClick={s.closeTimeModal}>
              Listo
            </IonButton>
          </div>
        </IonModal>

        {/* Borrar datos — doble confirmación */}
        <IonAlert
          isOpen={s.wipeStep1Open}
          header="Borrar todos los datos"
          message="Se eliminarán tus entradas, ajustes y nombre. Esta acción no se puede deshacer."
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            { text: 'Continuar', role: 'destructive', handler: s.advanceWipe },
          ]}
          onDidDismiss={s.closeWipe1}
        />
        <IonAlert
          isOpen={s.wipeStep2Open}
          header="¿Seguro?"
          message="Confirma para borrar definitivamente todo en este dispositivo."
          buttons={[
            { text: 'No, conservar', role: 'cancel' },
            { text: 'Sí, borrar todo', role: 'destructive', handler: s.confirmWipe },
          ]}
          onDidDismiss={s.closeWipe2}
        />
      </IonContent>
    </IonPage>
  );
};

export default SettingsPage;
