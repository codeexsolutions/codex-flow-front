import { useMemo } from "react";
import { AlertTriangle, CalendarClock, Repeat } from "lucide-react";

import { Selo, type TomSelo } from "@/shared/ui/StatusBadge";
import { formatCurrency } from "@/shared/utils/currency";
import { dataBr } from "@/shared/utils/parcelas";
import type { Conta, Parcela } from "@/features/financeiro/services/conta.service";

/**
 * As contas que voltam todo mês — e o aviso de quando a próxima vence.
 *
 * ---------------------------------------------------------------------------
 * Por que elas ganharam um lugar só delas
 * ---------------------------------------------------------------------------
 * Aluguel, internet, contador e as outras mensais são a parte previsível do
 * que a empresa deve — e justamente por serem previsíveis é que passam
 * batido: ninguém abre o financeiro no dia 5 para conferir se o aluguel foi
 * pago; abre no dia 12, quando o boleto já rendeu multa. Na lista geral de "A
 * pagar" elas ficam misturadas com a compra avulsa de fornecedor, ordenadas
 * por vencimento, e a que se repete todo mês tem exatamente o mesmo peso da
 * que aconteceu uma vez.
 *
 * Aqui elas aparecem sozinhas, com o DIA DO MÊS escrito ("todo dia 5") ao lado
 * do próximo vencimento. O dia do mês é o que a pessoa decora; a data é o que
 * ela precisa conferir.
 *
 * ---------------------------------------------------------------------------
 * O aviso
 * ---------------------------------------------------------------------------
 * O bloco só sobe ao topo da tela quando há o que avisar — algo vencido ou
 * vencendo nos próximos sete dias. Sem nada a avisar ele continua ali, em tom
 * neutro, como a lista do que está combinado para o mês. Um alerta que aparece
 * todo dia deixa de ser alerta em duas semanas.
 *
 * A conta mensal é uma conta comum com `recorrencia: "MENSAL"` — é o que o
 * formulário grava quando se cria "Aluguel, 12x, a cada Mensal". Não há
 * cadastro novo: o que faltava era a tela dizer que elas existem.
 */

/** Meio-dia para atravessar horário de verão sem escorregar de dia. */
const doIso = (iso: string) => new Date(`${String(iso).slice(0, 10)}T12:00:00`);

const DIA = 86_400_000;

type Linha = {
  conta: Conta;
  parcela: Parcela;
  /** Dias até o vencimento. Negativo = já venceu. */
  faltam: number;
  diaDoMes: number;
};

/** Como o atraso (ou a proximidade) se chama e de que cor ele é. */
const situacao = (faltam: number): { texto: string; tom: TomSelo } => {
  if (faltam < 0) return { texto: faltam === -1 ? "venceu ontem" : `venceu há ${Math.abs(faltam)} dias`, tom: "perigo" };
  if (faltam === 0) return { texto: "vence hoje", tom: "perigo" };
  if (faltam === 1) return { texto: "vence amanhã", tom: "alerta" };
  if (faltam <= 7) return { texto: `em ${faltam} dias`, tom: "alerta" };

  return { texto: `em ${faltam} dias`, tom: "neutro" };
};

const ContasMensais = ({ contas }: { contas: Conta[] }) => {
  const linhas = useMemo<Linha[]>(() => {
    const hoje = new Date();
    hoje.setHours(12, 0, 0, 0);

    const achadas: Linha[] = [];

    for (const conta of contas) {
      if (conta.tipo !== "PAGAR" || conta.recorrencia !== "MENSAL" || conta.status === "CANCELADA") continue;

      /* A parcela que interessa é a PRÓXIMA em aberto — a mais antiga que
         ainda não foi paga. Se houver atraso, é ela que está atrasada, e é
         dela que o aviso precisa falar. */
      const proxima = conta.parcelas
        .filter((p) => p.situacao !== "PAGA")
        .sort((a, b) => +doIso(a.vencimento) - +doIso(b.vencimento))[0];

      if (!proxima) continue;

      const venc = doIso(proxima.vencimento);

      achadas.push({
        conta,
        parcela: proxima,
        faltam: Math.round((+venc - +hoje) / DIA),
        diaDoMes: venc.getDate(),
      });
    }

    return achadas.sort((a, b) => a.faltam - b.faltam);
  }, [contas]);

  if (linhas.length === 0) return null;

  const urgentes = linhas.filter((l) => l.faltam <= 7).length;
  const atrasadas = linhas.filter((l) => l.faltam < 0).length;
  const aviso = urgentes > 0;

  return (
    <section
      className={`card glass-sheen shrink-0 overflow-hidden rounded-2xl ${
        atrasadas > 0 ? "ring-1 ring-inset ring-danger/30" : aviso ? "ring-1 ring-inset ring-warning/30" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2.5 border-b border-fg/[0.07] px-4 py-2.5">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${
            atrasadas > 0
              ? "bg-danger/[0.14] text-danger ring-danger/20"
              : aviso
                ? "bg-warning/[0.14] text-warning ring-warning/20"
                : "bg-accent/[0.14] text-accent-soft ring-accent/20"
          }`}
        >
          {atrasadas > 0 ? <AlertTriangle className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[12.5px] text-ink">Contas mensais</h2>
          <p className="truncate text-[10px] text-faint">
            {atrasadas > 0
              ? `${atrasadas} ${atrasadas === 1 ? "conta atrasada" : "contas atrasadas"} · ${linhas.length} no total`
              : aviso
                ? `${urgentes} ${urgentes === 1 ? "vence" : "vencem"} nos próximos 7 dias · ${linhas.length} no total`
                : `${linhas.length} ${linhas.length === 1 ? "compromisso que se repete" : "compromissos que se repetem"} todo mês`}
          </p>
        </div>
      </div>

      {/* Zebra e colunas fixas, como as tabelas do sistema. */}
      <div className="max-h-[220px] overflow-y-auto">
        {linhas.map(({ conta, parcela, faltam, diaDoMes }) => {
          const s = situacao(faltam);

          return (
            <div
              key={parcela.id}
              className="grid grid-cols-[minmax(0,1fr)_92px_minmax(0,110px)_minmax(0,116px)] items-center gap-2.5 border-b border-fg/[0.04] px-4 py-2 last:border-0 odd:bg-fg/[0.025]"
            >
              <span className="min-w-0 truncate text-[12.5px] text-ink" title={conta.descricao}>
                {conta.descricao}
                {conta.fornecedor && <span className="ml-1.5 text-[11px] text-faint">{conta.fornecedor}</span>}
              </span>

              {/* O dia do mês é o que se decora; a data é o que se confere. */}
              <span className="flex items-center gap-1 text-[11px] text-faint">
                <CalendarClock size={11} /> todo dia {diaDoMes}
              </span>

              <span className="text-right text-[11.5px] tabular-nums text-mist">{dataBr(parcela.vencimento)}</span>

              <span className="flex items-center justify-end gap-2">
                <span className="tabular-nums text-[12.5px] text-ink">{formatCurrency(parcela.valor - parcela.valorPago)}</span>
                <Selo tom={s.tom}>{s.texto}</Selo>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ContasMensais;
