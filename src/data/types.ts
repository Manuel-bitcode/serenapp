/* SerenApp — contratos de datos compartidos.
 * Toda la app codifica contra estos tipos. No duplicar en los módulos.
 */

export type EntryType = 'touch' | 'photo' | 'text';
export type TouchVariant = 'bubbles' | 'sand' | 'particles';
export type EmotionTag =
  | 'calma'
  | 'ansiedad'
  | 'tristeza'
  | 'enojo'
  | 'alegria'
  | 'neutral';

export interface BaseEntry {
  id?: number;
  type: EntryType;
  /** epoch ms — orden cronológico del historial */
  createdAt: number;
}

/** RF1 — sesión del módulo táctil */
export interface TouchEntry extends BaseEntry {
  type: 'touch';
  variant: TouchVariant;
  durationMs: number;
}

/** RF2 — foto + etiqueta emocional */
export interface PhotoEntry extends BaseEntry {
  type: 'photo';
  /** dataURL (base64) — guardado 100% local (RNF3) */
  dataUrl: string;
  tag: EmotionTag;
}

/** RF4/RF5 — entrada de escritura guiada */
export interface TextEntry extends BaseEntry {
  type: 'text';
  prompt: string;
  body: string;
}

export type Entry = TouchEntry | PhotoEntry | TextEntry;

/* ----- Perfil y ajustes (Capacitor Preferences, no en la DB) ----- */

export type ThemePref = 'system' | 'light' | 'dark';
export type TextScale = 'normal' | 'grande' | 'mayor';

/** RF7 — perfil local, sin backend */
export interface Profile {
  name: string;
  onboarded: boolean;
}

export interface Settings {
  theme: ThemePref;
  textScale: TextScale;
  /** RF6 — recordatorio diario */
  reminderEnabled: boolean;
  /** "HH:mm" 24h */
  reminderTime: string;
}

/* ----- Catálogos ----- */

/** RF2 — ≥6 etiquetas emocionales predefinidas */
export const EMOTIONS: { tag: EmotionTag; label: string; emoji: string }[] = [
  { tag: 'calma', label: 'Calma', emoji: '😌' },
  { tag: 'ansiedad', label: 'Ansiedad', emoji: '😟' },
  { tag: 'tristeza', label: 'Tristeza', emoji: '😢' },
  { tag: 'enojo', label: 'Enojo', emoji: '😡' },
  { tag: 'alegria', label: 'Alegría', emoji: '🙂' },
  { tag: 'neutral', label: 'Neutral', emoji: '😐' },
];

export const emotionByTag = (tag: EmotionTag) =>
  EMOTIONS.find((e) => e.tag === tag) ?? EMOTIONS[5];

/** RF4 — banco de ≥5 preguntas detonadoras rotativas */
export const WRITING_PROMPTS: string[] = [
  '¿Qué estás pensando ahora mismo?',
  '¿Qué necesitas en este momento?',
  '¿Qué sentiste hoy que quieras recordar?',
  '¿Qué te quitaría un peso de encima si lo pusieras en palabras?',
  '¿Por qué cosa, por pequeña que sea, te sientes agradecido hoy?',
  '¿Cómo está tu cuerpo en este instante?',
  '¿Qué le dirías a alguien que se siente como tú ahora?',
];

export const TOUCH_VARIANTS: TouchVariant[] = ['bubbles', 'sand', 'particles'];

export const touchVariantLabel: Record<TouchVariant, string> = {
  bubbles: 'Burbujas',
  sand: 'Arena',
  particles: 'Partículas',
};
