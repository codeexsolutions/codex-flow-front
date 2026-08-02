import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Wallet, TrendingUp, TrendingDown, CalendarClock, CheckCircle2, Trash2, AlertTriangle, RotateCw, Receipt, ArrowLeftRight } from "lucide-react";

import HeaderPage from "@/shared/ui/HeaderPage";
import { PageBody } from "@/shared/ui/PageShell";
import { TabelaCard, TabelaHead, TabelaRow, TabelaVazia, type Coluna } from "@/shared/ui/DataTable";
import { Modal } from "@/shared/ui/Modal";
import { Form, FormSection, FormGrid, FormActions, TextField, SelectBox } from "@/shared/ui/form/FormKit";
import { useAlert } from "@/shared/ui/Alert";
import { extractErrorMessage, getErrorTitle } from "@/shared/utils/errorHandler";
import useFinanceiroStore from "@/features/financeiro/store/financeiro.store";
import type { MovimentacaoType, NotaFinanceiroType, NovaMovimentacaoType } from "@/shared/domain/financeiro";
import { formatCurrency as brl } from "@/shared/utils/currency";
import { formatDate } from "@/shared/utils/date";

const brDate = (v?: string | null) => (v ? formatDate(v, "-") : "-");
const money = (v?: number) => brl(v ?? 0);

type Aba = "notas" | "caixa";

const STATUS_LOOK: Record<NotaFinanceiroType["status_pagamento"], { label: string; cls: string }> = {
  PENDENTE: { label: "Pendente", cls: "border-warning/40 bg-warning/15 text-warning" },
  PAGO: { label: "Pago", cls: "border-success/40 bg-success/15 text-success" },
};

const StatusBadge = ({ status }: { status: NotaFinanceiroType["status_pagamento"] }) => {
  const s = STATUS_LOOK[status] ?? { label: status ?? "-", cls: "border-fg/10 bg-fg/[0.04] text-mist" };
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

/**
 * A coluna flexível é capada e sobra um vão no fim: com "1fr" solto, os
 * valores e o status iam parar na borda direita do monitor, longe do nome a
 * que pertencem. Assim os dados ficam agrupados à esquerda.
 */
const COLS_NOTAS = "grid-cols-[minmax(180px,420px)_120px_120px_170px_minmax(0,1fr)]";
const COLS_CAIXA = "grid-cols-[110px_minmax(180px,420px)_130px_120px_60px_minmax(0,1fr)]";

/** Célula vazia que ocupa o vão flexível do fim da linha. */
const COLUNA_VAO = { id: "vao", header: "", cell: () => null };

export default function FinanceiroPage() {
  const alert = useAlert();

  const resumo = useFinanceiroStore((s) => s.resumo);
  const notas = useFinanceiroStore((s) => s.notas);
  const movimentacoes = useFinanceiroStore((s) => s.movimentacoes);
  const loading = useFinanceiroStore((s) => s.loading);
  const error = useFinanceiroStore((s) => s.error);
  const fetchFinanceiro = useFinanceiroStore((s) => s.fetchFinanceiro);
  const registrarPagamentoNotaStore = useFinanceiroStore((s) => s.registrarPagamentoNota);
  const criarMovimentacaoStore = useFinanceiroStore((s) => s.criarMovimentacao);
  const excluirMovimentacaoStore = useFinanceiroStore((s) => s.excluirMovimentacao);

  const [aba, setAba] = useState<Aba>("notas");
  const [showNovaMovimentacao, setShowNovaMovimentacao] = useState(false);
  const [notaParaPagar, setNotaParaPagar] = useState<NotaFinanceiroType | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [novaMovimentacao, setNovaMovimentacao] = useState<NovaMovimentacaoType>({ tipo: "ENTRADA", categoria: "", descricao: "", valor: 0, dataMovimentacao: "" });
  const [formaPagamentoBaixa, setFormaPagamentoBaixa] = useState("Pix");

  useEffect(() => {
    fetchFinanceiro();
  }, [fetchFinanceiro]);

  const carregar = () => fetchFinanceiro(true);

  const handleRegistrarPagamentoNota = async () => {
    if (!notaParaPagar) return;
    const valorRestante = Number(notaParaPagar.total) - Number(notaParaPagar.valor_pago ?? 0);
    setSalvando(true);
    try {
      await registrarPagamentoNotaStore(notaParaPagar.pedido_id, valorRestante, formaPagamentoBaixa);
      alert.success("Nota paga!", "O pagamento foi registrado.");
      setNotaParaPagar(null);
    } catch (err) {

      alert.error(getErrorTitle(err), extractErrorMessage(err, "Não foi possível registrar o pagamento."));
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
    } catch (err) {

      alert.error(getErrorTitle(err), extractErrorMessage(err, "Não foi possível registrar a movimentação."));
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirMovimentacao = async (id: string) => {
    try {
      await excluirMovimentacaoStore(id);
      alert.success("Excluída!", "A movimentação foi removida.");
    } catch (err) {

      alert.error(getErrorTitle(err), extractErrorMessage(err, "Não foi possível excluir a movimentação."));
    }
  };

  const colNotas: Coluna<NotaFinanceiroType>[] = [
    {
      id: "cliente",
      header: "Cliente / Pedido",
      cell: (n) => (
        <span className="block min-w-0">
          <span className="block truncate text-ink">{n.cliente_nome}</span>
          <span className="block truncate text-[11px] text-faint">
            Pedido #{n.codigo_pedido}
            {n.status_pagamento === "PAGO" && n.forma_pagamento ? ` · ${n.forma_pagamento}` : ""}
            {n.status_pagamento === "PENDENTE" && Number(n.valor_pago) > 0 ? ` · pago ${brl(n.valor_pago)} de ${brl(n.total)}` : ""}
          </span>
        </span>
      ),
    },
    { id: "total", header: "Total", align: "right", cell: (n) => <span className="nums text-ink">{brl(n.total)}</span> },
    { id: "data", header: "Data", align: "right", cell: (n) => <span className="nums text-mist">{brDate(n.data_pedido)}</span> },
    {
      id: "status",
      header: "Status",
      align: "right",
      cell: (n) => (
        <span className="flex items-center justify-end gap-2">
          <StatusBadge status={n.status_pagamento} />
          {n.status_pagamento !== "PAGO" && (
            <button onClick={() => setNotaParaPagar(n)} className="focus-ring shrink-0 rounded-lg bg-fg/[0.05] p-1.5 text-faint transition-colors hover:bg-accent/20 hover:text-accent-soft" title="Registrar pagamento">
              <CheckCircle2 size={15} />
            </button>
          )}
        </span>
      ),
    },
    COLUNA_VAO,
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
    COLUNA_VAO,
  ];

  const abas: { id: Aba; label: string; icon: ReactNode }[] = [
    { id: "notas", label: "Notas", icon: <Receipt size={14} /> },
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
      <HeaderPage icon={<Wallet className="h-5 w-5" />} title="Financeiro" subtitle="Notas de clientes e fluxo de caixa da empresa" />

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

        {!!resumo?.recebidoPorFormaPagamento?.length && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="text-[11px] text-faint">Recebido por forma de pagamento:</span>
            {resumo.recebidoPorFormaPagamento.map((f) => (
              <span key={f.formaPagamento} className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] text-success">
                {f.formaPagamento}
                <span className="nums text-ink">{money(f.valor)}</span>
              </span>
            ))}
          </div>
        )}

        {aba === "notas" ? (
          <TabelaCard title="Notas de clientes" icon={<Receipt size={15} />} count={notas.length} countLabel={notas.length === 1 ? "nota" : "notas"} filters={filtros}>
            <TabelaHead colunas={colNotas} cols={COLS_NOTAS} />
            {notas.length === 0 ? (
              <TabelaVazia icon={<Receipt size={20} />} title={loading ? "Carregando…" : "Nenhuma nota registrada"} description="As notas emitidas no Ponto de Venda aparecem aqui para você acompanhar o recebimento." />
            ) : (
              notas.map((n) => <TabelaRow key={n.pedido_id} colunas={colNotas} cols={COLS_NOTAS} row={n} />)
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

        {/* Modal: registrar pagamento da nota */}
        <Modal open={!!notaParaPagar} onClose={() => setNotaParaPagar(null)} title="Registrar pagamento" subtitle={notaParaPagar ? `${notaParaPagar.cliente_nome} — restam ${brl(Number(notaParaPagar.total) - Number(notaParaPagar.valor_pago ?? 0))}` : ""}>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              handleRegistrarPagamentoNota();
            }}
          >
            <SelectBox label="Forma de pagamento" value={formaPagamentoBaixa} onChange={(e) => setFormaPagamentoBaixa(e.target.value)}>
              <option value="Pix">Pix</option>
              <option value="Dinheiro">Dinheiro</option>
              <option value="Cartão de crédito">Cartão de crédito</option>
              <option value="Cartão de débito">Cartão de débito</option>
              <option value="Boleto">Boleto</option>
            </SelectBox>

            <FormActions onCancel={() => setNotaParaPagar(null)} saving={salvando} submitText="Confirmar" />
          </Form>
        </Modal>
      </PageBody>
    </div>
  );
}
