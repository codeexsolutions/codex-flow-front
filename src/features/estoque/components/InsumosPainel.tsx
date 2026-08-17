import { useMemo, useState } from "react";
import { Plus, Trash2, Loader2, Blocks, ArrowRight, AlertTriangle } from "lucide-react";

import type { Insumo } from "@/shared/domain/estoque";
import type ProductType from "@/shared/domain/produto";
import EstoqueService from "@/features/estoque/services/estoque.service";
import { useAlert } from "@/shared/ui/Alert";
import { extractErrorMessage, getErrorTitle } from "@/shared/utils/errorHandler";
import { formatNumber } from "@/shared/utils/format";

/**
 * A lista de materiais: o que este produto consome para existir.
 *
 * ---------------------------------------------------------------------------
 * O problema que isto resolve
 * ---------------------------------------------------------------------------
 * Quem PRODUZ o que vende — gráfica, camisaria, cesta de café, marmita — não
 * tinha como dizer que uma unidade vendida gasta três de outra coisa. O
 * estoque da caneca estampada baixava; o do transfer, nunca. O resultado
 * aparecia no pior momento: no meio de um pedido, com o material acabado e o
 * sistema jurando que havia.
 *
 * Com a receita cadastrada, a venda faz duas coisas: baixa a peça pronta e
 * baixa o material. E, antes disso, a venda de um produto sem material é
 * RECUSADA — mesmo que haja peças prontas de menos para atender.
 *
 * ---------------------------------------------------------------------------
 * O que "Rende" quer dizer
 * ---------------------------------------------------------------------------
 * Quantas unidades DESTE produto ainda dá para montar com o saldo daquele
 * insumo. É a resposta acionável: "dá para 3" diz o que comprar; "há 12 de
 * transfer" obriga quem lê a fazer a divisão de cabeça.
 */

type Props = {
  produtoId: string;
  insumos: Insumo[];
  /** Onde ESTE produto é usado como insumo de outros — o caminho inverso. */
  usadoEm: { produtoId: string; produtoNome: string; quantidade: number }[];
  /** Catálogo para escolher o insumo. */
  produtos: ProductType[];
  onMudou: () => Promise<void> | void;
  onAbrirProduto: (produtoId: string) => void;
};

const InsumosPainel = ({ produtoId, insumos, usadoEm, produtos, onMudou, onAbrirProduto }: Props) => {
  const alert = useAlert();

  const [insumoId, setInsumoId] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [salvando, setSalvando] = useState(false);

  /*
   * O próprio produto sai da lista, e os já cadastrados também.
   *
   * Um produto não pode ser insumo de si mesmo (a API recusa, mas oferecer a
   * opção é convidar ao erro), e repetir um insumo faria a receita somar
   * errado — a API também recusa, com uma mensagem de índice único que não
   * explica nada a quem só escolheu duas vezes o mesmo item.
   */
  const disponiveis = useMemo(() => {
    const usados = new Set(insumos.map((i) => i.insumoId));

    return produtos
      .filter((p) => String(p.id) !== String(produtoId) && !usados.has(String(p.id)))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [produtos, insumos, produtoId]);

  const adicionar = async () => {
    if (!insumoId) return;

    const quanto = Number(quantidade);

    if (!Number.isFinite(quanto) || quanto <= 0) {
      alert.error("Quantidade inválida", "Informe quanto deste material cada unidade consome.");
      return;
    }

    setSalvando(true);
    try {
      await EstoqueService.salvarInsumo(produtoId, { insumoId, quantidade: quanto });
      await onMudou();
      setInsumoId("");
      setQuantidade("1");
      alert.success("Insumo adicionado!", "");
    } catch (err) {
      alert.error(getErrorTitle(err), extractErrorMessage(err, "Não foi possível adicionar o insumo."));
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (insumo: Insumo) => {
    const { confirmed } = await alert.confirm(
      `Tirar ${insumo.insumoNome} da receita?`,
      "As vendas deste produto deixam de baixar esse material.",
      { type: "warning", confirmText: "Tirar" },
    );

    if (!confirmed) return;

    try {
      await EstoqueService.excluirInsumo(insumo.id);
      await onMudou();
      alert.success("Removido.", "");
    } catch (err) {
      alert.error(getErrorTitle(err), extractErrorMessage(err, "Não foi possível remover."));
    }
  };

  /** O insumo mais apertado é o que define quantas unidades saem. */
  const gargalo = insumos
    .filter((i) => i.insumoControlaEstoque && i.rendimento != null)
    .sort((a, b) => (a.rendimento ?? 0) - (b.rendimento ?? 0))[0];

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-fg/[0.07] px-5 py-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/[0.14] text-accent-soft ring-1 ring-inset ring-accent/20">
          <Blocks className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[13px] text-ink">Insumos</h2>
          <p className="text-[11px] text-faint">
            {insumos.length === 0
              ? "O que este item consome para ficar pronto"
              : gargalo
                ? `Dá para montar ${formatNumber(gargalo.rendimento ?? 0)} — limitado por ${gargalo.insumoNome}`
                : `${insumos.length} ${insumos.length === 1 ? "material" : "materiais"}`}
          </p>
        </div>
      </div>

      {insumos.length > 0 && (
        <div className="flex flex-col divide-y divide-fg/[0.05]">
          {insumos.map((insumo) => {
            const acabando = insumo.insumoControlaEstoque && (insumo.rendimento ?? 0) <= 0;

            return (
              <div key={insumo.id} className="flex items-center gap-3 px-5 py-2.5">
                <button
                  type="button"
                  onClick={() => onAbrirProduto(insumo.insumoId)}
                  className="focus-ring min-w-0 flex-1 cursor-pointer text-left"
                  title="Abrir a ficha deste material"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[12.5px] text-ink">{insumo.insumoNome}</span>
                    {acabando && <AlertTriangle size={12} className="shrink-0 text-danger" />}
                  </span>
                  <span className="block text-[10.5px] text-faint">
                    há {formatNumber(insumo.insumoQuantidadeAtual ?? 0)} {insumo.insumoUnidade || "un"}
                  </span>
                </button>

                <span className="shrink-0 text-[11.5px] text-mist">
                  <span className="tabular-nums">{formatNumber(insumo.quantidade)}</span> {insumo.insumoUnidade || "un"} por unidade
                </span>

                <span className={`w-[92px] shrink-0 text-right text-[12px] tabular-nums ${acabando ? "text-danger" : "text-mist"}`}>
                  {insumo.insumoControlaEstoque && insumo.rendimento != null ? `rende ${formatNumber(insumo.rendimento)}` : "—"}
                </span>

                <button type="button" onClick={() => void remover(insumo)} title="Tirar da receita" className="focus-ring shrink-0 cursor-pointer rounded-md p-1.5 text-muted transition-colors hover:text-danger">
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Adicionar */}
      <div className="flex flex-wrap items-end gap-2 border-t border-fg/[0.06] px-5 py-3">
        <div className="flex min-w-[160px] flex-1 flex-col">
          <label htmlFor="novo-insumo" className="mb-1.5 text-[11px] uppercase tracking-[0.08em] text-faint">Material</label>
          <div className="glass-subtle flex items-center rounded-lg border-fg/[0.09] px-3 focus-within:border-accent/60">
            <select
              id="novo-insumo"
              value={insumoId}
              onChange={(e) => setInsumoId(e.target.value)}
              className="w-full min-w-0 flex-1 cursor-pointer appearance-none bg-transparent py-2.5 text-sm text-ink outline-none [&>option]:bg-surface"
            >
              <option value="">Escolha um produto…</option>
              {disponiveis.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>{p.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex w-[120px] flex-col">
          <label htmlFor="qtd-insumo" className="mb-1.5 text-[11px] uppercase tracking-[0.08em] text-faint">Consome</label>
          <div className="glass-subtle flex items-center rounded-lg border-fg/[0.09] px-3 focus-within:border-accent/60">
            <input
              id="qtd-insumo"
              type="number"
              min="0"
              /* `step="any"` porque insumo raramente é inteiro: 0,15 litro de
                 tinta, 0,3 metro de tecido. Com o passo padrão de 1, o
                 navegador recusa a vírgula e o campo fica inválido sem dizer
                 por quê. */
              step="any"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="w-full min-w-0 flex-1 bg-transparent py-2.5 text-sm tabular-nums text-ink outline-none"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => void adicionar()}
          disabled={salvando || !insumoId}
          className="focus-ring mb-[1px] inline-flex h-[42px] shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 text-[12.5px] text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {salvando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Adicionar
        </button>
      </div>

      {/* O caminho inverso: onde este produto é usado. */}
      {usadoEm.length > 0 && (
        <div className="border-t border-fg/[0.06] px-5 py-3">
          <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-faint">Usado como insumo em</p>
          <div className="flex flex-wrap gap-1.5">
            {usadoEm.map((uso) => (
              <button
                key={uso.produtoId}
                type="button"
                onClick={() => onAbrirProduto(uso.produtoId)}
                className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-fg/[0.1] bg-fg/[0.03] px-2.5 py-1 text-[11.5px] text-mist transition-colors hover:text-ink"
              >
                {uso.produtoNome}
                <span className="text-[10px] text-faint">{formatNumber(uso.quantidade)}×</span>
                <ArrowRight size={11} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InsumosPainel;
