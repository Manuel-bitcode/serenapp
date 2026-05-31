# SerenApp 🌿

> App móvil de **bienestar emocional** que ayuda a calmar la ansiedad en el momento — sin
> conexión, sin cuentas y sin que ningún dato salga de tu dispositivo.

Entrega del ramo de _programación móvil_. SerenApp parte de una idea simple: cuando alguien
abre la app probablemente está pasando un mal momento, así que la primera pantalla no pide nada,
no enseña tutoriales y ofrece **tres caminos de igual jerarquía** para regularse. Todo es local
y funciona offline.

**Stack:** Ionic React 8 · React 19 · Vite · TypeScript · Capacitor 8 · Dexie (IndexedDB) ·
PixiJS · matter.js.

---

## ✨ Las tres mecánicas (+ una)

| Módulo | Qué hace | Bajo el capó |
|---|---|---|
| 🫧 **Siente** (lavanda) | Interacción táctil para calmar; al entrar elige **una de 4 experiencias al azar**. | `bubbles` (físicas matter.js + render PixiJS con _bloom_), `particles` (~1300 sprites con blend aditivo), `sand` (autómata celular _falling-sand_ en Canvas 2D) y `constellation` (cielo nocturno PixiJS). Audio generado en tiempo real con la Web Audio API. |
| 📷 **Captura** (menta) | Toma una foto o elige de galería y asóciala a una emoción (6 etiquetas: calma, ansiedad, tristeza, enojo, alegría, neutral). | `@capacitor/camera`; la imagen se guarda local como dataURL. |
| ✍️ **Escribe** (cálido) | Escritura guiada con preguntas detonadoras rotativas (≥5). | Entradas de texto persistidas localmente, revisables desde el historial. |
| 🕘 **Historial** | Vista cronológica unificada de todo lo que registras. | Una sola tabla en IndexedDB para los 3 tipos de entrada. |

Más **Ajustes** (nombre, modo oscuro, escala de texto, recordatorio diario) y un **perfil
local** capturado en el onboarding — sin registro, correo ni backend.

## 🔒 Principios

- **100% local / offline-first.** Fotos, escritos e historial viven solo en el dispositivo
  (IndexedDB + Capacitor Preferences). No hay nube ni sincronización.
- **Cero fricción.** Un usuario nuevo completa una sesión (sensorial + foto + escritura) sin
  tutorial.
- **Accesible.** Sigue el tamaño de texto del sistema y el modo oscuro, con override manual en
  Ajustes (utilidades de Ionic).
- **Módulos independientes.** Cada mecánica se puede probar y demostrar por separado.

---

## 🚀 Cómo correr en el navegador (desarrollo)

```bash
npm install
npm run dev          # http://localhost:5173 (o el siguiente puerto libre)
```

> En el navegador la cámara usa `@ionic/pwa-elements` y las notificaciones se simulan
> (el recordatorio real se programa en el dispositivo).

## 🧪 Pruebas

```bash
npm run lint         # eslint
npm run test.unit    # vitest (unitarias: catálogos + servicio de entradas)
npm run test.e2e     # cypress e2e smoke (onboarding)
                     #   ¿dev server en otro puerto? CYPRESS_baseUrl=http://localhost:5174 npm run test.e2e
```

## 📦 Build web

```bash
npm run build        # tsc + vite → dist/
```

---

## 📱 Compilar nativo

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

Capacitor 8 usa **Swift Package Manager** (no CocoaPods).

```bash
npm run build && npx cap sync ios
npx cap open ios          # abre Xcode → elegir equipo de firma → Run en dispositivo/simulador
```

> **Nota:** en este equipo, el **simulador iOS 26 / Xcode 26** muestra pantalla negra para
> _cualquier_ contenido WKWebView (se verificó con una página HTML trivial) — es un problema del
> runtime del simulador, no de la app. La app **compila** (`BUILD SUCCEEDED`) y renderiza
> correctamente en navegador real y en dispositivo físico.

---

## 🏗️ Arquitectura

**Offline-first, módulos desacoplados.** No hay imports entre pantallas: todo lo compartido pasa
por `services/`, `data/`, `hooks/` y `components/`. La única _feature_ con código compartido
entre vistas es `features/touch/` (motores + audio), porque varios motores conviven en una page.

```
src/
├── App.tsx          # IonReactRouter + IonTabs (Inicio / Historial / Ajustes) + rutas
├── theme/           # design system: paletas light/dark, tipografía escalable (rem), utilidades
├── data/            # contratos: types.ts (Entry, EmotionTag, Settings, Profile) + db.ts (Dexie)
├── services/        # acceso a datos/plataforma: profile, settings, entries, notifications, theme
├── hooks/           # puente React: useProfile, useSettings, useEntries, useBackButton
├── components/      # UI reutilizable sin lógica (splash, screen-header, entry-icon, empty-state)
├── pages/           # pantallas routeables: onboarding · home · touch · capture · write · history · settings
└── features/        # dominio reutilizado por una page
    └── touch/       # audio.ts (Web Audio API) + engines/ (contrato TouchEngine + 4 motores)
```

### Modelo de datos

Una sola tabla `entries` en Dexie unifica el historial de los 3 módulos (cada entrada lleva su
`type`). Perfil y ajustes van en Capacitor Preferences, fuera de la DB.

```ts
type EntryType  = 'touch' | 'photo' | 'text';
type EmotionTag = 'calma' | 'ansiedad' | 'tristeza' | 'enojo' | 'alegria' | 'neutral';

interface TouchEntry { type: 'touch'; variant: 'bubbles'|'sand'|'particles'; durationMs: number; }
interface PhotoEntry { type: 'photo'; dataUrl: string; tag: EmotionTag; }
interface TextEntry  { type: 'text';  prompt: string; body: string; }
// + id?, createdAt en cada una
```

### Decisiones técnicas clave

- **Navegación y back de Android:** los módulos se apilan como rutas sobre la pestaña Inicio; el
  botón atrás los cierra hacia Home y exige doble pulsación para salir desde la raíz
  (`hooks/useBackButton.ts` sobre `@capacitor/app`).
- **Carga diferida:** PixiJS, pixi-filters y matter.js entran con **import dinámico** para no
  penalizar el arranque. React entrega un `<canvas key={variant}>` para que cada experiencia
  reciba un contexto WebGL limpio.
- **Audio sin archivos:** todo el sonido de Siente se sintetiza con la Web Audio API (pad
  ambiental + SFX por interacción), así sigue funcionando offline. Botón de silencio en pantalla.
- **Persistencia:** Dexie/IndexedDB para las entradas + Preferences para perfil/ajustes. Sin red.
- **Tema:** paletas light/dark derivadas de los tokens de diseño; sigue al sistema con override
  manual y escala de texto configurable.

---

## 📋 Requerimientos cubiertos

**Funcionales** — RF1 módulo táctil (4 experiencias aleatorias) · RF2 captura cámara/galería +
6 etiquetas · RF3 historial cronológico local · RF4 escritura con ≥5 preguntas rotativas · RF5
guardado/revisión de entradas · RF6 recordatorio diario programable · RF7 perfil local sin
backend · RF8 botón retroceso de Android.

**No funcionales** — RNF1 libs pesadas con carga diferida · RNF2 Android 10+/iOS 14+ + suite de
pruebas · RNF3 100% local, sin nube · RNF4 navegación sin tutorial · RNF5 modo oscuro + texto
escalable · RNF6 módulos independientes y probables por separado.

---

_Proyecto académico · idioma español · datos solo en el dispositivo._
