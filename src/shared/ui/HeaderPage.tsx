import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";

export interface HeaderTab {
  label: string;
  path: string;
  icon?: ReactNode;
  end?: boolean;
}

interface HeaderPageProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  tabs?: HeaderTab[];
  /** Controles da própria tela. Ver a nota sobre a exceção abaixo. */
  actions?: ReactNode;
  /**
   * Para onde o "voltar" leva. Ausente = a tela não tem de onde voltar.
   *
   * Fica AQUI, colado no título, e não numa barra dentro do corpo: o voltar
   * pertence à identidade da tela ("você está em X, veio de Y"), não ao
   * conteúdo dela. Numa barra própria ele custava uma faixa inteira de altura
   * — 52 px acima do primeiro dado — para um botão que a pessoa procura no
   * canto superior esquerdo, que é onde todo navegador e todo aplicativo o
   * põem.
   */
  onVoltar?: () => void;
  /** O que o voltar diz — "Estoque", "Clientes". Vira o `title` do botão. */
  voltarPara?: string;
}

/**
 * Cabeçalho de página: identidade à esquerda, navegação e controles à direita.
 *
 * A regra continua sendo que "criar", "exportar" e afins vivem na própria tela
 * (ver `PageToolbar`), junto do conteúdo sobre o qual agem — é o que mantém o
 * header previsível em toda rota.
 *
 * `actions` é a exceção, e vale para telas em que o conteúdo PRECISA da altura:
 * numa planilha, cada pixel gasto numa barra acima da tabela é uma linha a
 * menos visível, e a barra ainda repetia o nome da planilha que o header já
 * mostrava. Nesses casos os controles sobem para cá, ao lado da identidade.
 *
 * Opcional de propósito: nenhuma tela que não passe `actions` muda de aparência.
 */
const HeaderPage = ({ title, subtitle, icon, tabs, actions, onVoltar, voltarPara }: HeaderPageProps) => {
  const hasTabs = Boolean(tabs && tabs.length > 0);

  return (
    <header
      className="safe-top relative z-10 shrink-0 border-b border-fg/[0.08]"
      style={{
        backgroundColor: "rgb(var(--canvas) / 0.72)",
        backdropFilter: "blur(var(--blur-md)) saturate(160%)",
        WebkitBackdropFilter: "blur(var(--blur-md)) saturate(160%)",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 lg:px-6">
        {/* Identidade */}
        <div className="flex min-w-0 items-center gap-3">
          {onVoltar && (
            <button
              type="button"
              onClick={onVoltar}
              title={voltarPara ? `Voltar para ${voltarPara}` : "Voltar"}
              aria-label={voltarPara ? `Voltar para ${voltarPara}` : "Voltar"}
              className="focus-ring -ml-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-fg/[0.08] bg-fg/[0.04] text-mist transition-colors hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          {icon && (
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/[0.12] text-accent-soft ring-1 ring-inset ring-accent/20">
              <span aria-hidden className="absolute -inset-1 rounded-2xl bg-accent/25 blur-md" style={{ opacity: "calc(0.5 * var(--fx-glow, 1))" }} />
              <span className="relative">{icon}</span>
            </div>
          )}

          <div className="min-w-0">
            <h1 className="truncate text-[17px] leading-tight tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="truncate text-[11.5px] text-faint">{subtitle}</p>}
          </div>
        </div>

        {/*
         * No celular os controles descem para uma FAIXA PRÓPRIA que rola na
         * horizontal; a partir de `sm` voltam a dividir a linha do título.
         *
         * Com `flex-1 justify-end flex-wrap` em qualquer largura — como era —,
         * os cinco atalhos do painel não cabiam em 360px e quebravam em duas ou
         * três fileiras encostadas à direita. O cabeçalho passava de uma linha
         * para quatro e comia a tela antes de o primeiro número aparecer.
         *
         * `-mx-4 px-4` faz a faixa sangrar até a borda: rolagem que começa e
         * termina no meio do vão parece conteúdo cortado, não conteúdo que
         * anda. A margem é desfeita em `sm`, onde o padding do cabeçalho volta
         * a valer.
         */}
        {actions && (
          <div className="-mx-4 flex w-full min-w-0 items-center gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:w-auto sm:flex-1 sm:flex-wrap sm:justify-end sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
            {actions}
          </div>
        )}

        {/* Navegação — pílulas à direita, na mesma linha do título */}
        {hasTabs && (
          <nav className="glass-subtle flex items-center gap-1 rounded-xl p-1">
            {tabs!.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                end={tab.end ?? true}
                className={({ isActive }) => `focus-ring relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[12.5px] transition-all duration-200 ${isActive ? "bg-accent text-white shadow-glow" : "text-mist hover:bg-fg/[0.06] hover:text-ink"}`}
              >
                {tab.icon}
                {tab.label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
};

export default HeaderPage;
