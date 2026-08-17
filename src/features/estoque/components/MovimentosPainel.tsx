import { useState } from "react";
import { History, ArrowDownToLine, ArrowUpFromLine, ClipboardCheck } from "lucide-react";

import { MOVIMENTO_LABEL, type Movimento, type Variacao } from "@/shared/domain/estoque";
import EstoqueService from "@/features/estoque/services/estoque.service";
import { Modal } from "@/shared/ui/Modal";
import { Form, FormGrid, TextField, TextArea, CurrencyField, FormActions } from "@/shared/ui/form/FormKit";
import { useAlert } from "@/shared/ui/Alert";
import { extractErrorMessage, getErrorTitle } from "@/shared/utils/errorHandler";
import { formatDateTime } from "@/shared/utils/date";
import { formatNumber } from "@/shared/utils/format";

/**
 * O extrato do estoque, e o lugar de mexer nele.
 *
 * ---------------------------------------------------------------------------
 * Por que um extrato
 * ---------------------------------------------------------------------------
 * "Por que tinha 12 e agora tem 3?" não tinha resposta. A quantidade era um
 * número que mudava e pronto — e quando ele não batia com a prateleira, não
 * havia por onde começar a procurar. Aqui cada linha diz quanto mudou, qual
 * ficou o saldo, quem fez e por quê.
 *
 * ---------------------------------------------------------------------------
 * Por que AJUSTE pede o saldo, e não a diferença
 * ---------------------------------------------------------------------------
 * Quem conta a prateleira sabe o TOTAL que encontrou ("são 47"), não o quanto
 * mudou. Pedir a diferença obrigaria a subtrair de cabeça do número que a tela
 * mostra — e esse número pode estar velho: entre abrir a tela e salvar, uma
 * venda pode ter acontecido. Informando o saldo, a conta é feita no banco, no
 * instante da gravação, sobre o valor real.
 */

type Props = {
  produtoId: string;
  movimentos: Movimento[];
  variacoes: Variacao[];
  /** `false` para serviço e item sob encomenda: não há unidade para mexer. */
  podeMovimentar: boolean;
  onMudou: () => Promise<void> | void;
};

type Tipo = "ENTRADA" | "SAIDA" | "AJUSTE";

const ACOES: { tipo: Tipo; label: string; icone: typeof ArrowDownToLine; ajuda: string; tom: string }[] = [
  { tipo: "ENTRADA", label: "Entrada", icone: ArrowDownToLine, ajuda: "Chegou mercadoria: compra, devolução de cliente, produção.", tom: "text-success" },
  { tipo: "SAIDA", label: "Saída", icone: ArrowUpFromLine, ajuda: "Saiu sem venda: perda, quebra, brinde, uso interno.", tom: "text-danger" },
  { tipo: "AJUSTE", label: "Contagem", icone: ClipboardCheck, ajuda: "Você contou a prateleira. Informe o total encontrado.", tom: "text-warning" },
];

const TOM_CLASSE = {
  entrada: "text-success",
  saida: "text-danger",
  neutro: "text-mist",
} as const;

const MovimentosPainel = ({ produtoId, movimentos, variacoes, podeMovimentar, onMudou }: Props) => {
  const alert = useAlert();

  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [quantidade, setQuantidade] = useState("");
  const [variacaoId, setVariacaoId] = useState("");
  const [motivo, setMotivo] = useState("");
  const [custo, setCusto] = useState(0);
  const [salvando, setSalvando] = useState(false);

  const ativas = variacoes.filter((v) => v.ativo);

  const abrir = (t: Tipo) => {
    setTipo(t);
    setQuantidade("");
    setMotivo("");
    setCusto(0);
    /* Com uma variação só, ela já vem escolhida: obrigar a selecionar o único
       item possível é um passo que não decide nada. */
    setVariacaoId(ativas.length === 1 ? ativas[0].id : "");
  };

  const salvar = async () => {
    if (!tipo) return;

    const quanto = Number(quantidade);

    if (!Number.isFinite(quanto) || quanto < 0) {
      alert.error("Quantidade inválida", "Informe um número.");
      return;
    }

    if (tipo !== "AJUSTE" && quanto === 0) {
      alert.error("Quantidade zerada", "Informe quanto entrou ou saiu.");
      return;
    }

    /* Produto com variações não tem estoque próprio — o saldo é das peças. Sem
       esta trava, o movimento cairia no produto pai e seria sobrescrito na
       primeira mudança de qualquer variação, pelo gatilho que recalcula a
       soma: o ajuste "sumiria" sozinho e ninguém saberia por quê. */
    if (ativas.length > 0 && !variacaoId) {
      alert.error("Escolha a variação", "Este produto tem variações — o estoque é de cada uma, não do produto inteiro.");
      return;
    }

    setSalvando(true);
    try {
      await EstoqueService.movimentar({
        produtoId,
        variacaoId: variacaoId || null,
        tipo,
        quantidade: quanto,
        motivo: motivo.trim() || undefined,
        custoUnitario: tipo === "ENTRADA" && custo > 0 ? custo : null,
      });

      await onMudou();
      setTipo(null);
      alert.success("Estoque atualizado!", "");
    } catch (err) {
      alert.error(getErrorTitle(err), extractErrorMessage(err, "Não foi possível movimentar o estoque."));
    } finally {
      setSalvando(false);
    }
  };

  const acao = ACOES.find((a) => a.tipo === tipo);

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-fg/[0.07] px-5 py-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/[0.14] text-accent-soft ring-1 ring-inset ring-accent/20">
          <History className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[13px] text-ink">Movimentações</h2>
          <p className="text-[11px] text-faint">
            {movimentos.length === 0 ? "Cada entrada e saída fica registrada aqui" : `${formatNumber(movimentos.length)} ${movimentos.length === 1 ? "lançamento" : "lançamentos"}`}
          </p>
        </div>

        {podeMovimentar && ACOES.map(({ tipo: t, label, icone: Icone, tom }) => (
          <button
            key={t}
            type="button"
            onClick={() => abrir(t)}
            className={`focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-fg/[0.1] px-2.5 py-1.5 text-[12px] transition-colors hover:bg-fg/[0.05] ${tom}`}
          >
            <Icone size={13} /> {label}
          </button>
        ))}
      </div>

      {movimentos.length === 0 ? (
        <p className="px-5 py-6 text-center text-[12px] text-faint">
          {podeMovimentar
            ? "Nenhuma movimentação ainda. Lance uma entrada quando chegar mercadoria."
            : "Este item não conta unidades, então não há movimentação a registrar."}
        </p>
      ) : (
        <div className="flex max-h-[340px] flex-col divide-y divide-fg/[0.05] overflow-y-auto">
          {movimentos.map((movimento) => {
            const rotulo = MOVIMENTO_LABEL[movimento.tipo] ?? { texto: movimento.tipo, tom: "neutro" as const };
            const quanto = Number(movimento.quantidade) || 0;

            return (
              <div key={movimento.id} className="flex items-center gap-3 px-5 py-2">
                <span className={`w-[86px] shrink-0 text-[11.5px] ${TOM_CLASSE[rotulo.tom]}`}>{rotulo.texto}</span>

                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[12px] text-mist">
                    {movimento.variacaoDescricao || movimento.motivo || "—"}
                  </span>
                  <span className="truncate text-[10.5px] text-faint">
                    {formatDateTime(movimento.criadoEm)}
                    {movimento.usuarioNome ? ` · ${movimento.usuarioNome}` : ""}
                    {movimento.variacaoDescricao && movimento.motivo ? ` · ${movimento.motivo}` : ""}
                  </span>
                </div>

                {/* O sinal vem do próprio número (a API grava assinado), então
                    entrada e saída se distinguem sem depender só da cor. */}
                <span className={`shrink-0 text-[12.5px] tabular-nums ${quanto < 0 ? "text-danger" : "text-success"}`}>
                  {quanto > 0 ? "+" : ""}{formatNumber(quanto)}
                </span>

                <span className="w-[64px] shrink-0 text-right text-[11.5px] tabular-nums text-faint">
                  {movimento.saldoApos == null ? "—" : formatNumber(movimento.saldoApos)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={tipo !== null}
        onClose={() => setTipo(null)}
        title={acao?.label ?? ""}
        subtitle={acao?.ajuda}
      >
        <Form onSubmit={(e) => { e.preventDefault(); void salvar(); }} className="!gap-3">
          {ativas.length > 0 && (
            <div className="flex flex-col">
              <label htmlFor="mov-variacao" className="mb-1.5 text-[11px] uppercase tracking-[0.08em] text-faint">Variação</label>
              <div className="glass-subtle flex items-center rounded-lg border-fg/[0.09] px-3 focus-within:border-accent/60">
                <select
                  id="mov-variacao"
                  value={variacaoId}
                  onChange={(e) => setVariacaoId(e.target.value)}
                  className="w-full min-w-0 flex-1 cursor-pointer appearance-none bg-transparent py-2.5 text-sm text-ink outline-none [&>option]:bg-surface"
                >
                  <option value="">Escolha…</option>
                  {ativas.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.descricao || v.sku || v.id.substring(0, 6)} — {formatNumber(Number(v.quantidade) || 0)} un.
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1 min-h-[14px] text-[10.5px] leading-[14px] text-faint" />
            </div>
          )}

          <FormGrid cols={tipo === "ENTRADA" ? 2 : 1}>
            <TextField
              label={tipo === "AJUSTE" ? "Total contado" : "Quantidade"}
              type="number"
              min="0"
              step="any"
              autoFocus
              hint={tipo === "AJUSTE" ? "O que você encontrou na prateleira" : undefined}
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />

            {/* Só na entrada: é o único momento em que existe um custo novo a
                registrar — e ele atualiza o custo do produto, o que faz o
                "valor do estoque" da tela parar de usar o preço da primeira
                compra para sempre. */}
            {tipo === "ENTRADA" && (
              <CurrencyField
                label="Custo unitário"
                hint="Opcional — atualiza o custo do item"
                value={custo}
                onValueChange={setCusto}
              />
            )}
          </FormGrid>

          <TextArea
            label="Motivo"
            rows={2}
            placeholder={tipo === "SAIDA" ? "Quebrou no transporte" : tipo === "ENTRADA" ? "Nota 4521 — fornecedor X" : "Contagem mensal"}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />

          <FormActions onCancel={() => setTipo(null)} saving={salvando} submitText="Lançar" />
        </Form>
      </Modal>
    </div>
  );
};

export default MovimentosPainel;
