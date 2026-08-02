import { useEffect, useMemo, useState } from "react";
import { ShoppingCart, Search, XCircle } from "lucide-react";
import { Modal } from "@/shared/ui/Modal";
import Invoice from "@/features/vendas/components/Invoice";
import { formatCurrency } from "@/shared/utils/currency";
import { type PedidoClienteType, estaAberto, estaCancelado, estaFechado, totalDoPedido, valorPagoDoPedido, valorPendenteDoPedido } from "@/shared/domain/pedido";
import { formatDateShort } from "@/shared/utils/date";
import { PedidoStatusBadge } from "@/shared/ui/StatusBadge";
import useVendaStore from "@/features/vendas/store/venda.store";
import VendasMobile, { type VendaItem } from "@/features/vendas/components/VendasMobile";
import Sheet from "@/shared/ui/Sheet";
import { useIsMobile } from "@/shared/hooks/useIsMobile";

type StatusFiltro = "todos" | "pago" | "pendente" | "cancelado";
type NotaAberta = { id?: string; clienteId: string; nome?: string };

/* ======================= Sales / Outlet Page ======================= */
const SalesList = () => {
  const mobile = useIsMobile();
  const vendas = useVendaStore((s) => s.vendas);
  const fetchVendas = useVendaStore((s) => s.fetchVendas);

  const [notaAberta, setNotaAberta] = useState<NotaAberta | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFiltro>("todos");

  useEffect(() => {
    fetchVendas();
  }, [fetchVendas]);

  const abrirNota = (nota: NotaAberta) => setNotaAberta(nota);
  const fecharNota = () => {
    setNotaAberta(null);
    fetchVendas(true);
  };

  /* ======================= Filtros ======================= */
  const vendasFiltradas = useMemo(() => {
    let base = [...vendas].sort((a, b) => +new Date(b.pedido.dataPedido) - +new Date(a.pedido.dataPedido));

    if (status === "pago") base = base.filter(estaFechado);
    else if (status === "pendente") base = base.filter(estaAberto);
    else if (status === "cancelado") base = base.filter(estaCancelado);

    const termo = search.trim().toLowerCase();
    if (termo) base = base.filter((v) => v.nomeCliente?.toLowerCase().includes(termo));

    return base;
  }, [vendas, status, search]);

const totalEmAberto = useMemo(() => {
  return vendas
    .filter((v) => !estaCancelado(v))
    .reduce((acc, v) => acc + valorPendenteDoPedido(v), 0);
}, [vendas]);

  if (mobile) {
    const itens: VendaItem[] = vendasFiltradas.map((v) => ({
      pedidoId: v.pedido.pedidoId,
      clienteId: v.clienteId,
      nomeCliente: v.nomeCliente,
      data: v.pedido.dataPedido,
      total: totalDoPedido(v),
      pendente: valorPendenteDoPedido(v),
      status: estaCancelado(v) ? "cancelado" : estaFechado(v) ? "pago" : "pendente",
    }));

    return (
      <div className="h-full w-full overflow-y-auto text-ink">
        <VendasMobile
          vendas={itens}
          totalVendas={vendas.length}
          totalEmAberto={totalEmAberto}
          busca={search}
          onBusca={setSearch}
          status={status}
          onStatus={setStatus}
          onAbrirNota={(v) => abrirNota({ id: v.pedidoId, clienteId: v.clienteId, nome: v.nomeCliente })}
        />

        {/* A nota ocupa a tela toda: é onde a venda é editada e recebida. */}
        <Sheet open={!!notaAberta} onClose={fecharNota} title={notaAberta?.id ? "Venda" : "Nova venda"} subtitle={notaAberta?.nome} altura="cheia">
          {notaAberta && <Invoice id={notaAberta.id} clienteId={notaAberta.clienteId} nome={notaAberta.nome} onSaved={fecharNota} />}
        </Sheet>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="min-h-0 flex-1 ">
        <TabSales
          vendas={vendasFiltradas}
          todasCount={vendas.length}
          totalEmAberto={totalEmAberto}
          search={search}
          setSearch={setSearch}
          status={status}
          setStatus={setStatus}
          onAbrir={(v: PedidoClienteType) =>
            abrirNota({
              id: v.pedido.pedidoId,
              clienteId: v.clienteId,
              nome: v.nomeCliente,
            })
          }
        />
      </div>

      <Modal open={!!notaAberta} onClose={fecharNota} title={notaAberta?.id ? "Venda" : "Nova venda"} subtitle={notaAberta?.nome} size="full">
        {notaAberta && <Invoice id={notaAberta.id} clienteId={notaAberta.clienteId} nome={notaAberta.nome} />}
      </Modal>
    </div>
  );
};

/* ======================= Tabela ======================= */
function TabSales({
  vendas,
  todasCount,
  totalEmAberto,
  search,
  setSearch,
  status,
  setStatus,
  onAbrir,
}: {
  vendas: PedidoClienteType[];
  todasCount: number;
  totalEmAberto: number;
  search: string;
  setSearch: (v: string) => void;
  status: StatusFiltro;
  setStatus: (v: StatusFiltro) => void;
  onAbrir: (v: PedidoClienteType) => void;
}) {
  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_1fr] gap-3">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex max-w-xs flex-1 items-center gap-2 rounded-lg border border-fg/[0.08] bg-fg/[0.05] px-3 transition-colors focus-within:border-accent">
          <Search className="h-3.5 w-3.5 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente..." className="flex-1 bg-transparent py-2 text-xs text-ink outline-none placeholder:text-faint" />
        </div>

        <div className="flex gap-1.5">
          {(["todos", "pago", "pendente", "cancelado"] as const).map((opt) => (
            <button key={opt} onClick={() => setStatus(opt)} className={`cursor-pointer rounded-lg px-3 py-2 text-[11px] capitalize transition-colors ${status === opt ? "bg-accent text-white" : "border border-fg/[0.08] bg-fg/[0.05] text-mist hover:bg-fg/[0.09]"}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela com scroll horizontal responsivo */}
      <div className="flex min-h-0 flex-col overflow-hidden card glass-sheen rounded-xl">
        <div className="flex items-center justify-between border-b border-fg/[0.07] bg-fg/[0.02] px-4 py-3">
          <div>
            <h2 className="text-[13px] text-ink">Todas as vendas</h2>
            <p className="text-[11px] text-muted">
              {vendas.length} {vendas.length === 1 ? "nota" : "notas"}
              {vendas.length !== todasCount ? " de " + todasCount : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted">Total em aberto</p>
            <p className="text-base text-danger">{formatCurrency(totalEmAberto)}</p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-7 border-b border-fg/[0.06] bg-fg/[0.03] py-2 text-center text-[10px] uppercase tracking-wide text-muted">
              <p>ID</p>
              <p>Cliente</p>
              <p>Data</p>
              <p>Status</p>
              <p>Total</p>
              <p className="text-success">Pago</p>
              <p className="text-danger">Pendente</p>
            </div>

            {vendas.length > 0 ? (
              <div className="divide-y divide-fg/[0.04]">
                {vendas.map((v) => {
                  const total = totalDoPedido(v);
                  const pago = valorPagoDoPedido(v);
                  const pendente = valorPendenteDoPedido(v);
                  const idCurto = v.pedido.pedidoId?.slice(-6).toUpperCase() ?? "—";

                  return (
                    <button key={v.pedido.pedidoId} onClick={() => onAbrir(v)} className="grid w-full grid-cols-7 items-center gap-2 px-2 py-2.5 text-center text-[11px] text-ink transition-colors hover:bg-fg/[0.04]">
                      <p className="truncate font-mono text-[10px] text-mist">#{idCurto}</p>
                      <p className="truncate text-left text-[11px]">{v.nomeCliente}</p>
                      <p className="text-mist">{formatDateShort(v.pedido.dataPedido)}</p>
                      <p className="flex justify-center">{<PedidoStatusBadge status={v.pedido.pedidoStatus} />}</p>
                      <p>{formatCurrency(total)}</p>
                      <p className={pago > 0 ? "text-success" : "text-muted"}>{formatCurrency(pago)}</p>
                      <p className={pendente > 0 ? "text-danger" : "text-muted"}>{formatCurrency(pendente)}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center py-10">
                <div className="flex flex-col items-center gap-2 text-muted">
                  {status === "cancelado" ? <XCircle className="h-6 w-6" /> : <ShoppingCart className="h-6 w-6" />}
                  <p>Nenhuma venda encontrada</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SalesList;
