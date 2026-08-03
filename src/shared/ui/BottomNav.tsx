import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, ShoppingCart, DollarSign, Package, Users, Wallet, BarChart3, MoreHorizontal, Settings, LogOut, UserCircle } from "lucide-react";

import useAuth from "@/features/auth/store/auth.store";
import { ehGestor } from "@/features/vendas/components/TabsVendas";
import useEquipeStore, { planoTemEquipe } from "@/features/funcionarios/store/equipe.store";
import Sheet from "@/shared/ui/Sheet";
import { tocarNavegacao } from "@/shared/session/somSessao";
import { ABAS_SWIPE } from "@/shared/hooks/useSwipeAbas";

type Item = { rota: string; label: string; icon: React.ReactNode };

/**
 * Navegação do celular — dock flutuante, com a aba ativa expandida.
 *
 * A barra anterior era colada na borda, ocupando a largura toda, com ícone em
 * cima e rótulo embaixo nos quatro itens. Dois problemas nisso: quatro rótulos
 * de 10px competindo entre si o tempo todo — e nenhum deles é lido depois da
 * primeira semana de uso — e uma faixa cheia encostada na base, que fazia a
 * tela terminar num degrau.
 *
 * O desenho novo inverte a lógica: **só a aba em que você está mostra o nome**,
 * deitado ao lado do ícone dentro de uma pílula lavada; as outras ficam em
 * ícone puro. Quem está no PDV não precisa que a tela repita "PDV" — precisa
 * saber onde está e enxergar os outros destinos. E o nome aparecendo só ali dá
 * ao item ativo um peso que cor nenhuma sozinha daria.
 *
 * A dock solta do chão, com margem e cantos arredondados, é o que tira o
 * degrau: a tela continua atrás dela e o conteúdo respira até embaixo.
 *
 * Cuidados que o desenho exige:
 *
 * - **Rótulo escondido não é rótulo removido**: todo botão carrega `aria-label`,
 *   então leitor de tela anuncia o destino igual, ativo ou não.
 * - **A pílula desliza** (`layoutId`) e o nome abre junto, na mesma mola. Dois
 *   movimentos na mesma direção lêem como um só.
 * - **A dock não estica.** Ela tem a largura do próprio conteúdo (`w-fit`), e
 *   a aba ativa cresce só o que o nome precisa. Com `flex-1` ela engolia toda a
 *   sobra da barra e virava um bloco do tamanho de três botões.
 * - **52px de altura + 10 de margem** ficam abaixo dos 72px que o corpo das
 *   telas já reserva no rodapé — nenhuma tela precisou de ajuste.
 * - **Arrastar a tela troca de aba.** A ordem das abas mora em `ABAS_SWIPE`
 *   (em `useSwipeAbas`) e é lida daqui — uma fonte só para o gesto e a dock.
 */
const BottomNav = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [maisAberto, setMaisAberto] = useState(false);
  const reduzir = useReducedMotion();

  const gestor = ehGestor(user);

  /* No celular a sidebar não existe, então a busca precisa acontecer aqui —
     senão "Funcionários" nunca apareceria no menu "Mais". */
  const equipe = useEquipeStore((s) => s.equipe);
  const buscarEquipe = useEquipeStore((s) => s.buscar);

  useEffect(() => {
    if (gestor) buscarEquipe();
  }, [gestor, buscarEquipe]);

  /*
   * A barra é a mesma para todos: o funcionário opera a loja inteira.
   *
   * A ORDEM vem de `ABAS_SWIPE`, não daqui: o gesto de arrastar navega por
   * aquela lista, e se as duas divergissem o dedo iria para um lado e a pílula
   * para outro. Aqui ficam só o rótulo e o ícone de cada rota.
   */
  const APARENCIA: Record<string, { label: string; icon: React.ReactNode }> = {
    "/": { label: "Início", icon: <LayoutDashboard size={18} /> },
    "/pdv": { label: "PDV", icon: <ShoppingCart size={18} /> },
    // Direto na lista: a "Visão geral" é o que o Início já mostra.
    "/vendas/lista": { label: gestor ? "Vendas" : "Minhas vendas", icon: <DollarSign size={18} /> },
  };

  const principais: Item[] = ABAS_SWIPE.map((rota) => ({ rota, ...APARENCIA[rota] }));

  /** O resto vai para a folha "Mais" — não cabe e não é de uso constante. */
  const secundarios: Item[] = [
    { rota: "/clientes", label: "Clientes", icon: <Users size={18} /> },
    { rota: "/estoque", label: "Estoque", icon: <Package size={18} /> },
    // Financeiro virou aba de Vendas — deixou de ser destino próprio.
    ...(gestor ? [{ rota: "/vendas/financeiro", label: "Financeiro", icon: <Wallet size={18} /> }] : []),
    { rota: "/relatorios", label: "Relatórios", icon: <BarChart3 size={18} /> },
    // Equipe é do dono e só existe em plano que comporta mais de um usuário.
    ...(gestor && planoTemEquipe(equipe) ? [{ rota: "/funcionarios", label: "Funcionários", icon: <UserCircle size={18} /> }] : []),
    { rota: "/configuracoes", label: "Configurações", icon: <Settings size={18} /> },
  ];

  const ativo = (rota: string) => (rota === "/" ? pathname === "/" : pathname === rota || pathname.startsWith(`${rota}/`));

  const ir = (rota: string) => {
    // Mesmo critério da sidebar: sem som quando já se está no destino.
    if (!ativo(rota)) tocarNavegacao();

    setMaisAberto(false);
    navigate(rota);
  };

  const mola = reduzir ? { duration: 0 } : ({ type: "spring", stiffness: 440, damping: 36 } as const);

  return (
    <>
      {/* A moldura cobre a largura toda só para centralizar a dock e respeitar a
          área segura; ela não recebe toque, então a tela continua clicável em
          volta dela. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] px-3 md:hidden" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 10px)" }}>
        <motion.nav
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={reduzir ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
          className="glass-strong pointer-events-auto mx-auto flex h-[52px] w-fit max-w-full items-center gap-0.5 rounded-full border px-1.5"
          style={{
            borderColor: "rgb(var(--glass-border) / calc(var(--glass-border-alpha) + 0.06))",
            boxShadow: "0 14px 32px -16px rgb(0 0 0 / 0.45)",
          }}
        >
          {principais.map((it) => {
            const on = ativo(it.rota);

            return (
              <motion.button
                key={it.rota}
                type="button"
                layout
                onClick={() => ir(it.rota)}
                aria-label={it.label}
                aria-current={on ? "page" : undefined}
                whileTap={reduzir ? undefined : { scale: 0.94 }}
                transition={mola}
                /* `w-auto`, não `flex-1`: com flex-1 a aba ativa engolia toda a
                   sobra da barra e virava um bloco do tamanho de três botões.
                   Agora ela cresce só o que o nome precisa. */
                className={`focus-ring relative flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[14px] transition-colors ${on ? "px-3 text-accent-soft" : "w-10 text-faint"}`}
              >
                {/* A pílula é um irmão posicionado, não o fundo do botão: assim
                    ela desliza entre os itens em vez de piscar no destino. */}
                {on && (
                  <motion.span
                    layoutId="dock-ativo"
                    transition={mola}
                    /* Fundo lavado com anel, no lugar do accent chapado: a aba
                       fica marcada sem virar o objeto mais pesado da tela. */
                    className="absolute inset-0 rounded-[14px] bg-accent/[0.14] ring-1 ring-inset ring-accent/25"
                  />
                )}

                <span className="relative shrink-0">{it.icon}</span>

                {/* O nome abre em largura, não em opacidade: surgir por cima dos
                    vizinhos e só depois empurrá-los seriam dois tempos. */}
                <AnimatePresence initial={false}>
                  {on && (
                    <motion.span
                      key="rotulo"
                      initial={reduzir ? false : { opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={reduzir ? undefined : { opacity: 0, width: 0 }}
                      transition={mola}
                      className="relative overflow-hidden whitespace-nowrap text-[11.5px] leading-none tracking-tight"
                    >
                      {it.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}

          {/* Divisória: "Mais" abre uma folha, não navega. O fio separa as duas
              naturezas sem precisar de um rótulo explicando. */}
          <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-fg/10" />

          <motion.button
            type="button"
            layout
            onClick={() => setMaisAberto(true)}
            aria-label="Mais opções"
            aria-expanded={maisAberto}
            whileTap={reduzir ? undefined : { scale: 0.94 }}
            transition={mola}
            className={`focus-ring relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] transition-colors ${maisAberto ? "text-accent-soft" : "text-faint"}`}
          >
            {maisAberto && (
              <motion.span
                initial={{ opacity: 0, scale: 0.75 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 480, damping: 30 }}
                className="absolute inset-0 rounded-[14px] bg-accent/[0.14] ring-1 ring-inset ring-accent/25"
              />
            )}

            <motion.span className="relative" animate={reduzir ? {} : { rotate: maisAberto ? 90 : 0 }} transition={{ type: "spring", stiffness: 420, damping: 28 }}>
              <MoreHorizontal size={18} />
            </motion.span>
          </motion.button>
        </motion.nav>
      </div>

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
