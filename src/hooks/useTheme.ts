"use client";

import { useEffect, useState } from "react";
import { THEMES, THEME_STORAGE_KEY } from "@/lib/constants";
import type { Theme } from "@/lib/types";

const applyTheme = (next: Theme) => {
  const definition = THEMES.find((option) => option.id === next) ?? THEMES[0];
  document.documentElement.dataset.theme = next;
  document.documentElement.dataset.tone = definition.tone;
  document.documentElement.style.colorScheme = definition.tone;
};

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("midnight");

  useEffect(() => {
    let saved: Theme | null = null;
    try {
      const value = localStorage.getItem(THEME_STORAGE_KEY);
      saved = THEMES.some((option) => option.id === value) ? (value as Theme) : null;
    } catch {}
    const initial = saved ?? "midnight";
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const changeTheme = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {}
  };

  return { theme, changeTheme };
}
