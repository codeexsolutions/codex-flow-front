import type { MouseEvent } from "react";
import { Palette, Moon, Sun, Monitor, Check, Type, Sparkles, Accessibility } from "lucide-react";

import { SettingsCard } from "../ui";
import { useAlert } from "../../../components/Alert/Alert";
import useThemeStore, { type AccentId, type FontScale, type MotionPref, type ThemeMode } from "../../../store/theme.store";
import { switchThemeWithTransition } from "../../../utils/themeTransition";

const THEMES: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { id: "escuro", label: "Escuro", icon: <Moon size={14} /> },
  { id: "claro", label: "Claro", icon: <Sun size={14} /> },
  { id: "sistema", label: "Sistema", icon: <Monitor size={14} /> },
];

const ACCENTS: { id: AccentId; label: string; color: string }[] = [
  { id: "roxo", label: "Roxo", color: "#7c6ef5" },
  { id: "azul", label: "Azul", color: "#4aa8ff" },
  { id: "verde", label: "Verde", color: "#3ecf8e" },
  { id: "rosa", label: "Rosa", color: "#f062a0" },
  { id: "laranja", label: "Laranja", color: "#f5a623" },
];

const FONT_SCALES: { id: FontScale; label: string; desc: string; sample: string }[] = [
  { id: "sm", label: "Pequeno", desc: "Mais conteúdo por tela", sample: "Aa" },
  { id: "md", label: "Padrão", desc: "Equilíbrio recomendado", sample: "Aa" },
  { id: "lg", label: "Grande", desc: "Melhor legibilidade", sample: "Aa" },
];

const MOTIONS: { id: MotionPref; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: "auto", label: "Automático", desc: "Segue as preferências do sistema", icon: <Sparkles size={15} /> },
  { id: "reduce", label: "Reduzidas", desc: "Menos animações e transições", icon: <Accessibility size={15} /> },
];

const ThemePreview = ({ id, accent }: { id: ThemeMode; accent: string }) => {
  const light = id === "claro";
  const bg = light ? "#f4f3fb" : "#12111d";
  const panel = light ? "#ffffff" : "#1c1a2b";
  const line = light ? "#dcdae8" : "#2a2740";
  const soft = light ? "#e7e5f2" : "#26233a";

  return (
    <div className="relative mb-3 h-20 w-full overflow-hidden rounded-lg border border-fg/[0.08]" style={{ background: bg }}>
      {id === "sistema" && <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, #12111d 50%, #f4f3fb 50%)" }} />}
      <div className="relative flex h-full gap-1.5 p-1.5">
        <div className="flex w-1/4 flex-col gap-1 rounded-md p-1" style={{ background: panel }}>
          <div className="h-1.5 w-full rounded-full" style={{ background: accent }} />
          <div className="h-1 w-3/4 rounded-full" style={{ background: soft }} />
          <div className="h-1 w-2/3 rounded-full" style={{ background: soft }} />
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-md p-1.5" style={{ background: panel }}>
          <div className="h-1.5 w-1/2 rounded-full" style={{ background: line }} />
          <div className="mt-0.5 h-1 w-full rounded-full" style={{ background: soft }} />
          <div className="h-1 w-5/6 rounded-full" style={{ background: soft }} />
          <div className="mt-auto h-2.5 w-1/3 self-end rounded" style={{ background: accent }} />
        </div>
      </div>
    </div>
  );
};

const AparenciaTab = () => {
  const alert = useAlert();
  const mode = useThemeStore((s) => s.mode);
  const accentId = useThemeStore((s) => s.accent);
  const fontScale = useThemeStore((s) => s.fontScale);
  const motion = useThemeStore((s) => s.motion);
  const setMode = useThemeStore((s) => s.setMode);
  const setAccent = useThemeStore((s) => s.setAccent);
  const setFontScale = useThemeStore((s) => s.setFontScale);
  const setMotion = useThemeStore((s) => s.setMotion);

  const accent = ACCENTS.find((a) => a.id === accentId) ?? ACCENTS[0];

  const notify = (msg: string) => alert.toast("success", msg, undefined, { position: "bottom-right", timer: 1800 });

  const trocarTema = (e: MouseEvent<HTMLButtonElement>, id: ThemeMode) => {
    if (id === mode) return;
    switchThemeWithTransition(e, () => setMode(id));
    notify(`Tema ${THEMES.find((t) => t.id === id)?.label.toLowerCase()} aplicado`);
  };

  const trocarAccent = (a: (typeof ACCENTS)[number]) => {
    if (a.id === accent.id) return;
    setAccent(a.id);
    notify(`Cor ${a.label.toLowerCase()} aplicada`);
  };

  const trocarFontScale = (id: FontScale) => {
    if (id === fontScale) return;
    setFontScale(id);
    notify(`Tamanho ${FONT_SCALES.find((f) => f.id === id)?.label.toLowerCase()} aplicado`);
  };

  const trocarMotion = (id: MotionPref) => {
    if (id === motion) return;
    setMotion(id);
    notify(`Animações: ${MOTIONS.find((m) => m.id === id)?.label.toLowerCase()}`);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-y-auto lg:grid-cols-2">
        {/* Tema */}
        <SettingsCard icon={<Palette className="h-4 w-4" />} title="Tema" desc="Escolha como prefere ver o sistema. A alteração é aplicada na hora.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {THEMES.map((t) => {
              const active = t.id === mode;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={(e) => trocarTema(e, t.id)}
                  className={`group cursor-pointer rounded-xl border p-2.5 text-left transition-all ${active ? "border-accent/60 bg-accent/[0.1] ring-1 ring-accent/40" : "border-fg/[0.08] hover:border-fg/[0.16] hover:bg-fg/[0.02]"}`}
                >
                  <ThemePreview id={t.id} accent={accent.color} />
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                      {t.icon}
                      {t.label}
                    </span>
                    {active && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white">
                        <Check size={11} strokeWidth={3} />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </SettingsCard>

        {/* Cor de destaque */}
        <SettingsCard icon={<Palette className="h-4 w-4" />} title="Cor de destaque" desc="Usada em botões, links e elementos ativos.">
          <div className="flex flex-wrap items-center gap-3">
            {ACCENTS.map((a) => {
              const active = a.id === accent.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => trocarAccent(a)}
                  title={a.label}
                  aria-label={a.label}
                  className={`relative h-10 w-10 cursor-pointer rounded-full transition-transform hover:scale-105 ${active ? "ring-2 ring-white/70 ring-offset-2 ring-offset-canvas" : ""}`}
                  style={{ background: a.color }}
                >
                  {active && <Check size={16} strokeWidth={3} className="absolute inset-0 m-auto text-white drop-shadow" />}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-xl border border-fg/[0.06] bg-fg/[0.02] p-3">
            <span className="text-[12px] text-mist">Prévia:</span>
            <button type="button" className="rounded-lg bg-accent px-3.5 py-1.5 text-[12px] font-medium text-white">
              Botão
            </button>
            <span className="text-[12px] font-medium text-accent">Link de exemplo</span>
          </div>
        </SettingsCard>

        {/* Tamanho do texto */}
        <SettingsCard icon={<Type className="h-4 w-4" />} title="Tamanho do texto" desc="Ajusta a escala geral da interface. Recomendado seguir o padrão do seu navegador.">
          <div className="grid grid-cols-3 gap-3">
            {FONT_SCALES.map((f) => {
              const active = f.id === fontScale;
              const size = f.id === "sm" ? "text-[15px]" : f.id === "md" ? "text-[19px]" : "text-[23px]";
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => trocarFontScale(f.id)}
                  className={`group flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all ${active ? "border-accent/60 bg-accent/[0.1] ring-1 ring-accent/40" : "border-fg/[0.08] hover:border-fg/[0.16] hover:bg-fg/[0.02]"}`}
                >
                  <span className={`flex h-11 w-11 items-center justify-center rounded-lg font-semibold ${size} ${active ? "bg-accent/20 text-accent-soft" : "bg-fg/[0.05] text-mist"}`}>{f.sample}</span>
                  <div>
                    <p className="text-[12.5px] font-medium text-ink">{f.label}</p>
                    <p className="mt-0.5 text-[10.5px] leading-tight text-faint">{f.desc}</p>
                  </div>
                  {active && (
                    <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </SettingsCard>

        {/* Animações */}
        <SettingsCard icon={<Sparkles className="h-4 w-4" />} title="Animações" desc="Deixamos “Automático” seguir a configuração de acessibilidade do seu sistema.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MOTIONS.map((m) => {
              const active = m.id === motion;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => trocarMotion(m.id)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-all ${active ? "border-accent/60 bg-accent/[0.1] ring-1 ring-accent/40" : "border-fg/[0.08] hover:border-fg/[0.16] hover:bg-fg/[0.02]"}`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? "bg-accent/20 text-accent-soft" : "bg-fg/[0.05] text-mist"}`}>{m.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-ink">{m.label}</p>
                    <p className="truncate text-[11px] text-faint">{m.desc}</p>
                  </div>
                  {active && (
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </SettingsCard>
      </div>
    </div>
  );
};

export default AparenciaTab;
