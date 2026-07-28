import { useEffect } from "react";
import useThemeStore, { type ThemeMode, type MotionPref } from "../store/theme.store";

const applyMode = (mode: ThemeMode) => {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = mode === "escuro" || (mode === "sistema" && prefersDark);
  root.classList.toggle("dark", isDark);
};

const applyMotion = (pref: MotionPref) => {
  const root = document.documentElement;
  const systemReduces = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const shouldReduce = pref === "reduce" || (pref === "auto" && systemReduces);
  root.dataset.motion = shouldReduce ? "reduce" : "full";
};

const useTheme = () => {
  const mode = useThemeStore((s) => s.mode);
  const accent = useThemeStore((s) => s.accent);
  const fontScale = useThemeStore((s) => s.fontScale);
  const motion = useThemeStore((s) => s.motion);

  useEffect(() => {
    applyMode(mode);
  }, [mode]);
  useEffect(() => {
    document.documentElement.dataset.accent = accent;
  }, [accent]);
  useEffect(() => {
    document.documentElement.dataset.fontScale = fontScale;
  }, [fontScale]);
  useEffect(() => {
    applyMotion(motion);
  }, [motion]);

  // Reage ao sistema quando estiver em "sistema"
  useEffect(() => {
    if (mode !== "sistema") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyMode("sistema");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  // Reage ao sistema quando motion estiver em "auto"
  useEffect(() => {
    if (motion !== "auto") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => applyMotion("auto");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [motion]);
};

export default useTheme;
