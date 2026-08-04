import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Wallet, TrendingUp, TrendingDown, CalendarClock, CheckCircle2, Trash2, AlertTriangle, RotateCw, Receipt, ArrowLeftRight, CalendarDays } from "lucide-react";

import { TabelaCard, TabelaHead, TabelaRow, TabelaVazia, type Coluna } from "@/shared/ui/DataTable";
import { Modal } from "@/shared/ui/Modal";
import { Form, FormSection, FormGrid, FormActions, TextField } from "@/shared/ui/form/FormKit";
import { useAlert } from "@/shared/ui/Alert";
import { extractErrorMessage, getErrorTitle } from "@/shared/utils/errorHandler";
import useFinanceiroStore from "@/features/financeiro/store/financeiro.store";
import type { MovimentacaoType, NotaFinanceiroType, NovaMovimentacaoType } from "@/shared/domain/financeiro";
import { formatCurrency as brl } from "@/shared/utils/currency";
import { formatDate, MONTHS as MESES } from "@/shared/utils/date";
import { useIsMobile } from "@/shared/hooks/useIsMobile";
import FinanceiroMobile from "@/features/financeiro/components/FinanceiroMobile";
import PagamentoForm from "@/shared/ui/PagamentoForm";
import { Rosca } from "@/shared/ui/Rosca";

const brDate = (v?: string | null) => (v ? formatDate(v, "-") : "-");
const money = (v?: number) => brl(v ?? 0);

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
const COLS_CAIXA = "grid-cols-[110px_minmax(180px,420px)_130px_120px_60px_minmax(0,1fr)]";

/** Célula vazia que ocupa o vão flexível do fim da linha. */
const COLUNA_VAO = { id: "vao", header: "", cell: () => null };

export default function FinanceiroPage() {
  const alert = useAlert();
  const mobile = useIsMobile();

  const resumo = useFinanceiroStore((s) => s.resumo);
  const notas = useFinanceiroStore((s) => s.notas);
  const movimentacoes = useFinanceiroStore((s) => s.movimentacoes);
  const loading = useFinanceiroStore((s) => s.loading);
  const error = useFinanceiroStore((s) => s.error);
  const fetchFinanceiro = useFinanceiroStore((s) => s.fetchFinanceiro);
  const registrarPagamentoNotaStore = useFinanceiroStore((s) => s.registrarPagamentoNota);
  const criarMovimentacaoStore = useFinanceiroStore((s) => s.criarMovimentacao);
  const excluirMovimentacaoStore = useFinanceiroStore((s) => s.excluirMovimentacao);

  const [showNovaMovimentacao, setShowNovaMovimentacao] = useState(false);
  const [notaParaPagar, setNotaParaPagar] = useState<NotaFinanceiroType | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [novaMovimentacao, setNovaMovimentacao] = useState<NovaMovimentacaoType>({ tipo: "ENTRADA", categoria: "", descricao: "", valor: 0, dataMovimentacao: "" });

  useEffect(() => {
    fetchFinanceiro();
  }, [fetchFinanceiro]);

  const carregar = () => fetchFinanceiro(true);

  /* Só o que está em aberto: nota quitada não tem ação aqui, e repetir o
     histórico inteiro era a redundância com Vendas. */
  const pendentes = notas.filter((n) => n.status_pagamento !== "PAGO");

  /**
   * Caixa é assunto de mês fechado.
   *
   * Sem recorte, a lista virava o histórico inteiro da loja e o saldo perdia
   * significado — ninguém confere caixa "desde sempre". O mês corrente é o
   * padrão, e os meses anteriores ficam a um clique para quem for fechar o
   * período.
   */
  const [mes, setMes] = useState(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  });

  /* Os meses vêm dos próprios lançamentos: mês sem movimento não aparece no
     seletor, então não há como escolher uma tela vazia. */
  const mesesDisponiveis = useMemo(() => {
    const set = new Set<string>();

    for (const m of movimentacoes) {
      const d = new Date(m.data_movimentacao);
      if (!Number.isNaN(+d)) set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    set.add(mes);

    return Array.from(set).sort().reverse();
  }, [movimentacoes, mes]);

  const movimentacoesDoMes = useMemo(
    () =>
      movimentacoes.filter((m) => {
        const d = new Date(m.data_movimentacao);
        if (Number.isNaN(+d)) return false;

        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === mes;
      }),
    [movimentacoes, mes],
  );

  /* Entradas, saídas e saldo do mês escolhido — não os totais de todo o
     histórico, que era o que os cartões mostravam antes. */
  const totaisDoMes = useMemo(() => {
    let entradas = 0;
    let saidas = 0;

    for (const m of movimentacoesDoMes) {
      if (m.tipo === "ENTRADA") entradas += Number(m.valor ?? 0);
      else saidas += Number(m.valor ?? 0);
    }

    return { entradas, saidas, saldo: entradas - saidas };
  }, [movimentacoesDoMes]);

  const rotuloMes = (v: string) => {
    const [ano, m] = v.split("-");
    return `${MESES[Number(m) - 1]}/${ano}`;
  };

  /**
   * Formas de pagamento do mês escolhido — calculado das notas,
   * não do resumo geral. O resumo vem do backend somando tudo;
   * o mês é o que o usuário selecionou no seletor.
   */
  const formasDoMes = useMemo(() => {
    const mapa = new Map<string, number>();

    for (const n of notas) {
      if (n.status_pagamento !== "PAGO") continue;
      const d = new Date(n.data_pedido);
      if (Number.isNaN(+d)) continue;
      if (`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` !== mes) continue;

      const f = n.forma_pagamento?.trim() || "Não informado";
      mapa.set(f, (mapa.get(f) ?? 0) + Number(n.valor_pago ?? 0));
    }

    return Array.from(mapa, ([formaPagamento, valor]) => ({ formaPagamento, valor })).sort((a, b) => b.valor - a.valor);
  }, [notas, mes]);

  /* Recebe o valor do formulário em vez de quitar tudo: metade agora e o resto
     depois é o caso mais comum do balcão, e antes não havia como registrar. */
  const handleRegistrarPagamentoNota = async (valor: number, forma: string) => {
    if (!notaParaPagar) return;

    setSalvando(true);
    try {
      await registrarPagamentoNotaStore(notaParaPagar.pedido_id, valor, forma);

      const quitou = valor >= Number(notaParaPagar.total) - Number(notaParaPagar.valor_pago ?? 0);
      alert.success(quitou ? "Nota quitada!" : "Pagamento registrado!", quitou ? "Não há mais saldo em aberto." : "O restante continua a receber.");

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



  /* Os mesmos formulários servem as duas versões — o que muda é a moldura. */
  const modais = (
    <>
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
        {/* Mesmo formulário da nota — recebimento é o mesmo ato nos dois
            lugares, e antes aqui só dava para quitar tudo de uma vez. */}
        <Modal
          open={!!notaParaPagar}
          onClose={() => setNotaParaPagar(null)}
          title="Registrar pagamento"
          subtitle={notaParaPagar ? `${notaParaPagar.cliente_nome} · nota #${notaParaPagar.codigo_pedido}` : ""}
        >
          {notaParaPagar && (
            <PagamentoForm
              total={Number(notaParaPagar.total ?? 0)}
              jaPago={Number(notaParaPagar.valor_pago ?? 0)}
              salvando={salvando}
              textoConfirmar="Confirmar recebimento"
              onCancelar={() => setNotaParaPagar(null)}
              onConfirmar={handleRegistrarPagamentoNota}
            />
          )}
        </Modal>
    </>
  );

  if (mobile) {
    return (
      <>
        <FinanceiroMobile
          aba="caixa"
          onAba={() => {}}
          saldoCaixa={resumo?.saldoCaixa ?? 0}
          aReceber={resumo?.totalAReceber ?? 0}
          entradas={totaisDoMes.entradas}
          saidas={totaisDoMes.saidas}
          notas={notas.map((n) => ({
            id: String(n.pedido_id),
            cliente: n.cliente_nome,
            pedido: n.codigo_pedido,
            total: Number(n.total ?? 0),
            pago: Number(n.valor_pago ?? 0),
            data: brDate(n.data_pedido),
            quitada: n.status_pagamento === "PAGO",
            formaPagamento: n.forma_pagamento,
          }))}
          movimentacoes={movimentacoesDoMes.map((m) => ({
            id: String(m.id),
            descricao: m.descricao,
            categoria: m.categoria,
            valor: Number(m.valor ?? 0),
            data: brDate(m.data_movimentacao),
            entrada: m.tipo === "ENTRADA",
          }))}
          carregando={loading}
          onPagar={(item) => {
            const alvo = notas.find((n) => String(n.pedido_id) === item.id);
            if (alvo) setNotaParaPagar(alvo);
          }}
          onExcluir={handleExcluirMovimentacao}
          onNovaMovimentacao={() => setShowNovaMovimentacao(true)}
        />
        {modais}
      </>
    );
  }

  return (
    /* Conteúdo de aba: SEM casca própria. O cabeçalho, o espaçamento e a
       rolagem vêm do `PageScreen` da tela de Vendas, que é quem hospeda esta
       rota. Com `PageScreen` aqui também, a página exibia dois títulos
       "Financeiro" empilhados — um do outlet e outro deste componente. */
    <div className="flex h-full min-h-0 flex-col gap-3">
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

        {/* 2 colunas no celular, 3 no tablet, 6 só com largura de verdade: em
            seis colunas num monitor médio os valores truncavam. */}
        <div className="stagger grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <ResumoCard icon={<CalendarClock size={17} />} label="A receber" value={money(resumo?.totalAReceber)} tone="warning" />
          <ResumoCard icon={<CheckCircle2 size={17} />} label="Recebido" value={money(resumo?.totalRecebido)} tone="success" />
          <ResumoCard icon={<TrendingUp size={17} />} label="Entradas do mês" value={money(totaisDoMes.entradas)} tone="success" />
          <ResumoCard icon={<TrendingDown size={17} />} label="Saídas do mês" value={money(totaisDoMes.saidas)} tone="danger" />
          <ResumoCard icon={<Wallet size={17} />} label="Saldo em caixa" value={money(resumo?.saldoCaixa)} tone="accent" />
        </div>

        {/* Uma tela, um assunto: o caixa da loja. As duas listas convivem lado
            a lado em telas largas — antes empilhavam e disputavam altura. À
            esquerda o que falta receber e o que já entrou por forma de
            pagamento; à direita o caixa do mês escolhido. */}
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
          {/* Coluna esquerda — recebimento */}
          <div className="flex min-h-0 flex-col gap-3">
            {formasDoMes.length > 0 && <Rosca fatias={formasDoMes.map((f) => ({ nome: f.formaPagamento, valor: f.valor }))} formatar={money} />}

            {pendentes.length > 0 && (
              <section className="card glass-sheen flex min-h-0 flex-1 flex-col overflow-hidden">
                <header className="flex flex-wrap items-center gap-2.5 border-b border-fg/[0.07] px-4 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/[0.14] text-warning ring-1 ring-inset ring-warning/20">
                    <Receipt size={15} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-[13.5px] leading-none text-ink">A receber</h2>
                    <p className="mt-1 text-[11.5px] text-faint">
                      {pendentes.length} {pendentes.length === 1 ? "nota aberta" : "notas abertas"} · {money(resumo?.totalAReceber)}
                    </p>
                  </div>

                  <button onClick={carregar} title="Atualizar" className="focus-ring glass-subtle shrink-0 rounded-lg p-2 text-faint transition-colors hover:text-ink">
                    <RotateCw size={14} className={loading ? "animate-spin" : ""} />
                  </button>
                </header>

                {/* Linhas que quebram em vez de tabela: em tela estreita a nota
                    vira bloco, sem colunas espremidas nem rolagem lateral. */}
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {pendentes.map((n) => {
                    const restante = Number(n.total) - Number(n.valor_pago ?? 0);

                    return (
                      <div key={n.pedido_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-fg/[0.04] px-4 py-2.5 last:border-0">
                        <span className="min-w-0 flex-1 basis-[160px]">
                          <span className="block truncate text-[13px] text-ink">{n.cliente_nome}</span>
                          <span className="block truncate text-[11px] text-faint">
                            #{n.codigo_pedido} · {brDate(n.data_pedido)}
                            {Number(n.valor_pago) > 0 ? ` · pago ${brl(n.valor_pago)}` : ""}
                          </span>
                        </span>

                        <span className="shrink-0 text-right">
                          <span className="block text-[13px] tabular-nums text-warning">{brl(restante)}</span>
                          <span className="block text-[10.5px] text-faint">falta</span>
                        </span>

                        <button
                          onClick={() => setNotaParaPagar(n)}
                          title="Registrar pagamento"
                          className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/[0.1] text-success ring-1 ring-inset ring-success/20 transition-colors hover:bg-success/20"
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Coluna direita — o caixa do mês escolhido. */}
          <TabelaCard
            title="Fluxo de caixa"
          icon={<ArrowLeftRight size={15} />}
          count={movimentacoesDoMes.length}
          countLabel={movimentacoesDoMes.length === 1 ? "lançamento" : "lançamentos"}
          filters={
            <div className="flex items-center gap-2 rounded-lg border border-fg/[0.08] bg-fg/[0.05] px-3">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted" />
              <select value={mes} onChange={(e) => setMes(e.target.value)} aria-label="Filtrar por mês" className="cursor-pointer bg-transparent py-2 text-xs text-ink outline-none">
                {mesesDisponiveis.map((v) => (
                  <option key={v} value={v}>
                    {rotuloMes(v)}
                  </option>
                ))}
              </select>
            </div>
          }
          onAdd={() => setShowNovaMovimentacao(true)}
          addLabel="Nova movimentação"
        >
          <TabelaHead colunas={colCaixa} cols={COLS_CAIXA} />
          {movimentacoesDoMes.length === 0 ? (
            <TabelaVazia icon={<ArrowLeftRight size={20} />} title={loading ? "Carregando…" : "Nenhuma movimentação registrada"} description="Nenhum lançamento neste mês. Escolha outro período ou registre uma movimentação." />
          ) : (
            movimentacoesDoMes.map((m) => <TabelaRow key={m.id} colunas={colCaixa} cols={COLS_CAIXA} row={m} />)
          )}
          </TabelaCard>
        </div>

        {modais}
    </div>
  );
}
