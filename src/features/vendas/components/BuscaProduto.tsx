import { useMemo, useState } from "react";
import { PackageSearch, Plus, Loader2 } from "lucide-react";

import ProductType from "@/shared/domain/produto";
import { formatCurrency } from "@/shared/utils/currency";

/**
 * Busca de produtos embutida no corpo da nota (e no orçamento).
 *
 * Substitui o modal de "Adicionar produto": quem opera digita e vê o produto na
 * hora, sem trocar de tela. Uma decisão de comportamento: a busca NÃO limpa ao
 * adicionar — no balcão a mesma venda leva três garrafas do mesmo refrigerante,
 * e limpar obrigaria redigitar para cada uma.
 */
type Props = {
  produtos: ProductType[];
  carregando?: boolean;
  onAdicionar: (produto: ProductType) => void;
};

const BuscaProduto = ({ produtos, carregando = false, onAdicionar }: Props) => {
  const [busca, setBusca] = useState("");

  const sugestoes = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return [];
    return produtos.filter((p) => p.nome?.toLowerCase().includes(termo)).slice(0, 8);
  }, [produtos, busca]);

  const adicionarPrimeiro = () => {
    if (sugestoes[0]) onAdicionar(sugestoes[0]);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2.5 rounded-xl border border-fg/[0.08] bg-fg/[0.03] px-3 transition-colors focus-within:border-accent/60">
        <PackageSearch size={15} className="shrink-0 text-muted" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionarPrimeiro();
            }
          }}
          placeholder="Buscar produto para adicionar…"
          className="w-full flex-1 bg-transparent py-2.5 text-[13px] text-ink outline-none placeholder:text-faint"
        />
        {busca && <button type="button" onClick={() => setBusca("")} className="shrink-0 text-[11px] text-faint hover:text-ink">Limpar</button>}
      </div>

      {carregando ? (
        <div className="mt-1.5 flex items-center gap-2 px-3 py-2 text-[12px] text-faint">
          <Loader2 size={13} className="animate-spin" /> Carregando produtos…
        </div>
      ) : busca.trim() && sugestoes.length === 0 ? (
        <p className="mt-1.5 px-3 py-2 text-[12px] text-faint">Nenhum produto encontrado.</p>
      ) : sugestoes.length > 0 ? (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-xl border border-fg/[0.1] bg-surface shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)]">
          {sugestoes.map((p) => (
            <li key={String(p.id)}>
              <button
                type="button"
                onClick={() => onAdicionar(p)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-fg/[0.06]"
              >
                <span className="min-w-0 truncate text-[13px] text-ink">{p.nome}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-[12px] tabular-nums text-mist">{formatCurrency(Number(p.valorVenda) || 0)}</span>
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-success/15 text-success">
                    <Plus size={13} />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

export default BuscaProduto;
