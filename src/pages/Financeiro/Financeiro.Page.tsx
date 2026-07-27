import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CalendarClock,
  Plus,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  RotateCw,
} from "lucide-react";

import HeaderPage from "../../components/Headers/HeaderPage";
import { Modal } from "../../components/Modal";
import { useAlert } from "../../components/Alert/Alert";
import FinanceiroService from "../../services/financeiro.service";
import NoteService from "../../services/note.service";
import {
  MovimentacaoType,
  NovaMovimentacaoType,
  NovaParcelaType,
  ParcelaType,
  ResumoFinanceiroType,
} from "../../types/FinanceiroType";

const brl = (v?: number) => (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const brDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-");

type Aba = "parcelas" | "caixa";
type PedidoOpcao = { pedidoId: string; nomeCliente: string; totalPedido: number };

function StatusBadge({ status }: { status: ParcelaType["status"] }) {
  const map: Record<ParcelaType["status"], { label: string; cls: string }> = {
    PENDENTE: { label: "Pendente", cls: "border-[#8a6d1f]/50 bg-[#8a6d1f]/20 text-[#e0b955]" },
    PAGO: { label: "Pago", cls: "border-[#0f6e56]/40 bg-[#0f6e56]/20 text-[#5dcaa5]" },
    ATRASADO: { label: "Atrasado", cls: "border-[#a22d2d]/40 bg-[#a22d2d]/20 text-[#f0a5a5]" },
    CANCELADO: { label: "Cancelado", cls: "border-white/10 bg-white/[0.04] text-mist" },
  };
  const s = map[status];
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${s.cls}`}>{s.label}</span>;
}

function ResumoCard({ icon, label, value, accent }: { icon: ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-fg/[0.08] bg-surface/60 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${accent}22`, color: accent }}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] text-faint">{label}</p>
        <p className="truncate text-[15px] font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}

export default function FinanceiroPage() {
  const alert = useAlert();

  const [aba, setAba] = useState<Aba>("parcelas");
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState<ResumoFinanceiroType | null>(null);
  const [parcelas, setParcelas] = useState<ParcelaType[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoType[]>([]);
  const [pedidosDisponiveis, setPedidosDisponiveis] = useState<PedidoOpcao[]>([]);

  const [showNovaParcela, setShowNovaParcela] = useState(false);
  const [showNovaMovimentacao, setShowNovaMovimentacao] = useState(false);
  const [parcelaParaBaixar, setParcelaParaBaixar] = useState<ParcelaType | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [novaParcela, setNovaParcela] = useState<NovaParcelaType>({ pedidoId: "", numeroParcela: 1, valor: 0, vencimento: "" });
  const [novaMovimentacao, setNovaMovimentacao] = useState<NovaMovimentacaoType>({
    tipo: "ENTRADA",
    categoria: "",
    descricao: "",
    valor: 0,
    dataMovimentacao: "",
  });
  const [formaPagamentoBaixa, setFormaPagamentoBaixa] = useState("Pix");

  const carregar = async () => {
    setLoading(true);
    try {
      const [resResumo, resParcelas, resMovimentacoes, resPedidos] = await Promise.all([
        FinanceiroService.getResumo(),
        FinanceiroService.getParcelas(),
        FinanceiroService.getMovimentacoes(),
        NoteService.getAll(),
      ]);

      setResumo(resResumo.data?.data?.[0] ?? null);
      setParcelas(resParcelas.data?.data ?? []);
      setMovimentacoes(resMovimentacoes.data?.data ?? []);

      const pedidos = (resPedidos.data?.data ?? []).map((p: any) => ({
        pedidoId: p.pedido?.pedidoId,
        nomeCliente: p.nomeCliente,
        totalPedido: p.pedido?.totalPedido ?? 0,
      }));
      setPedidosDisponiveis(pedidos);
    } catch {
      alert.error("Erro ao carregar", "Não foi possível carregar os dados financeiros.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCriarParcela = async () => {
    if (!novaParcela.pedidoId || !novaParcela.vencimento || novaParcela.valor <= 0) {
      alert.warning("Preencha os campos", "Selecione o pedido, o valor e o vencimento da parcela.");
      return;
    }
    setSalvando(true);
    try {
      await FinanceiroService.criarParcela(novaParcela);
      alert.success("Parcela criada!", "A parcela foi registrada com sucesso.");
      setShowNovaParcela(false);
      setNovaParcela({ pedidoId: "", numeroParcela: 1, valor: 0, vencimento: "" });
      await carregar();
    } catch {
      alert.error("Erro ao criar parcela", "Não foi possível registrar a parcela.");
    } finally {
      setSalvando(false);
    }
  };

  const handleBaixarParcela = async () => {
    if (!parcelaParaBaixar) return;
    setSalvando(true);
    try {
      await FinanceiroService.baixarParcela(parcelaParaBaixar.id, formaPagamentoBaixa);
      alert.success("Parcela baixada!", "O pagamento foi registrado.");
      setParcelaParaBaixar(null);
      await carregar();
    } catch {
      alert.error("Erro ao baixar parcela", "Não foi possível registrar o pagamento.");
    } finally {
      setSalvando(false);
    }
  };

  const handleCriarMovimentacao = async () => {
    if (!novaMovimentacao.descricao || !novaMovimentacao.dataMovimentacao || novaMovimentacao.valor <= 0) {
      alert.warning("Preencha os campos", "Descrição, valor e data são obrigatórios.");
      return;
    }
    setSalvando(true);
    try {
      await FinanceiroService.criarMovimentacao(novaMovimentacao);
      alert.success("Movimentação registrada!", "O lançamento foi adicionado ao caixa.");
      setShowNovaMovimentacao(false);
      setNovaMovimentacao({ tipo: "ENTRADA", categoria: "", descricao: "", valor: 0, dataMovimentacao: "" });
      await carregar();
    } catch {
      alert.error("Erro ao registrar", "Não foi possível registrar a movimentação.");
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirMovimentacao = async (id: string) => {
    try {
      await FinanceiroService.excluirMovimentacao(id);
      alert.success("Excluída!", "A movimentação foi removida.");
      await carregar();
    } catch {
      alert.error("Erro ao excluir", "Não foi possível excluir a movimentação.");
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-5 p-5">
      <HeaderPage
        title="Financeiro"
        subtitle="Parcelas de clientes e fluxo de caixa da empresa"
        icon={<Wallet />}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setShowNovaMovimentacao(true)}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-fg/[0.1] bg-fg/[0.03] px-4 py-2.5 text-[13px] font-medium text-ink transition-all hover:bg-fg/[0.06]"
            >
              <Plus className="h-4 w-4" />
              Nova movimentação
            </button>
            <button
              onClick={() => setShowNovaParcela(true)}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-[#7c6ef5] to-[#8b7bf7] px-4 py-2.5 text-[13px] font-medium text-white shadow-[0_8px_24px_-8px_rgba(124,110,245,0.7)] transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Nova parcela
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <ResumoCard icon={<CalendarClock size={18} />} label="A receber" value={brl(resumo?.totalAReceber)} accent="#e0b955" />
        <ResumoCard icon={<CheckCircle2 size={18} />} label="Recebido" value={brl(resumo?.totalRecebido)} accent="#5dcaa5" />
        <ResumoCard icon={<AlertTriangle size={18} />} label="Atrasado" value={brl(resumo?.totalAtrasado)} accent="#f0a5a5" />
        <ResumoCard icon={<TrendingUp size={18} />} label="Entradas (caixa)" value={brl(resumo?.totalEntradas)} accent="#5dcaa5" />
        <ResumoCard icon={<TrendingDown size={18} />} label="Saídas (caixa)" value={brl(resumo?.totalSaidas)} accent="#f0a5a5" />
        <ResumoCard icon={<Wallet size={18} />} label="Saldo em caixa" value={brl(resumo?.saldoCaixa)} accent="#7c6ef5" />
      </div>

      <div className="flex gap-1 border-b border-fg/[0.08]">
        <button
          onClick={() => setAba("parcelas")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${aba === "parcelas" ? "border-b-2 border-accent text-ink" : "text-faint hover:text-mist"}`}
        >
          Parcelas de clientes
        </button>
        <button
          onClick={() => setAba("caixa")}
          className={`px-4 py-2.5 text-sm font-medium transition-colors ${aba === "caixa" ? "border-b-2 border-accent text-ink" : "text-faint hover:text-mist"}`}
        >
          Fluxo de caixa
        </button>
        <button onClick={carregar} className="ml-auto flex items-center gap-1.5 px-3 text-xs text-faint hover:text-mist" title="Atualizar">
          <RotateCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {aba === "parcelas" ? (
        <div className="overflow-hidden rounded-2xl border border-fg/[0.08] bg-surface/60">
          <div className="grid grid-cols-[1fr_110px_110px_110px_130px] border-b border-white/[0.06] px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-faint">
            <span>Cliente / Pedido</span>
            <span className="text-right">Parcela</span>
            <span className="text-right">Valor</span>
            <span className="text-right">Vencimento</span>
            <span className="text-right">Status</span>
          </div>
          {parcelas.length === 0 && !loading && <p className="p-6 text-center text-sm text-faint">Nenhuma parcela cadastrada.</p>}
          {parcelas.map((p) => (
            <div key={p.id} className="grid grid-cols-[1fr_110px_110px_110px_130px] items-center border-b border-white/[0.04] px-5 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{p.cliente_nome}</p>
                <p className="truncate text-xs text-faint">Pedido #{p.codigo_pedido}</p>
              </div>
              <span className="text-right text-mist">{p.numero_parcela}</span>
              <span className="text-right font-medium text-ink">{brl(p.valor)}</span>
              <span className="text-right text-mist">{brDate(p.vencimento)}</span>
              <div className="flex items-center justify-end gap-2">
                <StatusBadge status={p.status} />
                {p.status !== "PAGO" && p.status !== "CANCELADO" && (
                  <button
                    onClick={() => setParcelaParaBaixar(p)}
                    className="rounded-lg bg-fg/[0.05] p-1.5 text-faint transition-colors hover:bg-accent/20 hover:text-accent-soft"
                    title="Baixar pagamento"
                  >
                    <CheckCircle2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-fg/[0.08] bg-surface/60">
          <div className="grid grid-cols-[100px_1fr_120px_110px_50px] border-b border-white/[0.06] px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-faint">
            <span>Tipo</span>
            <span>Descrição</span>
            <span className="text-right">Valor</span>
            <span className="text-right">Data</span>
            <span />
          </div>
          {movimentacoes.length === 0 && !loading && <p className="p-6 text-center text-sm text-faint">Nenhuma movimentação registrada.</p>}
          {movimentacoes.map((m) => (
            <div key={m.id} className="grid grid-cols-[100px_1fr_120px_110px_50px] items-center border-b border-white/[0.04] px-5 py-3 text-sm">
              <span
                className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  m.tipo === "ENTRADA" ? "border-[#0f6e56]/40 bg-[#0f6e56]/20 text-[#5dcaa5]" : "border-[#a22d2d]/40 bg-[#a22d2d]/20 text-[#f0a5a5]"
                }`}
              >
                {m.tipo === "ENTRADA" ? "Entrada" : "Saída"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-ink">{m.descricao}</p>
                {m.categoria && <p className="truncate text-xs text-faint">{m.categoria}</p>}
              </div>
              <span className={`text-right font-medium ${m.tipo === "ENTRADA" ? "text-[#5dcaa5]" : "text-[#f0a5a5]"}`}>{brl(m.valor)}</span>
              <span className="text-right text-mist">{brDate(m.data_movimentacao)}</span>
              <button
                onClick={() => handleExcluirMovimentacao(m.id)}
                className="ml-auto rounded-lg bg-fg/[0.05] p-1.5 text-faint transition-colors hover:bg-[#a22d2d]/20 hover:text-[#f0a5a5]"
                title="Excluir"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal: nova parcela */}
      <Modal open={showNovaParcela} onClose={() => setShowNovaParcela(false)} title="Nova parcela" subtitle="Vincule uma parcela a um pedido existente">
        <div className="flex flex-col gap-3">
          <label className="text-xs text-faint">
            Pedido
            <select
              value={novaParcela.pedidoId}
              onChange={(e) => setNovaParcela({ ...novaParcela, pedidoId: e.target.value })}
              className="mt-1 w-full rounded-lg border border-fg/[0.1] bg-fg/[0.03] px-3 py-2 text-sm text-ink"
            >
              <option value="">Selecione um pedido</option>
              {pedidosDisponiveis.map((p) => (
                <option key={p.pedidoId} value={p.pedidoId}>
                  {p.nomeCliente} — {brl(p.totalPedido)}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-faint">
              Nº da parcela
              <input
                type="number"
                min={1}
                value={novaParcela.numeroParcela}
                onChange={(e) => setNovaParcela({ ...novaParcela, numeroParcela: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-fg/[0.1] bg-fg/[0.03] px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="text-xs text-faint">
              Valor
              <input
                type="number"
                min={0}
                step="0.01"
                value={novaParcela.valor}
                onChange={(e) => setNovaParcela({ ...novaParcela, valor: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-fg/[0.1] bg-fg/[0.03] px-3 py-2 text-sm text-ink"
              />
            </label>
          </div>
          <label className="text-xs text-faint">
            Vencimento
            <input
              type="date"
              value={novaParcela.vencimento}
              onChange={(e) => setNovaParcela({ ...novaParcela, vencimento: e.target.value })}
              className="mt-1 w-full rounded-lg border border-fg/[0.1] bg-fg/[0.03] px-3 py-2 text-sm text-ink"
            />
          </label>
          <button
            disabled={salvando}
            onClick={handleCriarParcela}
            className="mt-2 rounded-xl bg-gradient-to-br from-[#7c6ef5] to-[#8b7bf7] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Criar parcela"}
          </button>
        </div>
      </Modal>

      {/* Modal: nova movimentação de caixa */}
      <Modal open={showNovaMovimentacao} onClose={() => setShowNovaMovimentacao(false)} title="Nova movimentação" subtitle="Registre uma entrada ou saída no caixa">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setNovaMovimentacao({ ...novaMovimentacao, tipo: "ENTRADA" })}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                novaMovimentacao.tipo === "ENTRADA" ? "border-[#0f6e56]/50 bg-[#0f6e56]/20 text-[#5dcaa5]" : "border-fg/[0.1] text-faint"
              }`}
            >
              Entrada
            </button>
            <button
              onClick={() => setNovaMovimentacao({ ...novaMovimentacao, tipo: "SAIDA" })}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                novaMovimentacao.tipo === "SAIDA" ? "border-[#a22d2d]/50 bg-[#a22d2d]/20 text-[#f0a5a5]" : "border-fg/[0.1] text-faint"
              }`}
            >
              Saída
            </button>
          </div>
          <label className="text-xs text-faint">
            Descrição
            <input
              type="text"
              value={novaMovimentacao.descricao}
              onChange={(e) => setNovaMovimentacao({ ...novaMovimentacao, descricao: e.target.value })}
              className="mt-1 w-full rounded-lg border border-fg/[0.1] bg-fg/[0.03] px-3 py-2 text-sm text-ink"
              placeholder="Ex: Aluguel, fornecedor, venda avulsa..."
            />
          </label>
          <label className="text-xs text-faint">
            Categoria (opcional)
            <input
              type="text"
              value={novaMovimentacao.categoria}
              onChange={(e) => setNovaMovimentacao({ ...novaMovimentacao, categoria: e.target.value })}
              className="mt-1 w-full rounded-lg border border-fg/[0.1] bg-fg/[0.03] px-3 py-2 text-sm text-ink"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-faint">
              Valor
              <input
                type="number"
                min={0}
                step="0.01"
                value={novaMovimentacao.valor}
                onChange={(e) => setNovaMovimentacao({ ...novaMovimentacao, valor: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-fg/[0.1] bg-fg/[0.03] px-3 py-2 text-sm text-ink"
              />
            </label>
            <label className="text-xs text-faint">
              Data
              <input
                type="date"
                value={novaMovimentacao.dataMovimentacao}
                onChange={(e) => setNovaMovimentacao({ ...novaMovimentacao, dataMovimentacao: e.target.value })}
                className="mt-1 w-full rounded-lg border border-fg/[0.1] bg-fg/[0.03] px-3 py-2 text-sm text-ink"
              />
            </label>
          </div>
          <button
            disabled={salvando}
            onClick={handleCriarMovimentacao}
            className="mt-2 rounded-xl bg-gradient-to-br from-[#7c6ef5] to-[#8b7bf7] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Registrar movimentação"}
          </button>
        </div>
      </Modal>

      {/* Modal: baixar parcela */}
      <Modal open={!!parcelaParaBaixar} onClose={() => setParcelaParaBaixar(null)} title="Baixar parcela" subtitle={parcelaParaBaixar ? `${parcelaParaBaixar.cliente_nome} — ${brl(parcelaParaBaixar.valor)}` : ""}>
        <div className="flex flex-col gap-3">
          <label className="text-xs text-faint">
            Forma de pagamento
            <select
              value={formaPagamentoBaixa}
              onChange={(e) => setFormaPagamentoBaixa(e.target.value)}
              className="mt-1 w-full rounded-lg border border-fg/[0.1] bg-fg/[0.03] px-3 py-2 text-sm text-ink"
            >
              <option value="Pix">Pix</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Cartão de crédito">Cartão de crédito</option>
              <option value="Cartão de débito">Cartão de débito</option>
              <option value="Boleto">Boleto</option>
            </select>
          </label>
          <button
            disabled={salvando}
            onClick={handleBaixarParcela}
            className="mt-2 rounded-xl bg-gradient-to-br from-[#7c6ef5] to-[#8b7bf7] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {salvando ? "Salvando..." : "Confirmar pagamento"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
