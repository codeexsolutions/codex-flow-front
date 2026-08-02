import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import { Bell, Package, ShoppingCart, UserPlus, Wallet, Users, Trash2, CheckCheck, BadgeCheck } from "lucide-react";

import NotificacaoService, { type Mural, type Notificacao, type TipoNotificacao } from "@/features/notificacoes/services/notificacao.service";
import { formatDateTime } from "@/shared/utils/date";

/** Ícone e cor por tipo de evento — o rótulo sempre acompanha, nunca só a cor. */
const LOOK: Record<TipoNotificacao, { icon: React.ReactNode; cls: string }> = {
  PRODUTO_CRIADO: { icon: <Package size={14} />, cls: "bg-accent/15 text-accent-soft" },
  PRODUTO_ALTERADO: { icon: <Package size={14} />, cls: "bg-accent/15 text-accent-soft" },
  PRODUTO_EXCLUIDO: { icon: <Trash2 size={14} />, cls: "bg-danger/15 text-danger" },
  VENDA_REGISTRADA: { icon: <ShoppingCart size={14} />, cls: "bg-success/15 text-success" },
  VENDA_ALTERADA: { icon: <ShoppingCart size={14} />, cls: "bg-warning/15 text-warning" },
  CLIENTE_CADASTRADO: { icon: <UserPlus size={14} />, cls: "bg-accent/15 text-accent-soft" },
  PAGAMENTO_RECEBIDO: { icon: <BadgeCheck size={14} />, cls: "bg-success/15 text-success" },
  CAIXA_LANCAMENTO: { icon: <Wallet size={14} />, cls: "bg-accent/15 text-accent-soft" },
  CAIXA_EXCLUSAO: { icon: <Trash2 size={14} />, cls: "bg-danger/15 text-danger" },
  FUNCIONARIO_CADASTRADO: { icon: <Users size={14} />, cls: "bg-accent/15 text-accent-soft" },
  FUNCIONARIO_ALTERADO: { icon: <Users size={14} />, cls: "bg-accent/15 text-accent-soft" },
};

const PADRAO = { icon: <Bell size={14} />, cls: "bg-fg/[0.06] text-mist" };

/**
 * Mural de atividade da equipe.
 *
 * Chega por socket (mesma sala por empresa já usada na liberação do
 * pagamento), então não há polling nem botão de atualizar. A primeira carga é
 * por HTTP porque quem acabou de abrir o sistema precisa ver o que aconteceu
 * enquanto estava fora.
 */
const SinoNotificacoes = () => {
  const navigate = useNavigate();

  const [mural, setMural] = useState<Mural>({ notificacoes: [], naoLidas: 0 });
  const [aberto, setAberto] = useState(false);
  const painelRef = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    try {
      setMural(await NotificacaoService.listar());
    } catch {
      /* Silencioso: é um acessório, não pode atrapalhar a tela. */
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /* ---------------- Tempo real ---------------- */
  useEffect(() => {
    const baseUrl = (import.meta.env.PROD ? import.meta.env.VITE_API_PRODUCTION : import.meta.env.VITE_API_LOCAL) ?? "";
    const origem = String(baseUrl).replace(/\/v1\/?$/, "");

    let socket: Socket | null = null;

    try {
      socket = io(origem, {
        auth: { token: localStorage.getItem("token") },
        transports: ["websocket", "polling"],
        reconnectionDelay: 2000,
      });

      socket.on("notificacao:nova", (nova: Notificacao) => {
        setMural((atual) => ({
          notificacoes: [nova, ...atual.notificacoes].slice(0, 40),
          naoLidas: atual.naoLidas + 1,
        }));
      });
    } catch {
      /* Sem socket o mural ainda funciona: recarrega ao reabrir a tela. */
    }

    return () => {
      socket?.disconnect();
    };
  }, []);

  /* ---------------- Fechar ao clicar fora ---------------- */
  useEffect(() => {
    if (!aberto) return;

    const fora = (e: MouseEvent) => {
      if (painelRef.current && !painelRef.current.contains(e.target as Node)) setAberto(false);
    };

    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  const abrir = (n: Notificacao) => {
    if (!n.lida) {
      NotificacaoService.marcarLida(n.id).catch(() => {});
      setMural((atual) => ({
        notificacoes: atual.notificacoes.map((x) => (x.id === n.id ? { ...x, lida: true } : x)),
        naoLidas: Math.max(0, atual.naoLidas - 1),
      }));
    }

    setAberto(false);
    if (n.rota) navigate(n.rota);
  };

  const lerTudo = async () => {
    await NotificacaoService.marcarTodasLidas().catch(() => {});
    setMural((atual) => ({ notificacoes: atual.notificacoes.map((n) => ({ ...n, lida: true })), naoLidas: 0 }));
  };

  return (
    <div className="relative" ref={painelRef}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label={mural.naoLidas > 0 ? `Notificações: ${mural.naoLidas} não lidas` : "Notificações"}
        className={`focus-ring relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 hover:bg-fg/[0.08] ${aberto ? "text-accent-soft" : "text-faint hover:text-accent-soft"}`}
      >
        <Bell size={16} />
        {mural.naoLidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[9px] leading-none text-white">
            {mural.naoLidas > 9 ? "9+" : mural.naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="glass-strong elev-3 absolute bottom-full left-0 z-50 mb-2 w-[320px] overflow-hidden rounded-2xl border border-fg/[0.08]">
          <div className="flex items-center justify-between gap-2 border-b border-fg/[0.07] px-4 py-2.5">
            <p className="text-[12.5px] text-ink">Atividade da equipe</p>
            {mural.naoLidas > 0 && (
              <button type="button" onClick={lerTudo} className="focus-ring flex items-center gap-1 rounded-lg px-1.5 py-1 text-[11px] text-accent transition hover:text-accent-soft">
                <CheckCheck size={12} /> Marcar lidas
              </button>
            )}
          </div>

          <div className="max-h-[min(60vh,420px)] overflow-y-auto">
            {mural.notificacoes.length === 0 ? (
              <p className="px-4 py-10 text-center text-[12px] text-faint">Nada por aqui ainda. O que a equipe fizer aparece nesta lista.</p>
            ) : (
              mural.notificacoes.map((n) => {
                const look = LOOK[n.tipo] ?? PADRAO;

                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => abrir(n)}
                    className={`flex w-full items-start gap-2.5 border-b border-fg/[0.04] px-4 py-2.5 text-left transition-colors hover:bg-fg/[0.03] ${n.lida ? "" : "bg-accent/[0.04]"}`}
                  >
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${look.cls}`}>{look.icon}</span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-ink">{n.titulo}</span>
                      {n.descricao && <span className="block truncate text-[11px] text-mist">{n.descricao}</span>}
                      <span className="mt-0.5 block truncate text-[10.5px] text-faint">
                        {n.usuarioNome ? `${n.usuarioNome} · ` : ""}
                        {formatDateTime(n.criadoEm)}
                      </span>
                    </span>

                    {!n.lida && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SinoNotificacoes;
