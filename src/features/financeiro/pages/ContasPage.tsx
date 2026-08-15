import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, CalendarClock, Plus, RotateCw } from "lucide-react";

import { Kpi } from "@/shared/ui/Painel";
import { GhostAction, PageToolbar, PrimaryAction } from "@/shared/ui/PageShell";
import { useAlert } from "@/shared/ui/Alert";
import { extractErrorMessage, getErrorTitle } from "@/shared/utils/errorHandler";
import { money } from "@/shared/utils/currency";
import ListaContas from "@/features/financeiro/components/ListaContas";
import ContaForm from "@/features/financeiro/components/ContaForm";
import useContasStore from "@/features/financeiro/store/contas.store";
import ContaService, { type NovaConta, type TipoConta } from "@/features/financeiro/services/conta.service";

/**
 * Contas a pagar e a receber — a mesma tela, virada para um lado ou para o
 * outro.
 *
 * As duas respondem a mesma pergunta ("o que vence, e quando"), mudam de sinal
 * e de rótulo, e nada mais: eram dois blocos idênticos dentro do financeiro,
 * separados por um `guia === "pagar" ? … : …` em cada linha. Agora são duas
 * rotas que montam o mesmo componente com `tipo` diferente.
 *
 * Aqui NÃO existe filtro de período. Esta tela olha o futuro, por vencimento —
 * filtrar "agosto" esconderia a parcela de setembro, que é justamente a próxima
 * a vencer. O período é do Caixa, que olha o que já aconteceu.
 */

type Props = { tipo: TipoConta };

export default function ContasPage({ tipo }: Props) {
  const alert = useAlert();

  const contas = useContasStore((s) => s.contas);
  const resumo = useContasStore((s) => s.resumo);
  const carregando = useContasStore((s) => s.carregando);
  const fetchContas = useContasStore((s) => s.fetchContas);

  const [criando, setCriando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const aPagar = tipo === "PAGAR";

  useEffect(() => {
    fetchContas();
  }, [fetchContas]);

  const doTipo = useMemo(() => contas.filter((c) => c.tipo === tipo), [contas, tipo]);

  const criarConta = async (dados: NovaConta) => {
    setSalvando(true);

    try {
      await ContaService.criar(dados);
      setCriando(false);
      await fetchContas(true);
      alert.success("Conta criada!", dados.parcelas && dados.parcelas > 1 ? `${dados.parcelas} parcelas geradas com os vencimentos.` : "O vencimento já está na lista.");
    } catch (err) {
      alert.error(getErrorTitle(err), extractErrorMessage(err, "Não foi possível criar a conta."));
    } finally {
      setSalvando(false);
    }
  };

  const total = aPagar ? resumo?.aPagar ?? 0 : resumo?.aReceber ?? 0;
  const vencido = aPagar ? resumo?.vencidoPagar ?? 0 : resumo?.vencidoReceber ?? 0;
  const semana = aPagar ? resumo?.pagarSemana ?? 0 : resumo?.receberSemana ?? 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageToolbar>
        <GhostAction icon={<RotateCw size={14} className={carregando ? "animate-spin" : ""} />} onClick={() => void fetchContas(true)} disabled={carregando} title="Atualizar" />

        <PrimaryAction icon={<Plus size={14} />} onClick={() => setCriando(true)}>
          {aPagar ? "Nova conta a pagar" : "Nova conta a receber"}
        </PrimaryAction>
      </PageToolbar>

      {/* Os três números que decidem o dia: o total em aberto, o que já venceu
          e o que vence nos próximos sete dias. */}
      <div className="stagger grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi
          tone={aPagar ? "danger" : "success"}
          icon={aPagar ? <ArrowUpCircle size={17} /> : <ArrowDownCircle size={17} />}
          label={aPagar ? "Total a pagar" : "Total a receber"}
          value={money(total)}
          hint="Parcelas em aberto"
        />
        <Kpi tone="warning" icon={<AlertTriangle size={17} />} label="Vencido" value={money(vencido)} hint="Já passou do vencimento" />
        <Kpi tone="accent" icon={<CalendarClock size={17} />} label="Próximos 7 dias" value={money(semana)} hint="Vence nesta semana" />
      </div>

      {/* Sem `onNova`: o botão de criar já está na barra de ações acima. */}
      <ListaContas tipo={tipo} contas={doTipo} carregando={carregando} onRecarregar={() => void fetchContas(true)} />

      {criando && <ContaForm tipo={tipo} salvando={salvando} onFechar={() => setCriando(false)} onSalvar={criarConta} />}
    </div>
  );
}
