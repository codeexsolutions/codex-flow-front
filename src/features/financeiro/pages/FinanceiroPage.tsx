import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Wallet, TrendingUp, TrendingDown, CalendarClock, CheckCircle2, Trash2, AlertTriangle, RotateCw, Receipt, ArrowLeftRight } from "lucide-react";

import HeaderPage from "@/shared/ui/HeaderPage";
import { PageBody } from "@/shared/ui/PageShell";
import { TabelaCard, TabelaHead, TabelaRow, TabelaVazia, type Coluna } from "@/shared/ui/DataTable";
import { Modal } from "@/shared/ui/Modal";
import { Form, FormSection, FormGrid, FormActions, TextField, SelectBox } from "@/shared/ui/form/FormKit";
import { useAlert } from "@/shared/ui/Alert";
import useFinanceiroStore from "@/features/financeiro/store/financeiro.store";
import type { MovimentacaoType, NovaMovimentacaoType, NovaParcelaType, ParcelaType } from "@/shared/domain/financeiro";
import { formatCurrency as brl } from "@/shared/utils/currency";
import { formatDate } from "@/shared/utils/date";

const brDate = (v?: string | null) => (v ? formatDate(v, "-") : "-");
const money = (v?: number) => brl(v ?? 0);

type Aba = "parcelas" | "caixa";

const STATUS_LOOK: Record<ParcelaType["status"], { label: string; cls: string }> = {
  PENDENTE: { label: "Pendente", cls: "border-warning/40 bg-warning/15 text-warning" },
  PAGO: { label: "Pago", cls: "border-success/40 bg-success/15 text-success" },
  ATRASADO: { label: "Atrasado", cls: "border-danger/40 bg-danger/15 text-danger" },
  CANCELADO: { label: "Cancelado", cls: "border-fg/10 bg-fg/[0.04] text-mist" },
};

const StatusBadge = ({ status }: { status: ParcelaType["status"] }) => {
  const s = STATUS_LOOK[status];
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] ${s.cls}`}>{s.label}</span>;
};

const ResumoCard = ({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: "accent" | "success" | "warning" | "danger" }) => {
  const tones = {
    accent: "bg-accent/[0.15] text-accent-soft ring-accent/20",
    success: "bg-success/15 text-success ring-success/20",
    warning: "bg-warning/15 text-warning ring-warning/20",
    danger: "bg-danger/15 text-danger ring-danger/20",
  } as const;

  return (
    <div className="card-interactive glass-sheen flex items-center gap-3 p-3.5">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${tones[tone]}`}>{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-[11px] text-faint">{label}</p>
        <p className="nums truncate text-[15px] text-ink">{value}</p>
      </div>
    </div>
  );
};

const COLS_PARCELAS = "grid-cols-[1fr_90px_120px_120px_170px]";
const COLS_CAIXA = "grid-cols-[110px_1fr_130px_120px_60px]";

export default function FinanceiroPage() {
  const alert = useAlert();

  const resumo = useFinanceiroStore((s) => s.resumo);
  const parcelas = useFinanceiroStore((s) => s.parcelas);
  const movimentacoes = useFinanceiroStore((s) => s.movimentacoes);
  const pedidosDisponiveis = useFinanceiroStore((s) => s.pedidosDisponiveis);
  const loading = useFinanceiroStore((s) => s.loading);
  const error = useFinanceiroStore((s) => s.error);
  const fetchFinanceiro = useFinanceiroStore((s) => s.fetchFinanceiro);
  const criarParcelaStore = useFinanceiroStore((s) => s.criarParcela);
  const baixarParcelaStore = useFinanceiroStore((s) => s.baixarParcela);
  const criarMovimentacaoStore = useFinanceiroStore((s) => s.criarMovimentacao);
  const excluirMovimentacaoStore = useFinanceiroStore((s) => s.excluirMovimentacao);

  const [aba, setAba] = useState<Aba>("parcelas");
  const [showNovaParcela, setShowNovaParcela] = useState(false);
  const [showNovaMovimentacao, setShowNovaMovimentacao] = useState(false);
  const [parcelaParaBaixar, setParcelaParaBaixar] = useState<ParcelaType | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [novaParcela, setNovaParcela] = useState<NovaParcelaType>({ pedidoId: "", numeroParcela: 1, valor: 0, vencimento: "" });
  const [novaMovimentacao, setNovaMovimentacao] = useState<NovaMovimentacaoType>({ tipo: "ENTRADA", categoria: "", descricao: "", valor: 0, dataMovimentacao: "" });
  const [formaPagamentoBaixa, setFormaPagamentoBaixa] = useState("Pix");

  useEffect(() => {
    fetchFinanceiro();
  }, [fetchFinanceiro]);

  const carregar = () => fetchFinanceiro(true);

  const handleCriarParcela = async () => {
    if (!novaParcela.pedidoId || !novaParcela.vencimento || novaParcela.valor <= 0) {
      alert.warning("Preencha os campos", "Selecione o pedido, o valor e o vencimento da parcela.");
      return;
    }
    setSalvando(true);
    try {
      await criarParcelaStore(novaParcela);
      alert.success("Parcela criada!", "A parcela foi registrada com sucesso.");
      setShowNovaParcela(false);
      setNovaParcela({ pedidoId: "", numeroParcela: 1, valor: 0, vencimento: "" });
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
      await baixarParcelaStore(parcelaParaBaixar.id, formaPagamentoBaixa);
      alert.success("Parcela baixada!", "O pagamento foi registrado.");
      setParcelaParaBaixar(null);
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
      await criarMovimentacaoStore(novaMovimentacao);
      alert.success("Movimentação registrada!", "O lançamento foi adicionado ao caixa.");
      setShowNovaMovimentacao(false);
      setNovaMovimentacao({ tipo: "ENTRADA", categoria: "", descricao: "", valor: 0, dataMovimentacao: "" });
    } catch {
      alert.error("Erro ao registrar", "Não foi possível registrar a movimentação.");
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirMovimentacao = async (id: string) => {
    try {
      await excluirMovimentacaoStore(id);
      alert.success("Excluída!", "A movimentação foi removida.");
    } catch {
      alert.error("Erro ao excluir", "Não foi possível excluir a movimentação.");
    }
  };

  const colParcelas: Coluna<ParcelaType>[] = [
    {
      id: "cliente",
      header: "Cliente / Pedido",
      cell: (p) => (
        <span className="block min-w-0">
          <span className="block truncate text-ink">{p.cliente_nome}</span>
          <span className="block truncate text-[11px] text-faint">Pedido #{p.codigo_pedido}</span>
        </span>
      ),
    },
    { id: "parcela", header: "Parcela", align: "right", cell: (p) => <span className="nums text-mist">{p.numero_parcela}</span> },
    { id: "valor", header: "Valor", align: "right", cell: (p) => <span className="nums text-ink">{brl(p.valor)}</span> },
    { id: "venc", header: "Vencimento", align: "right", cell: (p) => <span className="nums text-mist">{brDate(p.vencimento)}</span> },
    {
      id: "status",
      header: "Status",
      align: "right",
      cell: (p) => (
        <span className="flex items-center justify-end gap-2">
          <StatusBadge status={p.status} />
          {p.status !== "PAGO" && p.status !== "CANCELADO" && (
            <button onClick={() => setParcelaParaBaixar(p)} className="focus-ring shrink-0 rounded-lg bg-fg/[0.05] p-1.5 text-faint transition-colors hover:bg-accent/20 hover:text-accent-soft" title="Baixar pagamento">
              <CheckCircle2 size={15} />
            </button>
          )}
        </span>
      ),
    },
  ];

  const colCaixa: Coluna<MovimentacaoType>[] = [
    {
      id: "tipo",
      header: "Tipo",
      cell: (m) => <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[11px] ${m.tipo === "ENTRADA" ? "border-success/40 bg-success/15 text-success" : "border-danger/40 bg-danger/15 text-danger"}`}>{m.tipo === "ENTRADA" ? "Entrada" : "Saída"}</span>,
    },
    {
      id: "desc",
      header: "Descrição",
      cell: (m) => (
        <span className="block min-w-0">
          <span className="block truncate text-ink">{m.descricao}</span>
          {m.categoria && <span className="block truncate text-[11px] text-faint">{m.categoria}</span>}
        </span>
      ),
    },
    { id: "valor", header: "Valor", align: "right", cell: (m) => <span className={`nums ${m.tipo === "ENTRADA" ? "text-success" : "text-danger"}`}>{brl(m.valor)}</span> },
    { id: "data", header: "Data", align: "right", cell: (m) => <span className="nums text-mist">{brDate(m.data_movimentacao)}</span> },
    {
      id: "acoes",
      header: "",
      align: "right",
      cell: (m) => (
        <button onClick={() => handleExcluirMovimentacao(m.id)} className="focus-ring rounded-lg bg-fg/[0.05] p-1.5 text-faint transition-colors hover:bg-danger/20 hover:text-danger" title="Excluir">
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  const abas: { id: Aba; label: string; icon: ReactNode }[] = [
    { id: "parcelas", label: "Parcelas", icon: <Receipt size={14} /> },
    { id: "caixa", label: "Fluxo de caixa", icon: <ArrowLeftRight size={14} /> },
  ];

  const filtros = (
    <div className="flex items-center gap-2">
      <div className="glass-subtle flex items-center gap-1 rounded-lg p-1">
        {abas.map((a) => (
          <button key={a.id} onClick={() => setAba(a.id)} className={`focus-ring flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] transition-all ${aba === a.id ? "bg-accent text-white shadow-glow" : "text-mist hover:text-ink"}`}>
            {a.icon}
            {a.label}
          </button>
        ))}
      </div>
      <button onClick={carregar} title="Atualizar" className="focus-ring glass-subtle rounded-lg p-2 text-faint transition-colors hover:text-ink">
        <RotateCw size={14} className={loading ? "animate-spin" : ""} />
      </button>
    </div>
  );

  return (
    <div className="aurora relative flex h-full w-full flex-col overflow-hidden text-ink">
      <HeaderPage icon={<Wallet className="h-5 w-5" />} title="Financeiro" subtitle="Parcelas de clientes e fluxo de caixa da empresa" />

      <PageBody>
        {error && (
          <div className="flex shrink-0 items-center justify-between gap-2.5 rounded-lg border border-danger/40 bg-danger/15 px-4 py-2.5 text-[13px] text-danger">
            <span className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </span>
            <button onClick={carregar} className="focus-ring flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-danger/30 px-2.5 py-1 text-[12px] text-danger transition-colors hover:bg-danger/10">
              <RotateCw className="h-3.5 w-3.5" /> Tentar novamente
            </button>
          </div>
        )}

        <div className="stagger grid shrink-0 grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <ResumoCard icon={<CalendarClock size={17} />} label="A receber" value={money(resumo?.totalAReceber)} tone="warning" />
          <ResumoCard icon={<CheckCircle2 size={17} />} label="Recebido" value={money(resumo?.totalRecebido)} tone="success" />
          <ResumoCard icon={<AlertTriangle size={17} />} label="Atrasado" value={money(resumo?.totalAtrasado)} tone="danger" />
          <ResumoCard icon={<TrendingUp size={17} />} label="Entradas" value={money(resumo?.totalEntradas)} tone="success" />
          <ResumoCard icon={<TrendingDown size={17} />} label="Saídas" value={money(resumo?.totalSaidas)} tone="danger" />
          <ResumoCard icon={<Wallet size={17} />} label="Saldo em caixa" value={money(resumo?.saldoCaixa)} tone="accent" />
        </div>

        {aba === "parcelas" ? (
          <TabelaCard title="Parcelas de clientes" icon={<Receipt size={15} />} count={parcelas.length} countLabel={parcelas.length === 1 ? "parcela" : "parcelas"} onAdd={() => setShowNovaParcela(true)} addLabel="Nova parcela" filters={filtros}>
            <TabelaHead colunas={colParcelas} cols={COLS_PARCELAS} />
            {parcelas.length === 0 ? (
              <TabelaVazia icon={<Receipt size={20} />} title={loading ? "Carregando…" : "Nenhuma parcela cadastrada"} description="Crie uma parcela vinculada a um pedido para acompanhar o recebimento." />
            ) : (
              parcelas.map((p) => <TabelaRow key={p.id} colunas={colParcelas} cols={COLS_PARCELAS} row={p} />)
            )}
          </TabelaCard>
        ) : (
          <TabelaCard title="Fluxo de caixa" icon={<ArrowLeftRight size={15} />} count={movimentacoes.length} countLabel={movimentacoes.length === 1 ? "lançamento" : "lançamentos"} onAdd={() => setShowNovaMovimentacao(true)} addLabel="Nova movimentação" filters={filtros}>
            <TabelaHead colunas={colCaixa} cols={COLS_CAIXA} />
            {movimentacoes.length === 0 ? (
              <TabelaVazia icon={<ArrowLeftRight size={20} />} title={loading ? "Carregando…" : "Nenhuma movimentação registrada"} description="Lance entradas e saídas para acompanhar o caixa da empresa." />
            ) : (
              movimentacoes.map((m) => <TabelaRow key={m.id} colunas={colCaixa} cols={COLS_CAIXA} row={m} />)
            )}
          </TabelaCard>
        )}

        {/* Modal: nova parcela */}
        <Modal open={showNovaParcela} onClose={() => setShowNovaParcela(false)} title="Nova parcela" subtitle="Vincule uma parcela a um pedido existente">
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              handleCriarParcela();
            }}
          >
            <FormSection title="Parcela" icon={<Receipt size={14} />}>
              <SelectBox label="Pedido" value={novaParcela.pedidoId} onChange={(e) => setNovaParcela({ ...novaParcela, pedidoId: e.target.value })}>
                <option value="">Selecione um pedido</option>
                {pedidosDisponiveis.map((p) => (
                  <option key={p.pedidoId} value={p.pedidoId}>
                    {p.nomeCliente} — {brl(p.totalPedido)}
                  </option>
                ))}
              </SelectBox>

              <FormGrid cols={2}>
                <TextField label="Nº da parcela" type="number" min={1} value={novaParcela.numeroParcela} onChange={(e) => setNovaParcela({ ...novaParcela, numeroParcela: Number(e.target.value) })} />
                <TextField label="Valor" type="number" min={0} step="0.01" value={novaParcela.valor} onChange={(e) => setNovaParcela({ ...novaParcela, valor: Number(e.target.value) })} />
              </FormGrid>

              <TextField label="Vencimento" type="date" value={novaParcela.vencimento} onChange={(e) => setNovaParcela({ ...novaParcela, vencimento: e.target.value })} />
            </FormSection>

            <FormActions onCancel={() => setShowNovaParcela(false)} saving={salvando} submitText="Criar" />
          </Form>
        </Modal>

        {/* Modal: nova movimentação de caixa */}
        <Modal open={showNovaMovimentacao} onClose={() => setShowNovaMovimentacao(false)} title="Nova movimentação" subtitle="Registre uma entrada ou saída no caixa">
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              handleCriarMovimentacao();
            }}
          >
            <FormSection title="Lançamento" icon={<ArrowLeftRight size={14} />}>
              <div className="flex gap-2">
                {(["ENTRADA", "SAIDA"] as const).map((t) => {
                  const ativo = novaMovimentacao.tipo === t;
                  const cor = t === "ENTRADA" ? "border-success/50 bg-success/15 text-success" : "border-danger/50 bg-danger/15 text-danger";
                  return (
                    <button key={t} type="button" onClick={() => setNovaMovimentacao({ ...novaMovimentacao, tipo: t })} className={`focus-ring flex-1 cursor-pointer rounded-lg border px-3 py-2 text-sm transition-colors ${ativo ? cor : "border-fg/[0.1] text-faint hover:text-mist"}`}>
                      {t === "ENTRADA" ? "Entrada" : "Saída"}
                    </button>
                  );
                })}
              </div>

              <TextField label="Descrição" value={novaMovimentacao.descricao} onChange={(e) => setNovaMovimentacao({ ...novaMovimentacao, descricao: e.target.value })} placeholder="Ex: Aluguel, fornecedor, venda avulsa…" />
              <TextField label="Categoria (opcional)" value={novaMovimentacao.categoria ?? ""} onChange={(e) => setNovaMovimentacao({ ...novaMovimentacao, categoria: e.target.value })} />

              <FormGrid cols={2}>
                <TextField label="Valor" type="number" min={0} step="0.01" value={novaMovimentacao.valor} onChange={(e) => setNovaMovimentacao({ ...novaMovimentacao, valor: Number(e.target.value) })} />
                <TextField label="Data" type="date" value={novaMovimentacao.dataMovimentacao} onChange={(e) => setNovaMovimentacao({ ...novaMovimentacao, dataMovimentacao: e.target.value })} />
              </FormGrid>
            </FormSection>

            <FormActions onCancel={() => setShowNovaMovimentacao(false)} saving={salvando} submitText="Registrar" />
          </Form>
        </Modal>

        {/* Modal: baixar parcela */}
        <Modal open={!!parcelaParaBaixar} onClose={() => setParcelaParaBaixar(null)} title="Baixar parcela" subtitle={parcelaParaBaixar ? `${parcelaParaBaixar.cliente_nome} — ${brl(parcelaParaBaixar.valor)}` : ""}>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              handleBaixarParcela();
            }}
          >
            <SelectBox label="Forma de pagamento" value={formaPagamentoBaixa} onChange={(e) => setFormaPagamentoBaixa(e.target.value)}>
              <option value="Pix">Pix</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Cartão de crédito">Cartão de crédito</option>
              <option value="Cartão de débito">Cartão de débito</option>
              <option value="Boleto">Boleto</option>
            </SelectBox>

            <FormActions onCancel={() => setParcelaParaBaixar(null)} saving={salvando} submitText="Confirmar" />
          </Form>
        </Modal>
      </PageBody>
    </div>
  );
}
