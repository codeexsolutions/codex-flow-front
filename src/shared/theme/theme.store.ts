import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "escuro" | "claro" | "sistema";
export type AccentId = "roxo" | "azul" | "verde" | "rosa" | "laranja";
export type FontScale = "sm" | "md" | "lg";
export type MotionPref = "auto" | "reduce";

interface ThemeState {
  mode: ThemeMode;
  accent: AccentId;
  fontScale: FontScale;
  motion: MotionPref;
  setMode: (m: ThemeMode) => void;
  setAccent: (a: AccentId) => void;
  setFontScale: (f: FontScale) => void;
  setMotion: (m: MotionPref) => void;
}

const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "escuro",
      accent: "roxo",
      fontScale: "md",
      motion: "auto",
      setMode: (mode) => set({ mode }),
      setAccent: (accent) => set({ accent }),
      setFontScale: (fontScale) => set({ fontScale }),
      setMotion: (motion) => set({ motion }),
    }),
    { name: "codex-flow-theme" },
  ),
);

export default useThemeStore;
