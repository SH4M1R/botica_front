'use client';

import { useEffect, useState } from 'react';

export const PALETTES = {
  rojo: { primary: 'oklch(44.4% 0.177 26.899)' },
  azul: { primary: 'oklch(37.9% 0.146 265.522)' },
  esmeralda: { primary: 'oklch(43.2% 0.095 166.913)' },
  indigo: { primary: 'oklch(35.9% 0.144 278.697)' },
  cyan: { primary: 'oklch(71.5% 0.143 215.221)' },
  lima: { primary: 'oklch(64.8% 0.2 131.684)' },
  purpura: { primary: 'oklch(43.8% 0.218 303.724)' },
  ambar: { primary: 'oklch(55.5% 0.163 48.998)' },
};

export type ThemeColor = keyof typeof PALETTES;

const STORAGE_KEY = 'app-theme-color';
const EVENT_NAME = 'theme-color-change';

function applyTheme(theme: ThemeColor) {
  const palette = PALETTES[theme];
  if (!palette) return;
  document.documentElement.style.setProperty('--primary', palette.primary);
}

export function useThemeColor() {
  // Inicializamos siempre con 'azul' para hacer match perfecto con el Servidor (SSR)
  const [activeTheme, setActiveTheme] = useState<ThemeColor>('azul');

  useEffect(() => {
    // 1. Cargar el valor guardado de localStorage tras el montaje
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeColor;
    if (saved && PALETTES[saved]) {
      setActiveTheme(saved);
      applyTheme(saved);
    }

    // 2. Escuchar cambios entre pestañas/componentes
    const handleChange = (e: Event) => {
      const custom = e as CustomEvent<ThemeColor>;
      setActiveTheme(custom.detail);
    };

    window.addEventListener(EVENT_NAME, handleChange);
    return () => window.removeEventListener(EVENT_NAME, handleChange);
  }, []);

  const changeTheme = (theme: ThemeColor) => {
    if (!PALETTES[theme]) return;
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
    setActiveTheme(theme);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: theme }));
  };

  return { activeTheme, changeTheme };
}