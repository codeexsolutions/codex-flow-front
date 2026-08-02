import { useState } from "react";
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

  const gestor = ehGestor(user);

  const principais: Item[] = gestor
    ? [
        { rota: "/", label: "Início", icon: <LayoutDashboard size={19} /> },
        { rota: "/pdv", label: "PDV", icon: <ShoppingCart size={19} /> },
        { rota: "/vendas", label: "Vendas", icon: <DollarSign size={19} /> },
      ]
    : [
        { rota: "/pdv", label: "PDV", icon: <ShoppingCart size={19} /> },
        { rota: "/vendas", label: "Minhas vendas", icon: <DollarSign size={19} /> },
      ];

  /** O resto vai para a folha "Mais" — não cabe e não é de uso constante. */
  const secundarios: Item[] = gestor
    ? [
        { rota: "/clientes", label: "Clientes", icon: <Users size={18} /> },
        { rota: "/estoque", label: "Estoque", icon: <Package size={18} /> },
        { rota: "/financeiro", label: "Financeiro", icon: <Wallet size={18} /> },
        { rota: "/relatorios", label: "Relatórios", icon: <BarChart3 size={18} /> },
        { rota: "/vendas/funcionarios", label: "Funcionários", icon: <UserCircle size={18} /> },
        { rota: "/configuracoes", label: "Configurações", icon: <Settings size={18} /> },
      ]
    : [{ rota: "/configuracoes/perfil", label: "Meu perfil", icon: <UserCircle size={18} /> }];

  const ativo = (rota: string) => (rota === "/" ? pathname === "/" : pathname === rota || pathname.startsWith(`${rota}/`));

  const ir = (rota: string) => {
    setMaisAberto(false);
    navigate(rota);
  };

  return (
    <>
      <nav
        className="glass-strong fixed inset-x-0 bottom-0 z-[100] flex items-stretch border-x-0 border-b-0 border-t md:hidden"
        style={{
          borderColor: "rgb(var(--glass-border) / calc(var(--glass-border-alpha) + 0.04))",
          // Barra de gestos do iPhone: sem isto os botões ficam embaixo dela.
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {principais.map((it) => {
          const on = ativo(it.rota);

          return (
            <button
              key={it.rota}
              type="button"
              onClick={() => ir(it.rota)}
              aria-current={on ? "page" : undefined}
              // 56px de altura: alvo de toque confortável, acima do mínimo de 44.
              className={`focus-ring flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 transition-colors ${on ? "text-accent-soft" : "text-faint"}`}
            >
              <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${on ? "bg-accent/20" : ""}`}>{it.icon}</span>
              <span className="text-[10.5px] leading-none">{it.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setMaisAberto(true)}
          className={`focus-ring flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 transition-colors ${maisAberto ? "text-accent-soft" : "text-faint"}`}
        >
          <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${maisAberto ? "bg-accent/20" : ""}`}>
            <MoreHorizontal size={19} />
          </span>
          <span className="text-[10.5px] leading-none">Mais</span>
        </button>
      </nav>

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
