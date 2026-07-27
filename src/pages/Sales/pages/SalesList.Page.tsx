import { useEffect, useMemo, useState } from "react";
import { ShoppingCart, Search, XCircle } from "lucide-react";
import { Modal } from "../../../components/Modal";
import Invoice from "../../../components/Invoice/Invoice";
import NoteService from "../../../services/note.service";
import { formatCurrency } from "../../../utils/formatCurrency";
import { PedidoClienteType } from "../../../types/InvoiceType";

const estaFechado = (v: PedidoClienteType) => v.pedido.pedidoStatus === "FECHADO";
const estaAberto = (v: PedidoClienteType) => v.pedido.pedidoStatus === "ABERTO";
const estaCancelado = (v: PedidoClienteType) => v.pedido.pedidoStatus === "CANCELADO";

const totalDoPedido = (v: PedidoClienteType) => Number(v.pedido.totalPedido) || (v.pedido.itensPedido ?? []).reduce((acc, item) => acc + Number(item.valorVendaItem || 0) * Number(item.quantidadeItem || 0), 0);

const formatarData = (data?: string | Date) => (data ? new Date(data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "--");

type StatusFiltro = "todos" | "pago" | "pendente" | "cancelado";
type NotaAberta = { id?: string; clienteId: string; nome?: string };

/* ======================= UI Helpers ======================= */
const badgeStatus = (v: PedidoClienteType) => {
  if (estaFechado(v)) return <span className="rounded-full bg-[#0f6e56]/30 px-2 py-0.5 text-[10px] text-[#5dcaa5]">Pago</span>;
  if (estaAberto(v)) return <span className="rounded-full bg-[#a22d2d]/20 px-2 py-0.5 text-[10px] text-[#f09595]">Pendente</span>;
  if (estaCancelado(v)) return <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-[#8a85b4]">Cancelado</span>;
  return <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-[#8a85b4]">{v.pedido.pedidoStatus}</span>;
};

/* ======================= Sales / Outlet Page ======================= */
const SalesList = () => {
  const [vendas, setVendas] = useState<PedidoClienteType[]>([]);
  const [notaAberta, setNotaAberta] = useState<NotaAberta | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFiltro>("todos");

  const carregar = () => {
    NoteService.getAll()
      .then(({ data }) => {
        const lista = ((data as any)?.data ?? []).filter((v: any): v is PedidoClienteType => !!v && !!v.pedido);
        setVendas(lista);
      })
      .catch(() => setVendas([]));
  };

  useEffect(() => {
    carregar();
  }, []);

  const abrirNota = (nota: NotaAberta) => setNotaAberta(nota);
  const fecharNota = () => {
    setNotaAberta(null);
    carregar();
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
    return vendas.filter(estaAberto).reduce((acc, v) => acc + totalDoPedido(v), 0);
  }, [vendas]);

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
        <div className="flex max-w-xs flex-1 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.05] px-3 transition-colors focus-within:border-[#7c6ef5]">
          <Search className="h-3.5 w-3.5 text-[#4e4a72]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente…" className="flex-1 bg-transparent py-2 text-xs text-[#e8e4ff] outline-none placeholder:text-[#6f6a93]" />
        </div>

        <div className="flex gap-1.5">
          {(["todos", "pago", "pendente", "cancelado"] as const).map((opt) => (
            <button key={opt} onClick={() => setStatus(opt)} className={`cursor-pointer rounded-lg px-3 py-2 text-[11px] capitalize transition-colors ${status === opt ? "bg-[#7c6ef5] text-white" : "border border-white/[0.08] bg-white/[0.05] text-[#8a85b4] hover:bg-white/[0.09]"}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#15132a]">
        <div className="flex items-center justify-between border-b border-white/[0.07] bg-white/[0.02] px-4 py-3">
          <div>
            <h2 className="text-[13px] text-[#e8e4ff]">Todas as vendas</h2>
            <p className="text-[11px] text-[#4e4a72]">
              {vendas.length} {vendas.length === 1 ? "nota" : "notas"}
              {vendas.length !== todasCount ? ` de ${todasCount}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-[#4e4a72]">Total em aberto</p>
            <p className="text-base text-[#f09595]">{formatCurrency(totalEmAberto)}</p>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-white/[0.06] bg-white/[0.03] py-2 text-center text-[10px] uppercase tracking-wide text-[#4e4a72]">
          <p>ID</p>
          <p>Cliente</p>
          <p>Data</p>
          <p>Status</p>
          <p>Total</p>
          <p className="text-[#5dcaa5]">Pago</p>
          <p className="text-[#f09595]">Pendente</p>
        </div>

        <div className="flex-1 overflow-auto">
          {vendas.length > 0 ? (
            <div className="divide-y divide-white/[0.04]">
              {vendas.map((v) => {
                const total = totalDoPedido(v);
                const pago = estaFechado(v) ? total : 0;
                const pendente = estaAberto(v) ? total : 0;
                const idCurto = v.pedido.pedidoId?.slice(-6).toUpperCase() ?? "—";

                return (
                  <button key={v.pedido.pedidoId} onClick={() => onAbrir(v)} className="grid w-full grid-cols-7 items-center gap-2 px-2 py-2.5 text-center text-[11px] text-[#e8e4ff] transition-colors hover:bg-white/[0.04]">
                    <p className="truncate font-mono text-[10px] text-[#8a85b4]">#{idCurto}</p>
                    <p className="truncate text-left text-[11px]">{v.nomeCliente}</p>
                    <p className="text-[#8a85b4]">{formatarData(v.pedido.dataPedido)}</p>
                    <p className="flex justify-center">{badgeStatus(v)}</p>
                    <p>{formatCurrency(total)}</p>
                    <p className={pago > 0 ? "text-[#5dcaa5]" : "text-[#4e4a72]"}>{formatCurrency(pago)}</p>
                    <p className={pendente > 0 ? "text-[#f09595]" : "text-[#4e4a72]"}>{formatCurrency(pendente)}</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-[#4e4a72]">
                {status === "cancelado" ? <XCircle className="h-6 w-6" /> : <ShoppingCart className="h-6 w-6" />}
                <p>Nenhuma venda encontrada</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SalesList;
