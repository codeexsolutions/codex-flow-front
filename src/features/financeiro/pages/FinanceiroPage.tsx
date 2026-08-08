import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Wallet, TrendingUp, TrendingDown, Trash2, AlertTriangle, RotateCw, Receipt,
  ArrowLeftRight, Plus, CreditCard, Banknote,
} from "lucide-react";

import { TabelaCard, TabelaHead, TabelaRow, TabelaVazia, type Coluna } from "@/shared/ui/DataTable";
import BotaoRecibo from "@/shared/ui/BotaoRecibo";
import { Modal } from "@/shared/ui/Modal";
import { Form, FormSection, FormGrid, FormActions, TextField } from "@/shared/ui/form/FormKit";
import { useAlert } from "@/shared/ui/Alert";
import { extractErrorMessage, getErrorTitle } from "@/shared/utils/errorHandler";
import useFinanceiroStore from "@/features/financeiro/store/financeiro.store";
import type { MovimentacaoType, NotaFinanceiroType, NovaMovimentacaoType } from "@/shared/domain/financeiro";
import { formatCurrency as brl, money } from "@/shared/utils/currency";
import { brDate } from "@/shared/utils/date";
import { useIsMobile } from "@/shared/hooks/useIsMobile";
import FinanceiroMobile from "@/features/financeiro/components/FinanceiroMobile";
import { Rosca } from "@/shared/ui/Rosca";
import FiltroPeriodo, { dentroDoPeriodo, periodoPadrao, rotuloPeriodo, type Periodo } from "@/features/financeiro/components/FiltroPeriodo";

/**
 * Financeiro — o dinheiro que entrou e saiu, num período.
 *
 * O que esta tela NÃO faz: cobrar. A lista de "a receber" saiu daqui e mora no
 * fluxo de vendas, onde a nota é aberta e o recebimento é lançado. Misturar as
 * duas coisas fazia o financeiro responder duas perguntas de donos diferentes
 * ("quanto tenho?" e "quem me deve?") na mesma tela, e nenhuma bem.
 *
 * O que ela faz: mostra tudo que foi pago — por venda ou lançado no caixa — no
 * período que a pessoa escolher, e por qual forma de pagamento.
 */


/** Célula vazia que ocupa o vão flexível do fim da linha. */
const COLUNA_VAO = { id: "vao", header: "", cell: () => null };

/**
 * A coluna flexível é capada e sobra um vão no fim: com "1fr" solto, os
 * valores iam parar na borda direita do monitor, longe do nome a que
 * pertencem. Assim os dados ficam agrupados à esquerda.
 */
const COLS_CAIXA = "grid-cols-[110px_minmax(180px,420px)_130px_120px_60px_minmax(0,1fr)]";
const COLS_RECEBIDO = "grid-cols-[minmax(160px,360px)_120px_140px_130px_minmax(0,1fr)]";

const ResumoCard = ({ icon, label, value, hint, tone }: { icon: ReactNode; label: string; value: string; hint?: string; tone: "accent" | "success" | "warning" | "danger" }) => {
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
        {hint && <p className="truncate text-[10.5px] text-faint">{hint}</p>}
      </div>
    </div>
  );
};

export default function FinanceiroPage() {
  const alert = useAlert();
  const mobile = useIsMobile();

  const resumo = useFinanceiroStore((s) => s.resumo);
  const notas = useFinanceiroStore((s) => s.notas);
  const movimentacoes = useFinanceiroStore((s) => s.movimentacoes);
  const loading = useFinanceiroStore((s) => s.loading);
  const error = useFinanceiroStore((s) => s.error);
  const fetchFinanceiro = useFinanceiroStore((s) => s.fetchFinanceiro);
  const criarMovimentacaoStore = useFinanceiroStore((s) => s.criarMovimentacao);
  const excluirMovimentacaoStore = useFinanceiroStore((s) => s.excluirMovimentacao);

  const [periodo, setPeriodo] = useState<Periodo>(periodoPadrao);
  const [showNovaMovimentacao, setShowNovaMovimentacao] = useState(false);
  const [abaMobile, setAbaMobile] = useState<"notas" | "caixa">("notas");
  const [salvando, setSalvando] = useState(false);
  const [detalhe, setDetalhe] = useState<NotaFinanceiroType | null>(null);

  const [novaMovimentacao, setNovaMovimentacao] = useState<NovaMovimentacaoType>({
    tipo: "ENTRADA",
    categoria: "",
    descricao: "",
    valor: 0,
    dataMovimentacao: "",
  });

  useEffect(() => {
    fetchFinanceiro();
  }, [fetchFinanceiro]);

  const carregar = () => fetchFinanceiro(true);

  /* ---------------- Recorte do período ---------------- */

  /**
   * Só o que foi PAGO conta como recebimento.
   *
   * A data que vale é a do pagamento, não a da venda: uma nota de janeiro
   * quitada em março é dinheiro de março para quem fecha o caixa.
   */
  const recebimentos = useMemo(
    () => notas.filter((n) => Number(n.valor_pago ?? 0) > 0 && dentroDoPeriodo(n.data_pagamento ?? n.data_pedido, periodo)),
    [notas, periodo],
  );

  const movimentacoesDoPeriodo = useMemo(
    () => movimentacoes.filter((m) => dentroDoPeriodo(m.data_movimentacao, periodo)),
    [movimentacoes, periodo],
  );

  /** Todas as datas que existem — alimentam as listas de mês e ano do filtro. */
  const datasConhecidas = useMemo(
    () => [
      ...notas.map((n) => n.data_pagamento ?? n.data_pedido),
      ...movimentacoes.map((m) => m.data_movimentacao),
    ].filter(Boolean) as string[],
    [notas, movimentacoes],
  );

  const totais = useMemo(() => {
    const recebidoVendas = recebimentos.reduce((acc, n) => acc + Number(n.valor_pago ?? 0), 0);
    const entradas = movimentacoesDoPeriodo.filter((m) => m.tipo === "ENTRADA").reduce((acc, m) => acc + Number(m.valor), 0);
    const saidas = movimentacoesDoPeriodo.filter((m) => m.tipo === "SAIDA").reduce((acc, m) => acc + Number(m.valor), 0);

    return { recebidoVendas, entradas, saidas, saldo: recebidoVendas + entradas - saidas };
  }, [recebimentos, movimentacoesDoPeriodo]);

  /**
   * Formas de pagamento no período.
   *
   * Junta o que veio de venda com o que foi lançado como entrada no caixa —
   * é a resposta a "como o dinheiro entrou", e o caixa também é dinheiro que
   * entrou. Lançamento sem forma vira "Não informado" em vez de sumir da
   * conta e fazer a soma não bater com o total.
   */
  const formas = useMemo(() => {
    const mapa = new Map<string, number>();

    for (const n of recebimentos) {
      const f = n.forma_pagamento?.trim() || "Não informado";
      mapa.set(f, (mapa.get(f) ?? 0) + Number(n.valor_pago ?? 0));
    }

    for (const m of movimentacoesDoPeriodo) {
      if (m.tipo !== "ENTRADA") continue;
      const f = m.categoria?.trim() || "Caixa";
      mapa.set(f, (mapa.get(f) ?? 0) + Number(m.valor));
    }

    return [...mapa.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
  }, [recebimentos, movimentacoesDoPeriodo]);

  const rotulo = rotuloPeriodo(periodo);

  /* ---------------- Ações ---------------- */

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

  /* ---------------- Colunas ---------------- */

  const colRecebido: Coluna<NotaFinanceiroType>[] = [
    {
      id: "cliente",
      header: "Cliente",
      cell: (n) => (
        <span className="block min-w-0">
          <span className="block truncate text-ink">{n.cliente_nome}</span>
          <span className="block truncate text-[11px] text-faint">Nota #{n.codigo_pedido}</span>
        </span>
      ),
    },
    {
      id: "forma",
      header: "Forma",
      cell: (n) => (
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-fg/[0.1] px-2.5 py-0.5 text-[11px] text-mist">
          <CreditCard size={11} className="text-muted" />
          {n.forma_pagamento?.trim() || "Não informado"}
        </span>
      ),
    },
    { id: "valor", header: "Recebido", align: "right", cell: (n) => <span className="nums text-success">{money(Number(n.valor_pago ?? 0))}</span> },
    { id: "data", header: "Pago em", align: "right", cell: (n) => <span className="nums text-mist">{brDate(n.data_pagamento ?? n.data_pedido)}</span> },
    COLUNA_VAO,
  ];

  const colCaixa: Coluna<MovimentacaoType>[] = [
    {
      id: "tipo",
      header: "Tipo",
      cell: (m) => (
        <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 text-[11px] ${m.tipo === "ENTRADA" ? "border-success/40 bg-success/15 text-success" : "border-danger/40 bg-danger/15 text-danger"}`}>
          {m.tipo === "ENTRADA" ? "Entrada" : "Saída"}
        </span>
      ),
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

  /* ---------------- Modais ---------------- */

  const modais = (
    <>
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

      {/* Detalhe do recebimento — consulta, não edição. Quem precisa mexer no
          valor faz isso na nota, onde o histórico do pedido está junto. */}
      <Modal open={!!detalhe} onClose={() => setDetalhe(null)} title="Recebimento" subtitle={detalhe ? `${detalhe.cliente_nome} · nota #${detalhe.codigo_pedido}` : ""} maxWidth="max-w-sm">
        {detalhe && (
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-fg/[0.06]">
            {(
              [
                ["Total da nota", money(Number(detalhe.total ?? 0))],
                ["Recebido", money(Number(detalhe.valor_pago ?? 0))],
                ["Forma", detalhe.forma_pagamento?.trim() || "Não informado"],
                ["Pago em", brDate(detalhe.data_pagamento)],
                ["Venda em", brDate(detalhe.data_pedido)],
                ["Situação", Number(detalhe.valor_pago ?? 0) >= Number(detalhe.total ?? 0) ? "Quitada" : "Parcial"],
              ] as [string, string][]
            ).map(([rot, val]) => (
              <div key={rot} className="min-w-0 bg-surface px-3.5 py-3">
                <dt className="text-[10px] uppercase tracking-[0.1em] text-faint">{rot}</dt>
                <dd className="nums mt-1 truncate text-[13px] text-ink">{val}</dd>
              </div>
            ))}
          </dl>
        )}

        {/* Recibo: só de nota quitada.
            Um comprovante de quitação para pagamento parcial afirmaria o que
            não aconteceu — e é o cliente que leva esse papel para a
            contabilidade dele. */}
        {detalhe && Number(detalhe.valor_pago ?? 0) >= Number(detalhe.total ?? 0) && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-fg/[0.06] pt-4">
            <p className="text-[12px] leading-relaxed text-mist">Comprovante de pagamento para o cliente.</p>

            <BotaoRecibo
              dados={{
                numero: String(detalhe.codigo_pedido),
                clienteNome: detalhe.cliente_nome,
                valor: Number(detalhe.valor_pago ?? 0),
                formaPagamento: detalhe.forma_pagamento,
                pagoEm: detalhe.data_pagamento ?? detalhe.data_pedido,
              }}
            />
          </div>
        )}
      </Modal>
    </>
  );

  /* ---------------- Estados de carga ---------------- */

  if (error) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center">
        <AlertTriangle className="h-8 w-8 text-danger" />
        <p className="max-w-md text-sm text-mist">{error}</p>
        <button onClick={carregar} className="focus-ring flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm text-white transition hover:brightness-110">
          <RotateCw size={14} /> Tentar de novo
        </button>
      </div>
    );
  }

  if (mobile) {
    return (
      <>
        {/* O celular recebe o mesmo recorte de período do desktop. As abas
            continuam sendo dele: "Notas" no celular agora lista recebimentos,
            não pendências — o mesmo assunto da coluna do desktop. */}
        <FinanceiroMobile
          aba={abaMobile}
          onAba={setAbaMobile}
          saldoCaixa={totais.saldo}
          aReceber={totais.recebidoVendas}
          entradas={totais.entradas + totais.recebidoVendas}
          saidas={totais.saidas}
          notas={recebimentos.map((n) => ({
            id: String(n.pedido_id),
            cliente: n.cliente_nome,
            pedido: n.codigo_pedido,
            total: Number(n.total ?? 0),
            pago: Number(n.valor_pago ?? 0),
            data: n.data_pagamento ?? n.data_pedido,
            quitada: Number(n.valor_pago ?? 0) >= Number(n.total ?? 0),
            formaPagamento: n.forma_pagamento,
          }))}
          movimentacoes={movimentacoesDoPeriodo.map((m) => ({
            id: m.id,
            descricao: m.descricao,
            categoria: m.categoria,
            valor: Number(m.valor),
            data: m.data_movimentacao,
            entrada: m.tipo === "ENTRADA",
          }))}
          carregando={loading}
          onNovaMovimentacao={() => setShowNovaMovimentacao(true)}
          onExcluir={handleExcluirMovimentacao}
          onPagar={(n) => setDetalhe(recebimentos.find((r) => String(r.pedido_id) === n.id) ?? null)}
        />
        {modais}
      </>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* ---------- Barra de período ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[17px] leading-none text-ink">Financeiro</h1>
          <p className="mt-1 text-[12px] text-faint">Tudo que entrou e saiu · {rotulo}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FiltroPeriodo valor={periodo} onChange={setPeriodo} datas={datasConhecidas} />

          <button onClick={carregar} disabled={loading} className="focus-ring flex h-9 w-9 items-center justify-center rounded-xl border border-fg/[0.1] text-mist transition-colors hover:text-ink disabled:opacity-50" title="Atualizar">
            <RotateCw size={14} className={loading ? "animate-spin" : ""} />
          </button>

          <button onClick={() => setShowNovaMovimentacao(true)} className="focus-ring flex h-9 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-[12.5px] text-white transition-all hover:brightness-110 active:scale-[0.99]">
            <Plus size={14} />
            Movimentação
          </button>
        </div>
      </div>

      {/* ---------- Totais do período ---------- */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <ResumoCard tone="success" icon={<Receipt size={17} />} label="Recebido em vendas" value={money(totais.recebidoVendas)} hint={`${recebimentos.length} ${recebimentos.length === 1 ? "recebimento" : "recebimentos"}`} />
        <ResumoCard tone="accent" icon={<TrendingUp size={17} />} label="Entradas no caixa" value={money(totais.entradas)} hint="Lançamentos manuais" />
        <ResumoCard tone="danger" icon={<TrendingDown size={17} />} label="Saídas" value={money(totais.saidas)} hint="Despesas do período" />
        <ResumoCard tone={totais.saldo >= 0 ? "success" : "danger"} icon={<Wallet size={17} />} label="Saldo do período" value={money(totais.saldo)} hint={resumo ? `Caixa acumulado ${money(resumo.saldoCaixa)}` : undefined} />
      </div>

      {/* ---------- Visão geral + listas ---------- */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* Coluna esquerda — como o dinheiro entrou */}
        <section className="card glass-sheen flex min-h-0 flex-col overflow-hidden">
          <header className="flex items-center gap-2.5 border-b border-fg/[0.07] px-4 py-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success/[0.14] text-success ring-1 ring-inset ring-success/20">
              <Banknote size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[13.5px] leading-none text-ink">Formas de pagamento</h2>
              <p className="mt-1 truncate text-[11px] text-faint">Como o dinheiro entrou · {rotulo}</p>
            </div>
          </header>

          {formas.length === 0 ? (
            <p className="px-4 py-12 text-center text-[12.5px] text-faint">Nenhuma entrada neste período.</p>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <Rosca fatias={formas} formatar={money} />

              <ul className="mt-4 flex flex-col gap-1.5">
                {formas.map((f) => {
                  const total = formas.reduce((acc, x) => acc + x.valor, 0);
                  const pct = total > 0 ? Math.round((f.valor / total) * 100) : 0;

                  return (
                    <li key={f.nome} className="flex items-center justify-between gap-3 rounded-lg bg-fg/[0.03] px-3 py-2">
                      <span className="min-w-0 truncate text-[12.5px] text-mist">{f.nome}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="nums text-[12.5px] text-ink">{money(f.valor)}</span>
                        <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-faint">{pct}%</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        {/* Coluna direita — as duas listas, uma sobre a outra.
            `TabelaCard` traz o cabeçalho, a contagem e a moldura: é o mesmo
            componente das outras telas de lista, e é o que mantém o padrão. */}
        <div className="flex min-h-0 flex-col gap-4">
          <TabelaCard
            title="Recebimentos de vendas"
            icon={<Receipt size={15} />}
            count={recebimentos.length}
            countLabel={money(totais.recebidoVendas)}
          >
            {loading && recebimentos.length === 0 ? (
              <TabelaVazia title="Carregando…" />
            ) : recebimentos.length === 0 ? (
              <TabelaVazia
                icon={<Receipt size={20} />}
                title="Nenhum recebimento neste período"
                description={`Nada foi pago entre ${rotulo.toLowerCase()}. Troque o período acima para ver outro intervalo.`}
              />
            ) : (
              <>
                <TabelaHead cols={COLS_RECEBIDO} colunas={colRecebido} />
                {recebimentos.map((n) => (
                  <TabelaRow key={String(n.pedido_id)} cols={COLS_RECEBIDO} colunas={colRecebido} row={n} onClick={() => setDetalhe(n)} />
                ))}
              </>
            )}
          </TabelaCard>

          <TabelaCard
            title="Caixa"
            icon={<ArrowLeftRight size={15} />}
            count={movimentacoesDoPeriodo.length}
            countLabel={rotulo}
            onAdd={() => setShowNovaMovimentacao(true)}
            addLabel="Lançar"
          >
            {movimentacoesDoPeriodo.length === 0 ? (
              <TabelaVazia
                icon={<ArrowLeftRight size={20} />}
                title="Nenhum lançamento neste período"
                description="Entradas e saídas que você registrar aparecem aqui."
              />
            ) : (
              <>
                <TabelaHead cols={COLS_CAIXA} colunas={colCaixa} />
                {movimentacoesDoPeriodo.map((m) => (
                  <TabelaRow key={m.id} cols={COLS_CAIXA} colunas={colCaixa} row={m} />
                ))}
              </>
            )}
          </TabelaCard>
        </div>
      </div>

      {modais}
    </div>
  );
}
