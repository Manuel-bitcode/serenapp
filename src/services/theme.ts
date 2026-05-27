/* SerenApp — aplicación de tema (light/dark) y tamaño de texto al documento (RNF5).
 * Modo "class": alterna .ion-palette-dark en <html>. Sigue al sistema si theme==='system'.
 */
import type { ThemePref, TextScale } from '../data/types';

const darkMql = (): MediaQueryList | null =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

function resolveDark(theme: ThemePref): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return darkMql()?.matches ?? false;
}

export function applyTheme(theme: ThemePref): void {
  const dark = resolveDark(theme);
  document.documentElement.classList.toggle('ion-palette-dark', dark);
}

export function applyTextScale(scale: TextScale): void {
  document.documentElement.setAttribute('data-text-scale', scale);
}

let systemListener: ((e: MediaQueryListEvent) => void) | null = null;

/**
 * Aplica tema + escala y, en modo 'system', re-aplica cuando cambia el SO.
 * Devuelve un cleanup para quitar el listener.
 */
export function initAppearance(theme: ThemePref, scale: TextScale): () => void {
  applyTheme(theme);
  applyTextScale(scale);

  const mql = darkMql();
  if (systemListener && mql) mql.removeEventListener('change', systemListener);
  systemListener = null;

  if (theme === 'system' && mql) {
    systemListener = () => applyTheme('system');
    mql.addEventListener('change', systemListener);
  }

  return () => {
    if (systemListener && mql) mql.removeEventListener('change', systemListener);
    systemListener = null;
  };
}
