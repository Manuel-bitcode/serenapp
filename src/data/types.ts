// Contratos de datos compartidos. Toda la app codifica contra estos tipos.

export type EntryType = 'touch' | 'photo' | 'text';
export type TouchVariant = 'bubbles' | 'sand' | 'particles' | 'constellation';
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
  // timestamp (epoch ms) para ordenar el historial
  createdAt: number;
}

// sesión del módulo táctil
export interface TouchEntry extends BaseEntry {
  type: 'touch';
  variant: TouchVariant;
  durationMs: number;
}

// foto + etiqueta emocional
export interface PhotoEntry extends BaseEntry {
  type: 'photo';
  // dataURL en base64, guardado local
  dataUrl: string;
  tag: EmotionTag;
}

// entrada de escritura guiada
export interface TextEntry extends BaseEntry {
  type: 'text';
  prompt: string;
  body: string;
}

export type Entry = TouchEntry | PhotoEntry | TextEntry;

/* ----- Perfil y ajustes (Capacitor Preferences, no en la DB) ----- */

export type ThemePref = 'system' | 'light' | 'dark';
export type TextScale = 'normal' | 'grande' | 'mayor';

// perfil local, sin backend
export interface Profile {
  name: string;
  onboarded: boolean;
}

export interface Settings {
  theme: ThemePref;
  textScale: TextScale;
  // recordatorio diario
  reminderEnabled: boolean;
  /** "HH:mm" 24h */
  reminderTime: string;
}

/* ----- Catálogos ----- */

// etiquetas emocionales predefinidas
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

// preguntas detonadoras que rotan en la pantalla de escritura
export const WRITING_PROMPTS: string[] = [
  '¿Qué estás pensando ahora mismo?',
  '¿Qué necesitas en este momento?',
  '¿Qué sentiste hoy que quieras recordar?',
  '¿Qué te quitaría un peso de encima si lo pusieras en palabras?',
  '¿Por qué cosa, por pequeña que sea, te sientes agradecido hoy?',
  '¿Cómo está tu cuerpo en este instante?',
  '¿Qué le dirías a alguien que se siente como tú ahora?',
];

export const TOUCH_VARIANTS: TouchVariant[] = [
  'bubbles',
  'sand',
  'particles',
  'constellation',
];

export const touchVariantLabel: Record<TouchVariant, string> = {
  bubbles: 'Burbujas',
  sand: 'Arena',
  particles: 'Partículas',
  constellation: 'Constelación',
};
