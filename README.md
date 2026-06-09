# SerenApp

App móvil de bienestar emocional para el ramo de _programación móvil_. La idea es simple:
cuando alguien abre la app probablemente está pasando un mal momento, así que la primera
pantalla no pide nada ni muestra tutoriales, solo ofrece tres formas de regularse. Todo
funciona offline y los datos se quedan en el dispositivo.

**Stack:** Ionic React 8, React 19, Vite, TypeScript, Capacitor 8, Dexie (IndexedDB),
PixiJS y matter.js.

## Las mecánicas

| Módulo | Qué hace | Cómo está hecho |
|---|---|---|
| Siente (lavanda) | Interacción táctil para calmar; al entrar se elige una de 4 experiencias al azar. | `bubbles` (físicas con matter.js + render PixiJS), `particles` (campo de ~1300 sprites), `sand` (autómata falling-sand en Canvas 2D) y `constellation` (cielo nocturno con PixiJS). El audio se genera/reproduce con la Web Audio API. |
| Captura (menta) | Toma una foto o elige de galería y la asocia a una emoción (6 etiquetas: calma, ansiedad, tristeza, enojo, alegría, neutral). | `@capacitor/camera`; la imagen se guarda local como dataURL. |
| Escribe (cálido) | Escritura guiada con preguntas que rotan (al menos 5). | Las entradas de texto se guardan localmente y se revisan desde el historial. |
| Historial | Vista cronológica de todo lo que registras. | Una sola tabla en IndexedDB para los 3 tipos de entrada. |

Además hay Ajustes (nombre, modo oscuro, escala de texto, recordatorio diario) y un perfil
local que se pide en el onboarding, sin registro ni correo.

## Ideas detrás

- **Local y offline.** Fotos, escritos e historial viven solo en el dispositivo (IndexedDB +
  Capacitor Preferences). No hay nube ni sincronización.
- **Sin fricción.** Un usuario nuevo puede completar una sesión (sensorial, foto, escritura)
  sin tutorial.
- **Accesible.** Respeta el tamaño de texto del sistema y el modo oscuro, con override manual
  en Ajustes usando las utilidades de Ionic.
- **Módulos independientes.** Cada mecánica se puede probar por separado.

## Correr en el navegador

```bash
npm install
npm run dev          # http://localhost:5173 (o el siguiente puerto libre)
```

En el navegador la cámara usa `@ionic/pwa-elements` y las notificaciones se simulan (el
recordatorio real se programa en el dispositivo).

## Pruebas

```bash
npm run lint
npm run test.unit    # vitest
npm run test.e2e     # cypress
```

## Build web

```bash
npm run build        # tsc + vite → dist/
```

## Compilar nativo

Requisitos: Node 18+, y según plataforma Xcode (iOS) o JDK 21 + Android SDK (Android).

### Android (APK)

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
npm run build && npx cap copy android
cd android && ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

(`android/local.properties` apunta `sdk.dir` al SDK; ajústalo a tu ruta.)

### iOS

Capacitor 8 usa Swift Package Manager (no CocoaPods).

```bash
npm run build && npx cap sync ios
npx cap open ios          # abrir Xcode, elegir equipo de firma y Run
```

## Arquitectura

Offline-first y módulos desacoplados. No hay imports entre pantallas: lo compartido pasa por
`services/`, `data/`, `hooks/` y `components/`. La única carpeta con código compartido entre
vistas es `features/touch/` (motores + audio).

```
src/
├── App.tsx          # IonReactRouter + IonTabs (Inicio / Historial / Ajustes) + rutas
├── theme/           # paletas light/dark, tipografía en rem, utilidades
├── data/            # types.ts (Entry, EmotionTag, Settings, Profile) + db.ts (Dexie)
├── services/        # acceso a datos/plataforma: profile, settings, entries, notifications, theme
├── hooks/           # useProfile, useSettings, useEntries, useBackButton
├── components/      # UI reutilizable (splash, screen-header, entry-icon, empty-state)
├── pages/           # onboarding · home · touch · capture · write · history · settings
└── features/touch/  # audio.ts (Web Audio) + engines/ (contrato TouchEngine + 4 motores)
```

### Modelo de datos

Una sola tabla `entries` en Dexie unifica el historial de los 3 módulos (cada entrada lleva su
`type`). Perfil y ajustes van en Capacitor Preferences, fuera de la DB.

```ts
type EntryType  = 'touch' | 'photo' | 'text';
type EmotionTag = 'calma' | 'ansiedad' | 'tristeza' | 'enojo' | 'alegria' | 'neutral';

interface TouchEntry { type: 'touch'; variant: 'bubbles'|'sand'|'particles'|'constellation'; durationMs: number; }
interface PhotoEntry { type: 'photo'; dataUrl: string; tag: EmotionTag; }
interface TextEntry  { type: 'text';  prompt: string; body: string; }
// + id?, createdAt en cada una
```

### Notas técnicas

- **Back de Android:** los módulos se apilan como rutas sobre la pestaña Inicio; el botón atrás
  los cierra hacia Home y pide doble pulsación para salir desde la raíz (`hooks/useBackButton.ts`).
- **Carga diferida:** PixiJS, pixi-filters y matter.js entran con import dinámico para no
  penalizar el arranque.
- **Audio:** el sonido de Siente usa la Web Audio API (loop de fondo + sfx por interacción), con
  botón de silencio.
- **Tema:** paletas light/dark que siguen al sistema con override manual y escala de texto.

---

Proyecto académico, en español, con los datos solo en el dispositivo.
