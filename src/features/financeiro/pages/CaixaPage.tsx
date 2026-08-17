import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowLeftRight, Banknote, CreditCard, Plus, Receipt,
  RotateCw, Trash2, TrendingDown, TrendingUp, Wallet,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { TabelaCard, TabelaHead, TabelaRow, TabelaVazia, type Coluna } from "@/shared/ui/DataTable";
import { ChartTip, Kpi, Legenda, Painel, PainelVazio } from "@/shared/ui/Painel";
import { paletaFatias, usePainelCores } from "@/shared/ui/painelCores";
import { GhostAction, PageToolbar, PrimaryAction } from "@/shared/ui/PageShell";
import BotaoRecibo from "@/shared/ui/BotaoRecibo";
import { Modal } from "@/shared/ui/Modal";
import { Form, FormSection, FormGrid, FormActions, TextField } from "@/shared/ui/form/FormKit";
import { useAlert } from "@/shared/ui/Alert";
import { extractErrorMessage, getErrorTitle } from "@/shared/utils/errorHandler";
import useFinanceiroStore from "@/features/financeiro/store/financeiro.store";
import type { MovimentacaoType, NotaFinanceiroType, NovaMovimentacaoType } from "@/shared/domain/financeiro";
import { formatCurrency as brl, money } from "@/shared/utils/currency";
import { brDate, MONTHS } from "@/shared/utils/date";
import FiltroPeriodo, { dentroDoPeriodo, periodoPadrao, rotuloPeriodo, type Periodo } from "@/features/financeiro/components/FiltroPeriodo";

/**
 * Caixa — o dinheiro que entrou e saiu, num período.
 *
 * A tela responde uma pergunta só: "quanto tenho, e por onde passou". O que a
 * empresa deve e o que tem a receber são outras duas perguntas, com outro
 * recorte de tempo (vencimento, não pagamento), e por isso moram nas abas
 * vizinhas — misturá-las aqui fazia a tela responder três coisas e nenhuma bem.
 *
 * Cobrança de nota também não é daqui: a nota é aberta e recebida em Vendas,
 * onde o histórico do pedido está junto.
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

/** ISO local — `toISOString()` cai no dia anterior em fuso negativo. */
const isoLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Meio-dia para atravessar horário de verão sem escorregar de dia. */
const doIso = (iso: string) => new Date(`${iso}T12:00:00`);

const dia10 = (v?: string | null) => (v ? String(v).slice(0, 10) : "");

export default function CaixaPage() {
  const alert = useAlert();
  const C = usePainelCores();

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
   * A série do gráfico — entradas contra saídas ao longo do período.
   *
   * O balde muda de tamanho conforme o recorte: até 45 dias o gráfico é diário,
   * acima disso é mensal. Um ano inteiro em 365 colunas é uma mancha; um mês em
   * 1 coluna não é um gráfico.
   *
   * Períodos curtos são esticados para sete dias terminando no fim do recorte:
   * com o atalho "Dia" o gráfico teria um ponto só, que não desenha linha
   * nenhuma. Os dias a mais são reais — vêm dos mesmos lançamentos — e o
   * subtítulo do painel avisa que a janela é maior que o filtro.
   */
  const grafico = useMemo(() => {
    const inicio = doIso(periodo.de);
    const fim = doIso(periodo.ate);
    const dias = Math.round((+fim - +inicio) / 86_400_000) + 1;
    const porDia = dias <= 45;

    const baldes: { chave: string; name: string; entradas: number; saidas: number }[] = [];

    if (porDia) {
      const janela = Math.max(dias, 7);

      for (let i = janela - 1; i >= 0; i--) {
        const d = new Date(fim);
        d.setDate(fim.getDate() - i);
        const iso = isoLocal(d);
        baldes.push({ chave: iso, name: `${iso.slice(8, 10)}/${iso.slice(5, 7)}`, entradas: 0, saidas: 0 });
      }
    } else {
      let ano = inicio.getFullYear();
      let mes = inicio.getMonth();

      while (ano < fim.getFullYear() || (ano === fim.getFullYear() && mes <= fim.getMonth())) {
        baldes.push({ chave: `${ano}-${String(mes + 1).padStart(2, "0")}`, name: MONTHS[mes], entradas: 0, saidas: 0 });
        mes += 1;

        if (mes > 11) {
          mes = 0;
          ano += 1;
        }
      }
    }

    const porChave = new Map(baldes.map((b) => [b.chave, b]));
    const corte = (iso: string) => (porDia ? iso.slice(0, 10) : iso.slice(0, 7));

    for (const n of notas) {
      const pago = Number(n.valor_pago ?? 0);
      if (!(pago > 0)) continue;

      const b = porChave.get(corte(dia10(n.data_pagamento ?? n.data_pedido)));
      if (b) b.entradas += pago;
    }

    for (const m of movimentacoes) {
      const b = porChave.get(corte(dia10(m.data_movimentacao)));
      if (!b) continue;

      if (m.tipo === "ENTRADA") b.entradas += Number(m.valor);
      else b.saidas += Number(m.valor);
    }

    return { dados: baldes, porDia, esticado: porDia && dias < 7, temMovimento: baldes.some((b) => b.entradas > 0 || b.saidas > 0) };
  }, [notas, movimentacoes, periodo]);

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

  const totalFormas = useMemo(() => formas.reduce((acc, f) => acc + f.valor, 0), [formas]);
  const paleta = paletaFatias(C);
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
        <button onClick={() => fetchFinanceiro(true)} className="focus-ring flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm text-white transition hover:brightness-110">
          <RotateCw size={14} /> Tentar de novo
        </button>
      </div>
    );
  }

  /* ---------------- Tela ---------------- */

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageToolbar left={<FiltroPeriodo valor={periodo} onChange={setPeriodo} datas={datasConhecidas} />}>
        <GhostAction icon={<RotateCw size={14} className={loading ? "animate-spin" : ""} />} onClick={() => fetchFinanceiro(true)} disabled={loading} title="Atualizar" />

        <PrimaryAction icon={<Plus size={14} />} onClick={() => setShowNovaMovimentacao(true)}>
          Movimentação
        </PrimaryAction>
      </PageToolbar>

      <div className="stagger grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi tone="success" icon={<Receipt size={17} />} label="Recebido em vendas" value={money(totais.recebidoVendas)} hint={`${recebimentos.length} ${recebimentos.length === 1 ? "recebimento" : "recebimentos"}`} />
        <Kpi tone="accent" icon={<TrendingUp size={17} />} label="Entradas no caixa" value={money(totais.entradas)} hint="Lançamentos manuais" />
        <Kpi tone="danger" icon={<TrendingDown size={17} />} label="Saídas" value={money(totais.saidas)} hint="Despesas do período" />
        <Kpi tone={totais.saldo >= 0 ? "success" : "danger"} icon={<Wallet size={17} />} label="Saldo do período" value={money(totais.saldo)} hint={resumo ? `Caixa acumulado ${money(resumo.saldoCaixa)}` : undefined} />
      </div>

      <div className="grid min-h-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <Painel
          icon={<Activity size={15} />}
          tone="accent"
          title="Entradas e saídas"
          sub={grafico.esticado ? `Últimos 7 dias · o filtro mostra ${rotulo.toLowerCase()}` : `${grafico.porDia ? "Por dia" : "Por mês"} · ${rotulo}`}
          className="min-h-[300px]"
          footer={<Legenda itens={[{ color: C.accent, label: "Entradas" }, { color: C.danger, label: "Saídas" }]} />}
        >
          {grafico.temMovimento ? (
            /* Altura mínima, não fixa: no lado esquerdo da grade o painel
               estica até a altura da coluna vizinha, e o gráfico acompanha em
               vez de deixar uma faixa vazia embaixo. */
            <div className="h-full min-h-[240px] w-full py-3 pr-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={grafico.dados} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                  <defs>
                    <linearGradient id="caixaEntradas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.accent} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="caixaSaidas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.danger} stopOpacity={0.22} />
                      <stop offset="95%" stopColor={C.danger} stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.tick }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={18} />
                  <YAxis tick={{ fontSize: 11, fill: C.tick }} axisLine={false} tickLine={false} width={44} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                  <Tooltip content={<ChartTip />} />

                  <Area type="monotone" dataKey="entradas" name="Entradas" stroke={C.accent} strokeWidth={2} fill="url(#caixaEntradas)" />
                  <Area type="monotone" dataKey="saidas" name="Saídas" stroke={C.danger} strokeWidth={2} fill="url(#caixaSaidas)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <PainelVazio icon={<Activity size={19} />} title="Nada movimentou neste período" description="Recebimentos de venda e lançamentos do caixa desenham as duas curvas aqui." />
          )}
        </Painel>

        <Painel
          icon={<Banknote size={15} />}
          tone="success"
          title="Formas de pagamento"
          sub={formas.length > 0 ? `${formas.length} ${formas.length === 1 ? "forma" : "formas"} · ${money(totalFormas)}` : rotulo}
          bodyClassName="overflow-y-auto"
        >
          {formas.length === 0 ? (
            <PainelVazio icon={<Banknote size={19} />} title="Nenhuma entrada neste período" />
          ) : (
            <div className="flex flex-col gap-3 p-3.5">
              <div className="h-[132px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={formas} cx="50%" cy="50%" innerRadius="56%" outerRadius="88%" paddingAngle={3} dataKey="valor" nameKey="nome">
                      {formas.map((f, i) => (
                        <Cell key={f.nome} fill={paleta[i % paleta.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <ul className="flex flex-col gap-1">
                {formas.map((f, i) => {
                  const pct = totalFormas > 0 ? Math.round((f.valor / totalFormas) * 100) : 0;

                  return (
                    <li key={f.nome} className="flex items-center justify-between gap-3 rounded-lg bg-fg/[0.03] px-2.5 py-1.5">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: paleta[i % paleta.length] }} />
                        <span className="truncate text-[12px] text-mist">{f.nome}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="nums text-[12px] text-ink">{money(f.valor)}</span>
                        <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-faint">{pct}%</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </Painel>
      </div>

      {/* O livro-caixa é o assunto da tela e vem primeiro; os recebimentos de
          venda vêm logo abaixo porque também são dinheiro que entrou — só que
          lançado pela nota, e não à mão. */}
      <TabelaCard
        title="Livro-caixa"
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

      <TabelaCard title="Recebimentos de vendas" icon={<Receipt size={15} />} count={recebimentos.length} countLabel={money(totais.recebidoVendas)}>
        {loading && recebimentos.length === 0 ? (
          <TabelaVazia title="Carregando…" />
        ) : recebimentos.length === 0 ? (
          <TabelaVazia
            icon={<Receipt size={20} />}
            title="Nenhum recebimento neste período"
            description={`Nada foi pago em ${rotulo.toLowerCase()}. Troque o período acima para ver outro intervalo.`}
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

      {modais}
    </div>
  );
}
