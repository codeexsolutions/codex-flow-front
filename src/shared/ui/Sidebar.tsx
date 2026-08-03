import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { Package, Users, DollarSign, Settings, LogOut, ShoppingCart, BarChart3, LayoutDashboard, Truck, UserCog, Wallet, LifeBuoy, Factory } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import useAuth from "@/features/auth/store/auth.store";
import useEnterprise from "@/features/empresa/store/enterprise.store";
import { ehGestor } from "@/features/vendas/components/TabsVendas";
import SinoNotificacoes from "@/features/notificacoes/components/SinoNotificacoes";
import { getInitials } from "@/shared/utils/format";
import { tocarNavegacao } from "@/shared/session/somSessao";
import useEquipeStore, { planoTemEquipe } from "@/features/funcionarios/store/equipe.store";

const Sidebar = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { enterprise } = useEnterprise();

  const userInitials = getInitials(user?.nome, "U");
  const companyInitial = (enterprise?.nomeFantasia || "E").trim().charAt(0).toUpperCase();
  const companyImage = enterprise?.urlLogo || enterprise?.urlImagem || "";

  /** Dono ou administrador promovido: vê o sistema inteiro. */
  const gestor = ehGestor(user);

  /* Só o gestor pergunta: a API recusa para vendedor, e uma chamada que sempre
     falha em toda navegação é ruído no log e na rede. */
  const equipe = useEquipeStore((s) => s.equipe);
  const buscarEquipe = useEquipeStore((s) => s.buscar);

  useEffect(() => {
    if (gestor) buscarEquipe();
  }, [gestor, buscarEquipe]);

  /**
   * Rotas que são filhas de outra no menu. Sem esta lista, estar em
   * `/vendas/orcamentos` acenderia "Vendas" **e** "Orçamentos" ao mesmo tempo,
   * porque Vendas casa por prefixo.
   */
  const FILHAS_COM_ITEM_PROPRIO = ["/vendas/orcamentos"];

  const isActive = (route: string) => {
    if (route === "") return pathname === "/";

    const alvo = `/${route}`;

    if (pathname === alvo) return true;
    if (!pathname.startsWith(`${alvo}/`)) return false;

    // O pai não acende quando a filha tem item próprio no menu.
    return !FILHAS_COM_ITEM_PROPRIO.some((f) => f !== alvo && pathname.startsWith(f));
  };

  const reduzir = useReducedMotion();

  const goto = (route: string) => {
    // Não toca ao clicar onde já se está: som sem mudança confunde.
    if (!isActive(route)) tocarNavegacao();

    navigate(route);
  };

  const handleLogout = () => {
    Promise.resolve(logout()).catch(() => {});
  };

  const item = (route: string, icon: ReactNode, label: string, disabled = false) => {
    if (disabled) {
      return (
        <div className="mb-1 flex cursor-not-allowed items-center gap-3 rounded-xl px-2.5 py-2 opacity-45">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-fg/[0.04] text-faint">{icon}</span>
          <span className="flex-1 text-[13.5px] text-mist">{label}</span>
          <span className="rounded-full border border-fg/[0.08] bg-fg/[0.03] px-2 py-0.5 text-[9px] uppercase tracking-wider text-faint">Em breve</span>
        </div>
      );
    }

    const active = isActive(route);
    return (
      <button
        type="button"
        onClick={() => goto(route)}
        aria-current={active ? "page" : undefined}
        className={`group focus-ring relative mb-1 flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[13.5px] transition-colors duration-200 ${active ? " text-ink" : "text-mist hover:bg-fg/[0.05] hover:text-ink"}`}
      >
        {/*
         * Sem `layoutId` aqui, de propósito.
         *
         * A pílula deslizante distorcia: animação de layout precisa medir o
         * elemento em pixels reais, e a sidebar vive dentro de um contêiner que
         * o `MainLayout` anima com `scale`. O framer mede na escala errada e o
         * resultado é a borda esticada, atravessando os itens vizinhos.
         *
         * A troca aqui é rápida e curta — quem clica no menu já está olhando
         * para o item que clicou. Um surgimento firme com o traço lateral
         * crescendo comunica a mesma coisa, e nunca quebra.
         */}
        {active && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-xl border border-accent/25 bg-gradient-to-r from-accent/[0.22] via-accent/[0.10] to-transparent"
            style={{ boxShadow: "inset 0 1px 0 rgb(var(--glass-highlight) / 0.14)" }}
            initial={reduzir ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          />
        )}

        {active && (
          <motion.span
            aria-hidden
            className="absolute left-0 top-1/2 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-accent-soft to-accent"
            style={{ boxShadow: "0 0 12px rgb(var(--accent) / calc(0.8 * var(--fx-glow, 1)))" }}
            /* Só a altura anima: é uma propriedade que não depende de medir o
               elemento contra a viewport, então a escala do pai não a afeta. */
            initial={reduzir ? { height: 28 } : { height: 0 }}
            animate={{ height: 28 }}
            transition={{ type: "spring", stiffness: 480, damping: 30 }}
          />
        )}

        {/* O ícone dá um pulinho ao virar ativo: confirma o clique sem precisar
            de outro elemento na tela. `scale` num filho é seguro — o que não
            funciona é medir posição dentro de um pai escalado. */}
        <motion.span
          className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-200 ${active ? "bg-accent/25 text-accent-soft" : "bg-fg/[0.04] text-faint group-hover:bg-fg/[0.08] group-hover:text-accent-soft"}`}
          animate={reduzir ? {} : { scale: active ? 1.06 : 1 }}
          transition={{ type: "spring", stiffness: 460, damping: 22 }}
        >
          {icon}
        </motion.span>

        <span className="relative flex-1">{label}</span>
      </button>
    );
  };

  const cat = (label: string) => <p className="px-2.5 pb-2 pt-5 text-[10px] uppercase tracking-[0.18em] text-muted first:pt-1">{label}</p>;

  return (
    <>
      {/* `relative` é obrigatório: o brilho do topo é `absolute` e, sem um
          ancestral posicionado, ele se prende à viewport e cobre a tela toda. */}
      <aside
        className="glass-strong relative hidden w-72 flex-shrink-0 flex-col overflow-hidden border-y-0 border-l-0 border-r md:flex"
        style={{ borderColor: "rgb(var(--glass-border) / calc(var(--glass-border-alpha) + 0.03))" }}
      >
        {/* Brilho ambiente no topo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-52"
          style={{
            opacity: "var(--fx-aurora, 1)",
            background: "radial-gradient(ellipse 70% 100% at 50% 0%, rgb(var(--accent) / 0.18), transparent 70%)",
          }}
        />

        {/* Marca da empresa */}
        <div className="relative flex items-center gap-3.5 border-b border-fg/[0.07] px-5 py-4">
          <div className="relative h-11 w-11 shrink-0">
            <div aria-hidden className="absolute -inset-1 rounded-2xl bg-accent/30 blur-md" style={{ opacity: "calc(0.6 * var(--fx-glow, 1))" }} />
            <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-surface-raised to-surface ring-1 ring-fg/10">
              {companyImage ? (
                <img
                  src={companyImage}
                  alt={enterprise?.nomeFantasia || "Logo"}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="text-base text-accent-soft">{companyInitial}</span>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] tracking-tight text-ink">{enterprise?.nomeFantasia || "Sua Empresa"}</p>
            <p className="truncate text-[11.5px] text-faint">Painel de gestão</p>
          </div>

        </div>

        <nav className="relative flex-1 overflow-y-auto px-3 py-3">
          {/*
           * Agrupado pelo que a pessoa está fazendo, não pelo módulo técnico.
           *
           * Produção é o trabalho do dia — vender, orçar, atender. Orçamento
           * mora aqui e não em Financeiro porque proposta ainda não é dinheiro:
           * é conversa de balcão, feita entre uma venda e outra.
           */}
          {cat("Produção")}
          {item("", <LayoutDashboard size={17} />, "Dashboard")}
          {item("pdv", <ShoppingCart size={17} />, "PDV")}
          {/* Em breve, e só no plano Ilimitado. Fica visível desabilitado em
              vez de escondido: quem não sabe que existe não pergunta, e o item
              cinza é o que faz o dono querer saber quando chega. */}
          {item("planilhas", <Factory size={17} />, "Produção", true)}

          {cat("Gerenciamento")}
          {item("estoque", <Package size={17} />, "Estoque")}
          {item("clientes", <Users size={17} />, "Clientes")}
          {/* Equipe só existe em plano que comporta mais de um usuário: mostrar
              para quem tem uma vaga só seria oferecer porta que não abre. */}
          {gestor && planoTemEquipe(equipe) && item("funcionarios", <UserCog size={17} />, "Funcionários")}
          {item("correios", <Truck size={17} />, "Correios", true)}

          {cat("Financeiro")}
          {/*
           * Um item só para o assunto "dinheiro". Ter "Vendas" e "Financeiro"
           * lado a lado era redundante — são a mesma tela, e a lista de vendas
           * fica a uma aba de distância. O vendedor não entra aqui: para ele o
           * menu leva direto às vendas dele, que é tudo o que pode ver.
           */}
          {gestor
            ? item("vendas/financeiro", <Wallet size={17} />, "Financeiro")
            : item("vendas/lista", <DollarSign size={17} />, "Minhas vendas")}
          {item("relatorios", <BarChart3 size={17} />, "Relatórios")}
        </nav>

        {/* Ajuda — fica fora da navegação, junto do rodapé: não é lugar que se
            visita no fluxo de trabalho, é a saída para quando algo trava. */}
        <div className="relative px-3 pb-1 pt-2">
          <button
            type="button"
            onClick={() => goto("ajuda")}
            aria-current={isActive("ajuda") ? "page" : undefined}
            className={`group focus-ring relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-[13.5px] transition-colors duration-200 ${
              isActive("ajuda") ? "text-ink" : "text-mist hover:bg-fg/[0.05] hover:text-ink"
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-fg/[0.04] text-faint transition-colors group-hover:bg-fg/[0.08] group-hover:text-accent-soft">
              <LifeBuoy size={17} />
            </span>
            <span className="flex-1">Ajuda e suporte</span>
          </button>
        </div>

        {/* Usuário */}
        <div className="relative p-3">
          <div className="glass-subtle flex items-center gap-3 rounded-2xl p-2.5">
            {user?.image ? (
              <img src={user.image} alt="" className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-1 ring-fg/10" />
            ) : (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-soft to-accent text-xs text-white ring-1 ring-fg/10">{userInitials}</div>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-ink">{user?.nome || "Usuário"}</p>
              <p className="truncate text-[11px] text-faint">{user?.cargo || "Conectado"}</p>
            </div>

            {/* Mural da equipe — só gestor recebe (a API responde 403 ao vendedor). */}
            {gestor && <SinoNotificacoes />}

            <button
              type="button"
              onClick={() => goto("/configuracoes")}
              aria-label="Configurações"
              className={`focus-ring flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-200 hover:rotate-45 hover:bg-fg/[0.08] ${isActive("configuracoes") ? "text-accent-soft" : "text-faint hover:text-accent-soft"}`}
            >
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Rodapé */}
        <div className="relative flex items-center justify-between gap-2 border-t border-fg/[0.07] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src="/logo.png" width={22} height={22} alt="" className="rounded" />
            <p className="truncate text-[13px] text-mist">CodeEx Flow</p>
          </div>

          <button type="button" onClick={handleLogout} className="focus-ring flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-mist transition-colors hover:bg-danger/10 hover:text-danger">
            <LogOut size={14} /> Sair
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
