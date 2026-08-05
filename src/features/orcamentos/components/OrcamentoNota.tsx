import type { LegacyRef } from "react";

import HeaderInterprise from "@/shared/ui/HeaderInterprise";
import FundoNota from "@/shared/ui/FundoNota";
import { formatCurrency } from "@/shared/utils/currency";
import { formatDate } from "@/shared/utils/date";
import { maskPhone } from "@/shared/validation/masks";
import useEnterprise from "@/features/empresa/store/enterprise.store";

import type { Orcamento, StatusOrcamento } from "@/features/orcamentos/services/orcamento.service";

/**
 * O orçamento como o cliente recebe.
 *
 * Mesma linguagem visual da nota de venda (quem recebe reconhece que veio do
 * mesmo sistema), mas com a diferença que importa: diz **ORÇAMENTO** e não
 * "Nota de Venda". Nada de pagamento/Pix aqui — orçamento é proposta, não
 * cobrança.
 *
 * O componente é 100% estático: não há nada editável. É só o que vai para o
 * PNG no download (o botão da linha o rasteriza com `handleDownload`).
 */

const STATUS_LABEL: Record<StatusOrcamento, string> = {
  ABERTO: "Aguardando",
  APROVADO: "Aprovado",
  RECUSADO: "Recusado",
  EXPIRADO: "Expirado",
};

type Props = {
  orcamento: Orcamento;
  /** Quem rasteriza é o botão de download, via `html-to-image`. */
  refNota?: LegacyRef<HTMLDivElement>;
};

const OrcamentoNota = ({ orcamento: o, refNota }: Props) => {
  const subtotal = (i: { quantidade: number; valorUnitario: number; subtotal?: number }) =>
    Number(i.subtotal ?? Number(i.valorUnitario) * Number(i.quantidade));

  const telefone = o.clienteContato ? maskPhone(String(o.clienteContato)) : "";
  const enterprise = useEnterprise((s) => s.enterprise);

  return (
    <div ref={refNota} className="relative flex w-full flex-col overflow-hidden bg-surface">
      <FundoNota imagem={enterprise?.notaBackground} />

      <div className="relative flex flex-col">
      {/* Cabeçalho — empresa à esquerda, ORÇAMENTO à direita */}
      <div className="flex flex-col gap-3 border-b border-fg/[0.05] p-6 md:flex-row md:items-end md:justify-between">
        <HeaderInterprise />
        <div className="md:text-right">
          <h2 className="text-xl leading-none text-ink md:text-2xl">ORÇAMENTO</h2>
          <p className="mt-1.5 text-sm text-mist">Data: {formatDate(o.criadoEm)}</p>
          <p className="mt-0.5 text-[11.5px] uppercase tracking-wide text-faint">Proposta #{o.codigo}</p>
        </div>
      </div>

      {/* Identificação — quem é o cliente, quem fez e até quando vale */}
      <div className="flex flex-col gap-4 px-6 pt-6 sm:flex-row sm:items-start sm:gap-8">
        <dl className="flex min-w-0 flex-1 flex-col gap-3.5">
          {[
            { rotulo: "Cliente", valor: o.clienteNome || "—" },
            { rotulo: "Telefone", valor: telefone || "Não informado" },
            { rotulo: "Vendedor", valor: o.vendedorNome || "—" },
            { rotulo: "Validade", valor: o.validade ? formatDate(o.validade) : "—" },
          ].map((linha) => (
            <div key={linha.rotulo} className="min-w-0">
              <dt className="text-[10.5px] uppercase tracking-[0.1em] text-faint">{linha.rotulo}</dt>
              <dd className="mt-0.5 min-w-0 truncate text-[14.5px] leading-snug text-ink">{linha.valor}</dd>
            </div>
          ))}
        </dl>

        {/* Selo de situação — o que o orçamento está esperando */}
        <div className="shrink-0 sm:w-[176px]">
          <div className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-fg/[0.12] px-3 py-4 text-center">
            <span className="text-[10.5px] uppercase tracking-[0.1em] text-faint">Situação</span>
            <span className="text-[14px] font-medium text-ink">{STATUS_LABEL[o.status] ?? o.status}</span>
            <span className="text-[10.5px] leading-relaxed text-faint">Orçamento não é venda — não baixa estoque e não gera cobrança.</span>
          </div>
        </div>
      </div>

      {/* Tabela de itens */}
      <div className="px-6 pt-6">
        <div className="overflow-hidden rounded-xl border border-fg/[0.06]">
          <table className="w-full text-sm">
            <thead className="bg-surface-raised">
              <tr className="border-b border-fg/[0.06] text-[11px] uppercase tracking-[0.08em] text-faint">
                <td className="px-3 py-2.5 text-left">Produto</td>
                <td className="px-3 py-2.5 text-left">Qtde</td>
                <td className="px-3 py-2.5 text-left">V. Unit</td>
                <td className="px-3 py-2.5 text-left">Subtotal</td>
              </tr>
            </thead>
            <tbody className="divide-y divide-fg/[0.05]">
              {o.itens.length > 0 ? (
                o.itens.map((i, n) => (
                  <tr key={i.id ?? n}>
                    <td className="max-w-[280px] p-2 align-middle">
                      <p className="truncate px-1 text-ink" title={i.nomeProduto}>{i.nomeProduto}</p>
                    </td>
                    <td className="p-2 align-middle">
                      <p className="px-1 tabular-nums text-ink">{Number(i.quantidade)}</p>
                    </td>
                    <td className="p-2 align-middle">
                      <p className="px-1 tabular-nums text-ink">{formatCurrency(Number(i.valorUnitario))}</p>
                    </td>
                    <td className="p-2 align-middle">
                      <p className="px-1 tabular-nums text-ink">{formatCurrency(subtotal(i))}</p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-mist">
                    <p className="text-sm">Nenhum item no orçamento</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Observação, se houver */}
      {o.observacao && (
        <div className="px-6 pt-5">
          <p className="text-[10.5px] uppercase tracking-[0.1em] text-faint">Observação</p>
          <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-mist">{o.observacao}</p>
        </div>
      )}

      {/* Total — o único número que importa para a proposta */}
      <div className="flex justify-end p-6">
        <div className="min-w-[200px] rounded-xl border border-fg/[0.06] bg-fg/[0.03] p-4 text-right">
          <span className="text-[10.5px] uppercase tracking-wide text-faint">Total do orçamento</span>
          <span className="mt-1 block text-2xl tabular-nums text-ink">{formatCurrency(o.total)}</span>
        </div>
      </div>
      </div>
    </div>
  );
};

export default OrcamentoNota;
