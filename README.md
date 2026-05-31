# SerenApp 🌿

App móvil de **bienestar emocional** — entrega del ramo de _programación móvil_.
Calma la ansiedad con tres mecánicas simples: **Siente** (táctil), **Captura** (foto + emoción)
y **Escribe** (escritura guiada). Todo funciona **sin conexión y sin cuentas**: los datos viven
solo en tu dispositivo.

**Stack:** Ionic React 8 · Vite · TypeScript · Capacitor 8 · Dexie (IndexedDB).

---

## Cómo correr en el navegador (desarrollo)

```bash
npm install
npm run dev          # http://localhost:5173 (o el siguiente puerto libre)
```

> En el navegador, la cámara usa `@ionic/pwa-elements` y las notificaciones se simulan
> (el recordatorio real se programa en el dispositivo).

## Pruebas

```bash
npm run lint         # eslint
npm run test.unit    # vitest (unитarias: catálogos + servicio de entradas)
npx cypress run      # e2e smoke (onboarding). Si el dev server está en otro puerto:
                     #   CYPRESS_baseUrl=http://localhost:5174 npx cypress run
```

## Build web

```bash
npm run build        # tsc + vite → dist/
```

---

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

Capacitor 8 usa **Swift Package Manager** (no CocoaPods).

```bash
npm run build && npx cap sync ios
npx cap open ios          # abre Xcode → elegir equipo de firma → Run en dispositivo/simulador
```

> **Nota:** en este equipo, el **simulador iOS 26 / Xcode 26** muestra pantalla negra para
> _cualquier_ contenido WKWebView (se verificó con una página HTML trivial) — es un problema del
> runtime del simulador, no de la app. La app **compila** (`BUILD SUCCEEDED`) y renderiza
> correctamente en navegador real y en dispositivo físico. Para `.ipa` de dispositivo, firma con
> tu equipo en Xcode.

---

## Requerimientos cubiertos

**Funcionales:** RF1 módulo táctil (3 experiencias aleatorias: burbujas con matter.js, arena y
partículas en canvas) · RF2 captura cámara/galería + 6 etiquetas · RF3 historial cronológico
local · RF4 escritura con ≥5 preguntas rotativas · RF5 guardado/revisión de entradas · RF6
recordatorio diario programable (on/off + hora) · RF7 perfil local sin backend · RF8 botón
retroceso de Android (doble pulsación para salir desde la raíz).

**No funcionales:** RNF1 libs pesadas con carga diferida · RNF2 Android 10+/iOS 14+ + suite de
pruebas · RNF3 100% local, sin nube · RNF4 navegación sin tutorial · RNF5 modo oscuro + texto
escalable (utilidades de Ionic) · RNF6 módulos independientes y probables por separado.

## Estructura

```
src/
├── theme/        # design system (paletas light/dark, tipografía)
├── data/         # tipos + Dexie (IndexedDB)
├── services/     # perfil, ajustes, entradas, tema, notificaciones, back
├── hooks/        # useProfile, useSettings, useEntries, useBackButton
├── components/   # UI compartida (Splash)
└── features/     # onboarding · home · touch · capture · write · history · settings
```
