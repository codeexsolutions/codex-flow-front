import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { FxLevel } from "./detectPerformance";

export type ThemeMode = "escuro" | "claro" | "sistema";
export type AccentId = "roxo" | "azul" | "verde" | "rosa" | "laranja";
export type FontScale = "sm" | "md" | "lg";
export type MotionPref = "auto" | "reduce";
/** "auto" delega para a detecção de hardware. */
export type FxPref = FxLevel | "auto";

interface ThemeState {
  mode: ThemeMode;
  accent: AccentId;
  fontScale: FontScale;
  motion: MotionPref;
  fx: FxPref;
  setMode: (m: ThemeMode) => void;
  setAccent: (a: AccentId) => void;
  setFontScale: (f: FontScale) => void;
  setMotion: (m: MotionPref) => void;
  setFx: (f: FxPref) => void;
}

const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "escuro",
      accent: "roxo",
      fontScale: "md",
      motion: "auto",
      fx: "auto",
      setMode: (mode) => set({ mode }),
      setAccent: (accent) => set({ accent }),
      setFontScale: (fontScale) => set({ fontScale }),
      setMotion: (motion) => set({ motion }),
      setFx: (fx) => set({ fx }),
    }),
    { name: "codex-flow-theme", version: 2 },
  ),
);

export default useThemeStore;
