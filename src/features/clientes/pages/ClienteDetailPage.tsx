import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Pencil, FileText, MessageCircle, Mail, CalendarDays, Loader2, AlertTriangle, PhoneCall, Receipt, Wallet, ShoppingBag, TrendingUp, Users } from "lucide-react";

import HeaderPage from "../../components/Headers/HeaderPage";
import { Modal } from "../../components/Modal";
import Invoice from "../../components/Invoice/Invoice";

import CustomerService from "../../services/client.service";
import NoteService from "../../services/note.service";
import CustomerType, { eStatus } from "../../types/ClientType";
import { PedidoClienteType } from "../../types/InvoiceType";
import { useAlert } from "../../components/Alert/Alert";
import { formatDate, getInitials, onlyDigits, formatDocument, formatNumber } from "../../utils/format";
import { formatCurrency } from "../../utils/formatCurrency";

import ClienteEditForm from "./Components/Form/cliente-edit.form";
import { ClienteFormData } from "./Components/Schema/cliente.schema";
import ClienteSalesChart from "./Components/Chart/ClientesSalesChart";

const ITEMS_PER_PAGE = 6;

const horaPedido = (data?: string | Date) => (data ? new Date(data).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--");

/* -------------------------------------------------------------------------- */
/*  Sub-componentes                                                            */
/* -------------------------------------------------------------------------- */

const StatusBadge = ({ status }: { status: eStatus }) =>
  status === eStatus.ATIVO ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/15 px-2.5 py-0.5 text-[11px] font-medium text-success">
      <span className="h-1.5 w-1.5 rounded-full bg-success" /> Ativo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-fg/[0.08] bg-fg/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-mist">
      <span className="h-1.5 w-1.5 rounded-full bg-faint" /> Inativo
    </span>
  );

const PedidoStatusBadge = ({ status }: { status?: string }) => {
  if (status === "ABERTO")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/50 bg-warning/20 px-2.5 py-1 text-[11px] font-medium text-warning">
        <span className="h-1.5 w-1.5 rounded-full bg-warning" /> Aberto
      </span>
    );
  if (status === "CANCELADO")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/40 bg-danger/20 px-2.5 py-1 text-[11px] font-medium text-danger">
        <span className="h-1.5 w-1.5 rounded-full bg-danger" /> Cancelado
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/20 px-2.5 py-1 text-[11px] font-medium text-success">
      <span className="h-1.5 w-1.5 rounded-full bg-success" /> Fechado
    </span>
  );
};

const StatCard = ({ icon, label, value }: { icon: ReactNode; label: string; value: string }) => (
  <div className="rounded-2xl border border-fg/[0.07] bg-surface p-4 transition-colors hover:border-fg/[0.12]">
    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-accent/[0.14] text-accent-soft ring-1 ring-inset ring-accent/20">{icon}</div>
    <p className="text-[11px] uppercase tracking-[0.1em] text-faint">{label}</p>
    <p className="mt-1 truncate text-xl font-semibold tabular-nums tracking-tight text-ink">{value}</p>
  </div>
);

const SectionHead = ({ icon, title, meta }: { icon: ReactNode; title: string; meta?: string }) => (
  <div className="flex items-center gap-3 border-b border-fg/[0.07] px-5 py-3.5">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/[0.14] text-accent-soft ring-1 ring-inset ring-accent/20">{icon}</div>
    <div className="min-w-0">
      <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
      {meta && <p className="text-[11px] text-faint">{meta}</p>}
    </div>
  </div>
);

const ContactRow = ({ icon, value, tone = "accent" }: { icon: ReactNode; value: string; tone?: "accent" | "success" | "info" }) => {
  const toneCls = tone === "success" ? "bg-success/15 text-success" : tone === "info" ? "bg-[#4aa8ff]/15 text-[#a9d6ff]" : "bg-accent/[0.14] text-accent-soft";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-fg/[0.05] bg-fg/[0.02] px-3 py-2.5 text-[13px] text-mist">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneCls}`}>{icon}</span>
      <span className="truncate">{value}</span>
    </div>
  );
};

const QuickAction = ({ icon, label, href, tone = "accent" }: { icon: ReactNode; label: string; href?: string; tone?: "accent" | "success" | "info" }) => {
  const toneCls = tone === "success" ? "bg-success/15 text-success" : tone === "info" ? "bg-[#4aa8ff]/15 text-[#a9d6ff]" : "bg-accent/[0.15] text-accent-soft";

  const handleClick = () => {
    if (!href) return;
    if (tone === "success") window.open(href, "_blank", "noreferrer");
    else window.location.href = href;
  };

  return (
    <button type="button" onClick={handleClick} disabled={!href} className="group flex items-center gap-3 rounded-xl border border-fg/[0.06] bg-fg/[0.01] px-4 py-3 text-left transition-colors hover:border-fg/[0.12] hover:bg-fg/[0.04] disabled:cursor-not-allowed disabled:opacity-50">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneCls}`}>{icon}</span>
      <span className="flex-1 text-sm font-medium text-ink">{label}</span>
      <ChevronRight size={16} className="text-muted transition-colors group-hover:text-accent-soft" />
    </button>
  );
};

/* -------------------------------------------------------------------------- */
/*  Página                                                                     */
/* -------------------------------------------------------------------------- */

type PedidoAberto = { id?: string; clienteId: string; nome?: string };

const ClienteDetalhe = () => {
  const params = useParams();
  const id = params.id ?? params.clienteId ?? Object.values(params)[0];
  const navigate = useNavigate();
  const alert = useAlert();

  const [client, setClient] = useState<CustomerType | null>(null);
  const [pedidos, setPedidos] = useState<PedidoClienteType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pedidoAberto, setPedidoAberto] = useState<PedidoAberto | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!id) {
        setError("Cliente não informado.");
        return;
      }
      const res = await CustomerService.getAll();
      const list = (Array.isArray(res.data) ? res.data : (res.data?.data ?? [])) as CustomerType[];
      const found = list.find((c) => String(c.id) === String(id)) ?? null;

      if (!found) {
        setError("Cliente não encontrado.");
        return;
      }

      setClient(found);

      try {
        const pres = await NoteService.getAll();
        const all = pres.data?.data ?? [];
        setPedidos((all as PedidoClienteType[]).filter((p) => String(p.clienteId) === String(found.id)));
      } catch {
        setPedidos([]);
      }
    } catch {
      setError("Não foi possível carregar o cliente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUpdate = async (data: ClienteFormData) => {
    if (!client?.id) return;
    setSaving(true);
    try {
      await CustomerService.update(client.id, data);
      setShowEdit(false);
      await load();
      alert.success("Cliente atualizado", "As alterações foram salvas com sucesso.");
    } catch {
      alert.error("Erro ao salvar", "Não foi possível atualizar o cliente.");
    } finally {
      setSaving(false);
    }
  };

  const abrirPedido = (p: PedidoClienteType) => {
    if (!client?.id) return;
    setPedidoAberto({
      id: p.pedido?.pedidoId,
      clienteId: String(client.id),
      nome: client.nome,
    });
  };

  const fecharPedido = () => {
    setPedidoAberto(null);
    load();
  };

  const stats = useMemo(() => {
    const total = pedidos.reduce((a, p) => a + (p.pedido?.totalPedido ?? 0), 0);
    const count = pedidos.length;
    const ticket = count ? total / count : 0;
    const ultimo = pedidos.reduce<Date | null>((acc, p) => {
      const d = p.pedido?.dataPedido ? new Date(p.pedido.dataPedido) : null;
      if (!d) return acc;
      return !acc || d > acc ? d : acc;
    }, null);
    return { total, count, ticket, ultimo };
  }, [pedidos]);

  const monthly = useMemo(() => {
    const now = new Date();
    const buckets = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        total: 0,
      };
    });
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    pedidos.forEach((p) => {
      if (!p.pedido?.dataPedido) return;
      const d = new Date(p.pedido.dataPedido);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      const i = idx.get(k);
      if (i !== undefined) buckets[i].total += p.pedido.totalPedido ?? 0;
    });
    return buckets;
  }, [pedidos]);

  const statusBreak = useMemo(() => {
    const c: Record<string, number> = { FECHADO: 0, ABERTO: 0, CANCELADO: 0 };
    pedidos.forEach((p) => {
      const s = p.pedido?.pedidoStatus ?? "";
      if (s in c) c[s] += 1;
    });
    const total = pedidos.length || 1;
    return [
      { key: "FECHADO", label: "Fechados", color: "rgb(93 202 165)", count: c.FECHADO, pct: (c.FECHADO / total) * 100 },
      { key: "ABERTO", label: "Abertos", color: "rgb(250 199 117)", count: c.ABERTO, pct: (c.ABERTO / total) * 100 },
      { key: "CANCELADO", label: "Cancelados", color: "rgb(240 149 149)", count: c.CANCELADO, pct: (c.CANCELADO / total) * 100 },
    ];
  }, [pedidos]);

  const pedidosOrdenados = useMemo(
    () =>
      [...pedidos].sort((a, b) => {
        const da = a.pedido?.dataPedido ? new Date(a.pedido.dataPedido).getTime() : 0;
        const db = b.pedido?.dataPedido ? new Date(b.pedido.dataPedido).getTime() : 0;
        return db - da;
      }),
    [pedidos],
  );

  const totalPages = Math.max(1, Math.ceil(pedidosOrdenados.length / ITEMS_PER_PAGE));
  const currentPedidos = pedidosOrdenados.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const emptyRows = Math.max(0, ITEMS_PER_PAGE - currentPedidos.length);

  const waDigits = onlyDigits(client?.contato?.whatsapp ?? "");
  const telDigits = onlyDigits(client?.contato?.telefone ?? client?.contato?.celular ?? "");
  const email = client?.contato?.email;

  /* ------------------------------- Header ------------------------------- */

  const headerActions = (
    <div className="flex items-center gap-2">
      <button onClick={() => navigate("/clientes")} className="flex h-9 items-center gap-1.5 rounded-xl border border-fg/[0.08] bg-fg/[0.04] px-3 text-[13px] text-mist transition-colors hover:bg-fg/[0.08] hover:text-ink">
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>

      {client && (
        <button onClick={() => setShowEdit(true)} className="flex h-9 items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/[0.14] px-3 text-[13px] font-medium text-accent-soft transition-all hover:bg-accent/25 active:scale-95">
          <Pencil className="h-4 w-4" /> Editar
        </button>
      )}
    </div>
  );

  const headerIcon = client ? <div className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-accent/30 to-accent-soft/10 text-[13px] font-semibold text-accent-soft ring-1 ring-accent/25">{getInitials(client.nome)}</div> : <Users size={22} />;

  /* ------------------------------- Render ------------------------------- */

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-canvas text-ink">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgb(var(--accent)/0.14),transparent_70%)]" />

      <HeaderPage title={client?.nome ?? "Cliente"} subtitle={client?.cpfCnpj ? formatDocument(client.cpfCnpj) : "—"} icon={headerIcon} actions={headerActions} />

      <main className="relative z-10 flex-1 overflow-y-auto px-5 py-6 lg:px-8">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-faint" />
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <AlertTriangle className="h-8 w-8 text-danger" />
            <p className="text-danger">{error}</p>
            <button onClick={load} className="mt-2 rounded-lg border border-fg/[0.1] bg-fg/[0.05] px-4 py-2 text-sm text-ink transition-colors hover:bg-fg/[0.1]">
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {/* Coluna principal */}
            <div className="flex flex-col gap-4 xl:col-span-2">
              {/* Indicadores */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard icon={<Wallet size={16} />} label="Total em pedidos" value={formatCurrency(stats.total)} />
                <StatCard icon={<ShoppingBag size={16} />} label="Pedidos" value={formatNumber(stats.count)} />
                <StatCard icon={<TrendingUp size={16} />} label="Ticket médio" value={formatCurrency(stats.ticket)} />
                <StatCard icon={<CalendarDays size={16} />} label="Último pedido" value={stats.ultimo ? formatDate(stats.ultimo) : "—"} />
              </div>

              {/* Gráfico */}
              <div className="overflow-hidden rounded-2xl border border-fg/[0.07] bg-surface">
                <SectionHead icon={<TrendingUp className="h-4 w-4" />} title="Vendas" meta="Últimos 6 meses" />
                <div className="h-[280px] p-4">
                  <ClienteSalesChart monthlyData={monthly} />
                </div>
              </div>

              {/* Pedidos — estilo PDV */}
              <div className="flex flex-col overflow-hidden rounded-2xl border border-fg/[0.07] bg-surface">
                <SectionHead icon={<Receipt className="h-4 w-4" />} title="Pedidos" meta={`${pedidos.length} ${pedidos.length === 1 ? "pedido" : "pedidos"} no total`} />

                <div>
                  {pedidosOrdenados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-fg/[0.06] bg-fg/[0.03]">
                        <Receipt className="h-6 w-6 text-faint" />
                      </div>
                      <p className="text-[13px] text-mist">Nenhum pedido encontrado</p>
                    </div>
                  ) : (
                    <>
                      {currentPedidos.map((p) => {
                        const total = p.pedido?.totalPedido ?? 0;
                        const nItens = p.pedido?.itensPedido?.length ?? 0;
                        const status = p.pedido?.pedidoStatus;
                        return (
                          <button
                            key={p.pedido?.pedidoId}
                            onClick={() => abrirPedido(p)}
                            className="group relative flex h-[68px] w-full items-center gap-3 border-b border-fg/[0.04] px-5 text-left transition-colors before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:rounded-r before:bg-accent before:opacity-0 before:transition-opacity last:border-b-0 hover:bg-fg/[0.03] hover:before:opacity-100"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/[0.12] text-accent-soft ring-1 ring-inset ring-accent/15">
                              <Receipt size={16} />
                            </span>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium text-ink">
                                <span className="text-faint">#</span>
                                {p.pedido?.pedidoId?.slice(0, 8)}
                              </p>
                              <p className="text-[11px] text-faint">
                                {formatDate(p.pedido?.dataPedido)} · {horaPedido(p.pedido?.dataPedido)} · {nItens} {nItens === 1 ? "item" : "itens"}
                              </p>
                            </div>

                            <span className="hidden sm:block">
                              <PedidoStatusBadge status={status} />
                            </span>

                            <div className="text-right">
                              <p className="text-[13px] font-medium tabular-nums text-ink">{formatCurrency(total)}</p>
                              <p className={`text-[11px] tabular-nums ${status === "ABERTO" ? "text-warning" : status === "CANCELADO" ? "text-danger" : "text-success"}`}>{status === "ABERTO" ? "aberto" : status === "CANCELADO" ? "cancelado" : "fechado"}</p>
                            </div>
                            <ChevronRight size={16} className="text-muted" />
                          </button>
                        );
                      })}

                      {/* Linhas fantasma pra manter altura constante */}
                      {Array.from({ length: emptyRows }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-[68px] border-b border-fg/[0.04] last:border-b-0" />
                      ))}
                    </>
                  )}
                </div>

                {/* Rodapé com paginação estilo PDV */}
                {pedidosOrdenados.length > 0 && (
                  <div className="flex shrink-0 items-center justify-between gap-3 border-t border-fg/[0.06] bg-fg/[0.02] px-5 py-3">
                    <p className="flex items-center gap-2 text-[12px] text-faint">
                      <TrendingUp size={14} className="text-accent-soft" />
                      Ticket médio: <span className="font-medium tabular-nums text-ink">{formatCurrency(stats.ticket)}</span>
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-fg/[0.08] bg-fg/[0.04] text-mist transition-colors hover:bg-fg/[0.08] hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-fg/[0.04]"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="text-[12px] text-faint">
                        Página <span className="font-medium text-mist">{currentPage}</span>/<span className="font-medium text-mist">{totalPages}</span>
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-fg/[0.08] bg-fg/[0.04] text-mist transition-colors hover:bg-fg/[0.08] hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-fg/[0.04]"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Coluna lateral */}
            <aside className="flex flex-col gap-4">
              {/* Perfil / contatos */}
              <div className="relative overflow-hidden rounded-2xl border border-fg/[0.08] bg-gradient-to-br from-surface-raised to-surface p-5">
                <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/10 blur-[70px]" />

                <div className="relative flex flex-col items-center text-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/40 to-accent-soft/10 text-3xl font-semibold text-accent-soft ring-1 ring-accent/30">{client ? getInitials(client.nome) : "?"}</div>

                  <h2 className="mt-4 max-w-full truncate text-xl font-semibold tracking-tight text-ink">{client?.nome}</h2>

                  <p className="mt-1 flex items-center gap-1.5 text-sm text-mist">
                    <FileText size={14} className="text-accent" />
                    {client?.cpfCnpj ? formatDocument(client.cpfCnpj) : "—"}
                  </p>

                  <div className="mt-3">{client && <StatusBadge status={client.status} />}</div>
                </div>

                {(email || client?.contato?.celular || client?.contato?.telefone || client?.contato?.whatsapp) && (
                  <div className="relative mt-5 space-y-2 border-t border-fg/[0.06] pt-4">
                    {email && <ContactRow icon={<Mail size={15} />} value={email} />}
                    {(client?.contato?.celular || client?.contato?.telefone) && <ContactRow icon={<PhoneCall size={15} />} value={formatNumber(client!.contato!.celular || client!.contato!.telefone || "")} />}
                    {client?.contato?.whatsapp && <ContactRow icon={<MessageCircle size={15} />} value={formatNumber(client.contato.whatsapp)} tone="success" />}
                  </div>
                )}
              </div>

              {/* Status dos pedidos */}
              {pedidos.length > 0 && (
                <div className="rounded-2xl border border-fg/[0.07] bg-surface p-5">
                  <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-mist">Status dos pedidos</p>
                  <div className="space-y-3.5">
                    {statusBreak.map((s) => (
                      <div key={s.key}>
                        <div className="mb-1.5 flex items-center justify-between text-[13px]">
                          <span className="flex items-center gap-2 text-mist">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.label}
                          </span>
                          <span className="font-semibold tabular-nums text-ink">{s.count}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-fg/[0.06]">
                          <div className="h-full rounded-full transition-all" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ações rápidas */}
              <div className="rounded-2xl border border-fg/[0.07] bg-surface p-5">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-mist">Ações rápidas</p>
                <div className="flex flex-col gap-2.5">
                  <QuickAction icon={<MessageCircle size={18} />} label="WhatsApp" href={waDigits ? `https://wa.me/55${waDigits}` : undefined} tone="success" />
                  <QuickAction icon={<PhoneCall size={18} />} label="Ligar" href={telDigits ? `tel:${telDigits}` : undefined} />
                  <QuickAction icon={<Mail size={18} />} label="E-mail" href={email ? `mailto:${email}` : undefined} tone="info" />
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>

      {/* Modal de edição */}
      {client && <ClienteEditForm open={showEdit} client={client} saving={saving} onClose={() => setShowEdit(false)} onSubmit={handleUpdate} />}

      {/* Modal do Invoice (igual PDV) */}
      <Modal open={!!pedidoAberto} onClose={fecharPedido} title="Pedido" subtitle={pedidoAberto?.nome} size="full">
        {pedidoAberto && <Invoice id={pedidoAberto.id} clienteId={pedidoAberto.clienteId} nome={pedidoAberto.nome} />}
      </Modal>
    </div>
  );
};

export default ClienteDetalhe;
