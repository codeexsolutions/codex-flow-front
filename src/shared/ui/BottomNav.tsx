import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, DollarSign, Package, Users, Wallet, BarChart3, MoreHorizontal, Settings, LogOut, UserCircle } from "lucide-react";

import useAuth from "@/features/auth/store/auth.store";
import { ehGestor } from "@/features/vendas/components/TabsVendas";
import Sheet from "@/shared/ui/Sheet";

type Item = { rota: string; label: string; icon: React.ReactNode };

/**
 * Navegação do celular.
 *
 * Barra inferior em vez de gaveta lateral: no celular o polegar alcança a base
 * da tela, não o canto superior esquerdo. São no máximo quatro destinos fixos —
 * passando disso vira lista, e lista se esconde atrás de "Mais".
 */
const BottomNav = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [maisAberto, setMaisAberto] = useState(false);
  const reduzir = useReducedMotion();

  const gestor = ehGestor(user);

  /* A barra é a mesma para todos: o funcionário opera a loja inteira. */
  const principais: Item[] = [
    { rota: "/", label: "Início", icon: <LayoutDashboard size={19} /> },
    { rota: "/pdv", label: "PDV", icon: <ShoppingCart size={19} /> },
    // Direto na lista: a "Visão geral" é o que o Início já mostra.
    { rota: "/vendas/lista", label: "Vendas", icon: <DollarSign size={19} /> },
  ];

  /** O resto vai para a folha "Mais" — não cabe e não é de uso constante. */
  const secundarios: Item[] = [
    { rota: "/clientes", label: "Clientes", icon: <Users size={18} /> },
    { rota: "/estoque", label: "Estoque", icon: <Package size={18} /> },
    { rota: "/financeiro", label: "Financeiro", icon: <Wallet size={18} /> },
    { rota: "/relatorios", label: "Relatórios", icon: <BarChart3 size={18} /> },
    // Gestão de acesso é do dono: a API recusa, então nem mostramos o caminho.
    ...(gestor ? [{ rota: "/vendas/funcionarios", label: "Funcionários", icon: <UserCircle size={18} /> }] : []),
    { rota: "/configuracoes", label: "Configurações", icon: <Settings size={18} /> },
  ];

  const ativo = (rota: string) => (rota === "/" ? pathname === "/" : pathname === rota || pathname.startsWith(`${rota}/`));

  const ir = (rota: string) => {
    setMaisAberto(false);
    navigate(rota);
  };

  return (
    <>
      <motion.nav
        initial={{ y: 64 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="glass-strong fixed inset-x-0 bottom-0 z-[100] flex items-stretch border-x-0 border-b-0 border-t md:hidden"
        style={{
          borderColor: "rgb(var(--glass-border) / calc(var(--glass-border-alpha) + 0.04))",
          // Barra de gestos do iPhone: sem isto os botões ficam embaixo dela.
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Fio de luz no topo da barra — o mesmo detalhe dos cards do sistema. */}
        <span aria-hidden className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-accent-soft/50 to-transparent" />

        {principais.map((it) => {
          const on = ativo(it.rota);

          return (
            <motion.button
              key={it.rota}
              type="button"
              onClick={() => ir(it.rota)}
              aria-current={on ? "page" : undefined}
              whileTap={reduzir ? undefined : { scale: 0.9 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              // 56px de altura: alvo de toque confortável, acima do mínimo de 44.
              className={`focus-ring relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 transition-colors ${on ? "text-accent-soft" : "text-faint"}`}
            >
              <span className="relative flex h-7 w-12 items-center justify-center">
                {/* `layoutId` faz a pílula DESLIZAR de um item para o outro em
                    vez de piscar no destino — é o que dá a leitura de
                    continuidade entre as abas. */}
                {on && (
                  <motion.span
                    layoutId="pilula-nav"
                    className="absolute inset-0 rounded-full bg-accent/20"
                    transition={reduzir ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}

                <motion.span
                  className="relative"
                  animate={reduzir ? {} : { y: on ? -1 : 0, scale: on ? 1.08 : 1 }}
                  transition={{ type: "spring", stiffness: 460, damping: 26 }}
                >
                  {it.icon}
                </motion.span>
              </span>

              <span className={`text-[10.5px] leading-none transition-opacity ${on ? "opacity-100" : "opacity-80"}`}>{it.label}</span>

              {/* Traço fino sob o item ativo: fecha a composição sem pesar. */}
              {on && !reduzir && (
                <motion.span
                  layoutId="tracinho-nav"
                  className="absolute bottom-1 h-[2px] w-6 rounded-full bg-accent-soft"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
            </motion.button>
          );
        })}

        <motion.button
          type="button"
          onClick={() => setMaisAberto(true)}
          whileTap={reduzir ? undefined : { scale: 0.9 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={`focus-ring relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 transition-colors ${maisAberto ? "text-accent-soft" : "text-faint"}`}
        >
          <span className="relative flex h-7 w-12 items-center justify-center">
            <motion.span className="relative" animate={reduzir ? {} : { rotate: maisAberto ? 90 : 0 }} transition={{ type: "spring", stiffness: 420, damping: 28 }}>
              <MoreHorizontal size={19} />
            </motion.span>
          </span>
          <span className="text-[10.5px] leading-none opacity-80">Mais</span>
        </motion.button>
      </motion.nav>

      <Sheet open={maisAberto} onClose={() => setMaisAberto(false)} title="Mais" subtitle={user?.nome ? `Conectado como ${user.nome}` : undefined}>
        <div className="flex flex-col gap-1 pb-2">
          {secundarios.map((it) => (
            <button
              key={it.rota}
              type="button"
              onClick={() => ir(it.rota)}
              className="focus-ring flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-left text-[14px] text-ink transition-colors hover:bg-fg/[0.05]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fg/[0.05] text-mist">{it.icon}</span>
              {it.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              setMaisAberto(false);
              Promise.resolve(logout()).catch(() => {});
            }}
            className="focus-ring mt-1 flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-left text-[14px] text-danger transition-colors hover:bg-danger/10"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-danger/10">
              <LogOut size={18} />
            </span>
            Sair
          </button>
        </div>
      </Sheet>
    </>
  );
};

export default BottomNav;
