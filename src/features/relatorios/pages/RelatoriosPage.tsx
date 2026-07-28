import { useEffect, useMemo, useState } from "react";
import { FileText, Printer, CalendarRange } from "lucide-react";

import HeaderPage from "@/shared/ui/HeaderPage";
import { PageBody, PageToolbar, PrimaryAction } from "@/shared/ui/PageShell";
import { SelectBox } from "@/shared/ui/form/FormKit";

import useVendaStore from "@/features/vendas/store/venda.store";
import useClienteStore from "@/features/clientes/store/cliente.store";
import useProdutoStore, { stockLevel } from "@/features/estoque/store/produto.store";
import useEnterprise from "@/features/empresa/store/enterprise.store";

import { estaAberto, estaCancelado, estaFechado, totalDoPedido, type PedidoClienteType } from "@/shared/domain/pedido";
import { formatCurrency } from "@/shared/utils/currency";
import { formatDate, formatDateTime } from "@/shared/utils/date";
import { formatDocument, formatNumber } from "@/shared/utils/format";
import ProductType from "@/shared/domain/produto";

import { FolhaA4, FolhaHeader, FolhaKpis, FolhaTabela, FolhaTotais, FolhaFooter, type Coluna } from "@/features/relatorios/components/FolhaA4";

/* ─────────────────────────────── Período ─────────────────────────────── */

type PeriodoId = "hoje" | "semana" | "mes" | "ano" | "tudo";

const PERIODOS: { id: PeriodoId; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "semana", label: "Últimos 7 dias" },
  { id: "mes", label: "Este mês" },
  { id: "ano", label: "Este ano" },
  { id: "tudo", label: "Todo o período" },
];

const inicioDoPeriodo = (id: PeriodoId): Date | null => {
  const agora = new Date();
  const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

  switch (id) {
    case "hoje":
      return d;
    case "semana":
      return new Date(d.getTime() - 6 * 24 * 60 * 60 * 1000);
    case "mes":
      return new Date(agora.getFullYear(), agora.getMonth(), 1);
    case "ano":
      return new Date(agora.getFullYear(), 0, 1);
    case "tudo":
      return null;
  }
};

const rotuloPeriodo = (id: PeriodoId): string => {
  const inicio = inicioDoPeriodo(id);
  if (!inicio) return "Todo o período";
  return `${formatDate(inicio)} a ${formatDate(new Date())}`;
};

type TipoId = "vendas" | "recebiveis" | "clientes" | "estoque";

const TIPOS: { id: TipoId; label: string }[] = [
  { id: "vendas", label: "Vendas" },
  { id: "recebiveis", label: "Contas a receber" },
  { id: "clientes", label: "Clientes" },
  { id: "estoque", label: "Estoque" },
];

/* ──────────────────────────────── Página ────────────────────────────────── */

const RelatoriosPage = () => {
  const [periodo, setPeriodo] = useState<PeriodoId>("mes");
  const [tipo, setTipo] = useState<TipoId>("vendas");

  const vendas = useVendaStore((s) => s.vendas);
  const fetchVendas = useVendaStore((s) => s.fetchVendas);
  const clientes = useClienteStore((s) => s.clientes);
  const fetchClientes = useClienteStore((s) => s.fetchClientes);
  const produtos = useProdutoStore((s) => s.produtos);
  const fetchProdutos = useProdutoStore((s) => s.fetchProdutos);
  const { enterprise } = useEnterprise();

  useEffect(() => {
    fetchVendas();
    fetchClientes();
    fetchProdutos();
  }, [fetchVendas, fetchClientes, fetchProdutos]);

  const vendasPeriodo = useMemo(() => {
    const inicio = inicioDoPeriodo(periodo);
    const base = vendas.filter((v) => !estaCancelado(v));
    if (!inicio) return base;
    return base.filter((v) => new Date(v.pedido.dataPedido) >= inicio);
  }, [vendas, periodo]);

  const totais = useMemo(() => {
    const faturado = vendasPeriodo.reduce((acc, v) => acc + totalDoPedido(v), 0);
    const recebido = vendasPeriodo.filter(estaFechado).reduce((acc, v) => acc + totalDoPedido(v), 0);
    return {
      faturado,
      recebido,
      aReceber: Math.max(faturado - recebido, 0),
      ticket: vendasPeriodo.length ? faturado / vendasPeriodo.length : 0,
      quantidade: vendasPeriodo.length,
    };
  }, [vendasPeriodo]);

  const colVendas: Coluna<PedidoClienteType>[] = [
    { header: "Data", cell: (v) => formatDate(v.pedido.dataPedido), width: "18%" },
    { header: "Cliente", cell: (v) => v.nomeCliente, width: "40%" },
    { header: "Status", cell: (v) => (estaAberto(v) ? "Em aberto" : "Pago"), width: "18%" },
    { header: "Total", cell: (v) => formatCurrency(totalDoPedido(v)), align: "right", width: "24%" },
  ];

  const colEstoque: Coluna<ProductType>[] = [
    { header: "Produto", cell: (p) => p.nome, width: "46%" },
    { header: "Situação", cell: (p) => ({ disponivel: "Em estoque", baixo: "Baixo", esgotado: "Esgotado" })[stockLevel(p.quantidade)], width: "18%" },
    { header: "Qtd.", cell: (p) => formatNumber(p.quantidade ?? 0), align: "right", width: "12%" },
    { header: "Custo total", cell: (p) => formatCurrency((p.valorCompra ?? 0) * (p.quantidade ?? 0)), align: "right", width: "24%" },
  ];

  type LinhaCliente = { nome: string; pedidos: number; total: number };

  const colClientes: Coluna<LinhaCliente>[] = [
    { header: "Cliente", cell: (c) => c.nome, width: "54%" },
    { header: "Pedidos", cell: (c) => formatNumber(c.pedidos), align: "right", width: "20%" },
    { header: "Total", cell: (c) => formatCurrency(c.total), align: "right", width: "26%" },
  ];

  const porCliente = useMemo(() => {
    const mapa = new Map<string, { nome: string; pedidos: number; total: number }>();
    vendasPeriodo.forEach((v) => {
      const atual = mapa.get(v.clienteId) ?? { nome: v.nomeCliente, pedidos: 0, total: 0 };
      atual.pedidos += 1;
      atual.total += totalDoPedido(v);
      mapa.set(v.clienteId, atual);
    });
    return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
  }, [vendasPeriodo]);

  const emAberto = useMemo(() => vendasPeriodo.filter(estaAberto), [vendasPeriodo]);

  const tituloRelatorio = TIPOS.find((t) => t.id === tipo)?.label ?? "Relatório";

  return (
    <div className="aurora relative flex h-full w-full flex-col overflow-hidden text-ink">
      <div className="no-print contents">
        <HeaderPage icon={<FileText className="h-5 w-5" />} title="Relatórios" subtitle="Escolha o período, confira a prévia e imprima em A4" />
      </div>

      <PageBody scroll>
        <PageToolbar
          className="no-print"
          left={
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-[190px]">
                <SelectBox label="Período" icon={<CalendarRange size={15} />} value={periodo} onChange={(e) => setPeriodo(e.target.value as PeriodoId)}>
                  {PERIODOS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </SelectBox>
              </div>
              <div className="w-[190px]">
                <SelectBox label="Relatório" icon={<FileText size={15} />} value={tipo} onChange={(e) => setTipo(e.target.value as TipoId)}>
                  {TIPOS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </SelectBox>
              </div>
            </div>
          }
        >
          <PrimaryAction icon={<Printer className="h-4 w-4" />} onClick={() => window.print()}>
            Imprimir / PDF
          </PrimaryAction>
        </PageToolbar>

        {/* Prévia da folha */}
        <div className="area-impressao flex justify-center pb-6">
          <FolhaA4>
            <FolhaHeader empresa={enterprise?.nomeFantasia ?? "Sua Empresa"} documento={enterprise?.cpfCnpj ? formatDocument(enterprise.cpfCnpj) : undefined} titulo={tituloRelatorio} periodo={rotuloPeriodo(periodo)} logo={enterprise?.urlLogo} />

            {tipo === "vendas" && (
              <>
                <FolhaKpis
                  itens={[
                    { label: "Faturado", valor: formatCurrency(totais.faturado) },
                    { label: "Recebido", valor: formatCurrency(totais.recebido) },
                    { label: "A receber", valor: formatCurrency(totais.aReceber) },
                    { label: "Vendas", valor: formatNumber(totais.quantidade) },
                  ]}
                />
                <FolhaTabela titulo="Vendas do período" colunas={colVendas} linhas={vendasPeriodo} />
                <FolhaTotais
                  itens={[
                    { label: "Ticket médio", valor: formatCurrency(totais.ticket) },
                    { label: "Recebido", valor: formatCurrency(totais.recebido) },
                    { label: "Total faturado", valor: formatCurrency(totais.faturado), destaque: true },
                  ]}
                />
              </>
            )}

            {tipo === "recebiveis" && (
              <>
                <FolhaKpis
                  itens={[
                    { label: "Notas em aberto", valor: formatNumber(emAberto.length) },
                    { label: "Total a receber", valor: formatCurrency(totais.aReceber) },
                    { label: "Já recebido", valor: formatCurrency(totais.recebido) },
                    { label: "Faturado", valor: formatCurrency(totais.faturado) },
                  ]}
                />
                <FolhaTabela titulo="Contas a receber" colunas={colVendas} linhas={emAberto} vazio="Nenhuma conta em aberto no período." />
                <FolhaTotais itens={[{ label: "Total a receber", valor: formatCurrency(emAberto.reduce((a, v) => a + totalDoPedido(v), 0)), destaque: true }]} />
              </>
            )}

            {tipo === "clientes" && (
              <>
                <FolhaKpis
                  itens={[
                    { label: "Clientes ativos", valor: formatNumber(porCliente.length) },
                    { label: "Base total", valor: formatNumber(clientes.length) },
                    { label: "Faturado", valor: formatCurrency(totais.faturado) },
                    { label: "Ticket médio", valor: formatCurrency(totais.ticket) },
                  ]}
                />
                <FolhaTabela titulo="Faturamento por cliente" colunas={colClientes} linhas={porCliente} vazio="Nenhum cliente comprou no período." />
                <FolhaTotais itens={[{ label: "Total geral", valor: formatCurrency(porCliente.reduce((a, c) => a + c.total, 0)), destaque: true }]} />
              </>
            )}

            {tipo === "estoque" && (
              <>
                <FolhaKpis
                  itens={[
                    { label: "Produtos", valor: formatNumber(produtos.length) },
                    { label: "Unidades", valor: formatNumber(produtos.reduce((a, p) => a + (p.quantidade ?? 0), 0)) },
                    { label: "Baixo/esgotado", valor: formatNumber(produtos.filter((p) => stockLevel(p.quantidade) !== "disponivel").length) },
                    { label: "Valor em estoque", valor: formatCurrency(produtos.reduce((a, p) => a + (p.valorCompra ?? 0) * (p.quantidade ?? 0), 0)) },
                  ]}
                />
                <FolhaTabela titulo="Posição de estoque" colunas={colEstoque} linhas={produtos} vazio="Nenhum produto cadastrado." />
                <FolhaTotais itens={[{ label: "Valor total em estoque", valor: formatCurrency(produtos.reduce((a, p) => a + (p.valorCompra ?? 0) * (p.quantidade ?? 0), 0)), destaque: true }]} />
              </>
            )}

            <FolhaFooter emitidoEm={formatDateTime(new Date())} />
          </FolhaA4>
        </div>
      </PageBody>
    </div>
  );
};

export default RelatoriosPage;
