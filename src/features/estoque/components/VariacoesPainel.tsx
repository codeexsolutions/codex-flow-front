import { useMemo, useState } from "react";
import { Plus, Trash2, Loader2, Layers, PackageX, Pencil, Wand2 } from "lucide-react";

import type { Atributo, Variacao, VariacaoInput } from "@/shared/domain/estoque";
import EstoqueService from "@/features/estoque/services/estoque.service";
import { Modal } from "@/shared/ui/Modal";
import { Form, FormGrid, TextField, CurrencyField, FormActions, SwitchField } from "@/shared/ui/form/FormKit";
import UploadImagem from "@/shared/ui/UploadImagem";
import { useAlert } from "@/shared/ui/Alert";
import { extractErrorMessage, getErrorTitle } from "@/shared/utils/errorHandler";
import { formatCurrency } from "@/shared/utils/currency";
import { formatNumber } from "@/shared/utils/format";

/**
 * As variações do produto — a peça que de fato se conta e se vende.
 *
 * ---------------------------------------------------------------------------
 * O problema que isto resolve
 * ---------------------------------------------------------------------------
 * Quem vende camiseta em 5 tamanhos e 4 cores cadastrava 20 produtos, com o
 * tamanho escrito no nome ("Camiseta preta P"). O relatório de mais vendidos
 * mostrava 20 linhas do mesmo produto e ninguém conseguia somar quanto a
 * camiseta vendeu — nem saber quantas há no total sem contar na mão.
 *
 * Aqui é UM produto com N variações. Cada uma tem estoque, preço e foto
 * próprios; o produto soma tudo sozinho (o banco mantém a soma).
 *
 * ---------------------------------------------------------------------------
 * Por que o preço da variação pode ficar vazio
 * ---------------------------------------------------------------------------
 * Vazio = herda do produto, que é o caso comum (a camiseta custa o mesmo em P
 * e em M). Preencher obrigatoriamente faria repetir o mesmo número em vinte
 * linhas — e, quando o preço mudasse, mudar vinte. Zero NÃO serve como
 * "herda": zero é um preço válido (brinde, amostra).
 */

type Props = {
  produtoId: string;
  /** Preço do produto — mostrado como o valor herdado quando a variação não tem. */
  valorVendaProduto: number;
  variacoes: Variacao[];
  atributos: Atributo[];
  onMudou: () => Promise<void> | void;
};

type Rascunho = {
  id?: string;
  /** atributoId → valorId. */
  escolhas: Record<string, string>;
  quantidade: string;
  valorVenda: number | null;
  valorCompra: number | null;
  sku: string;
  codigoBarras: string;
  imagem: string;
  estoqueMinimo: string;
  ativo: boolean;
};

const VAZIO: Rascunho = {
  escolhas: {},
  quantidade: "0",
  valorVenda: null,
  valorCompra: null,
  sku: "",
  codigoBarras: "",
  imagem: "",
  estoqueMinimo: "",
  ativo: true,
};

/** `""` → `null`, e não `0`. Ver a nota do preço herdado acima. */
const numeroOuNulo = (texto: string): number | null => (texto.trim() === "" ? null : Number(texto) || 0);

const VariacoesPainel = ({ produtoId, valorVendaProduto, variacoes, atributos, onMudou }: Props) => {
  const alert = useAlert();

  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<Rascunho>(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState(false);

  /* Só atributos COM valores entram no formulário: um atributo vazio ocuparia
     uma linha inteira oferecendo apenas "Selecione". */
  const utilizaveis = useMemo(() => atributos.filter((a) => a.valores.length > 0), [atributos]);

  const abrirNova = () => {
    setRascunho(VAZIO);
    setAberto(true);
  };

  const abrirEdicao = (variacao: Variacao) => {
    setRascunho({
      id: variacao.id,
      escolhas: Object.fromEntries(variacao.valores.map((v) => [v.atributoId, v.valorId])),
      quantidade: String(variacao.quantidade ?? 0),
      valorVenda: variacao.valorVenda ?? null,
      valorCompra: variacao.valorCompra ?? null,
      sku: variacao.sku ?? "",
      codigoBarras: variacao.codigoBarras ?? "",
      imagem: variacao.imagem ?? "",
      estoqueMinimo: variacao.estoqueMinimo == null ? "" : String(variacao.estoqueMinimo),
      ativo: variacao.ativo,
    });
    setAberto(true);
  };

  const montarPayload = (): VariacaoInput => ({
    id: rascunho.id,
    valores: Object.entries(rascunho.escolhas)
      .filter(([, valorId]) => Boolean(valorId))
      .map(([atributoId, valorId]) => ({ atributoId, valorId })),
    quantidade: Number(rascunho.quantidade) || 0,
    valorVenda: rascunho.valorVenda,
    valorCompra: rascunho.valorCompra,
    sku: rascunho.sku.trim() || null,
    codigoBarras: rascunho.codigoBarras.trim() || null,
    imagem: rascunho.imagem.trim() || null,
    estoqueMinimo: numeroOuNulo(rascunho.estoqueMinimo),
    ativo: rascunho.ativo,
  });

  const salvar = async () => {
    const payload = montarPayload();

    if (payload.valores.length === 0) {
      alert.error("Falta o essencial", "Escolha ao menos um valor (tamanho, cor…) para identificar esta variação.");
      return;
    }

    setSalvando(true);
    try {
      await EstoqueService.salvarVariacao(produtoId, payload);
      await onMudou();
      setAberto(false);
      alert.success("Variação salva!", "");
    } catch (err) {
      alert.error(getErrorTitle(err), extractErrorMessage(err, "Não foi possível salvar a variação."));
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (variacao: Variacao) => {
    const { confirmed } = await alert.confirm(
      `Remover ${variacao.descricao || "esta variação"}?`,
      "O estoque dela sai do total do produto.",
      { type: "warning", confirmText: "Remover" },
    );

    if (!confirmed) return;

    try {
      const mensagem = await EstoqueService.excluirVariacao(variacao.id);
      await onMudou();
      /* A frase vem do servidor: só ele sabe se a variação sumiu ou apenas
         saiu do estoque por já estar em pedidos. */
      alert.success("Pronto!", mensagem);
    } catch (err) {
      alert.error(getErrorTitle(err), extractErrorMessage(err, "Não foi possível remover."));
    }
  };

  /**
   * Cria todas as combinações que ainda não existem.
   *
   * 5 tamanhos × 4 cores são 20 variações. Cadastradas uma a uma, são 20
   * aberturas de modal para uma tarefa mecânica — e é onde a pessoa desiste do
   * recurso. As que já existem são puladas, então rodar de novo depois de
   * acrescentar uma cor cria só as 5 novas.
   *
   * Zeradas de propósito: quantidade vem da conferência real, não de um chute
   * que o sistema inventou.
   */
  const gerarCombinacoes = async () => {
    if (utilizaveis.length === 0) return;

    const combinacoes = utilizaveis.reduce<Record<string, string>[]>(
      (acc, atributo) => acc.flatMap((parcial) => atributo.valores.map((v) => ({ ...parcial, [atributo.id]: v.id }))),
      [{}],
    );

    /* Assinatura ordenada: a MESMA combinação em ordem diferente tem de bater
       com a existente, senão a geração recria tudo o que já existe e o
       servidor recusa uma por uma. */
    const assinatura = (escolhas: Record<string, string>) => Object.values(escolhas).sort().join("|");
    const existentes = new Set(variacoes.map((v) => v.valores.map((x) => x.valorId).sort().join("|")));

    const novas = combinacoes.filter((c) => !existentes.has(assinatura(c)));

    if (novas.length === 0) {
      alert.info("Nada a criar", "Todas as combinações já existem.");
      return;
    }

    const { confirmed } = await alert.confirm(
      `Criar ${novas.length} ${novas.length === 1 ? "variação" : "variações"}?`,
      "Todas nascem zeradas — a quantidade você lança depois pela entrada de estoque.",
    );

    if (!confirmed) return;

    setGerando(true);
    try {
      for (const escolhas of novas) {
        await EstoqueService.salvarVariacao(produtoId, {
          valores: Object.entries(escolhas).map(([atributoId, valorId]) => ({ atributoId, valorId })),
          quantidade: 0,
          ativo: true,
        });
      }

      await onMudou();
      alert.success("Pronto!", `${novas.length} ${novas.length === 1 ? "variação criada" : "variações criadas"}.`);
    } catch (err) {
      /* Recarrega mesmo com erro: as que passaram antes da falha já existem, e
         a tela não pode continuar mostrando a lista de antes. */
      await onMudou();
      alert.error(getErrorTitle(err), extractErrorMessage(err, "Algumas variações não foram criadas."));
    } finally {
      setGerando(false);
    }
  };

  const total = variacoes.filter((v) => v.ativo).reduce((soma, v) => soma + (Number(v.quantidade) || 0), 0);

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-fg/[0.07] px-5 py-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/[0.14] text-accent-soft ring-1 ring-inset ring-accent/20">
          <Layers className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[13px] text-ink">Variações</h2>
          <p className="text-[11px] text-faint">
            {variacoes.length === 0
              ? "Tamanho, cor, voltagem — cada uma com seu estoque"
              : `${formatNumber(variacoes.length)} ${variacoes.length === 1 ? "variação" : "variações"} · ${formatNumber(total)} un. no total`}
          </p>
        </div>

        {utilizaveis.length > 0 && (
          <button
            type="button"
            onClick={() => void gerarCombinacoes()}
            disabled={gerando}
            title="Cria de uma vez todas as combinações que faltam"
            className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-fg/[0.1] px-2.5 py-1.5 text-[12px] text-mist transition-colors hover:text-ink disabled:opacity-50"
          >
            {gerando ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />} Gerar todas
          </button>
        )}

        <button
          type="button"
          onClick={abrirNova}
          disabled={utilizaveis.length === 0}
          title={utilizaveis.length === 0 ? "Cadastre um atributo com valores primeiro" : "Nova variação"}
          className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-2.5 py-1.5 text-[12px] text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={13} /> Nova
        </button>
      </div>

      {utilizaveis.length === 0 ? (
        <p className="px-5 py-6 text-center text-[12px] text-faint">
          Para criar variações, cadastre antes um atributo com valores — “Tamanho” com P, M, G, por exemplo.
        </p>
      ) : variacoes.length === 0 ? (
        <p className="px-5 py-6 text-center text-[12px] text-faint">
          Nenhuma variação. Enquanto não houver, o estoque é o do produto inteiro.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-fg/[0.05]">
          {variacoes.map((variacao) => (
            <div key={variacao.id} className={`flex items-center gap-3 px-5 py-2.5 ${variacao.ativo ? "" : "opacity-50"}`}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-fg/[0.08] bg-fg/[0.03]">
                {variacao.imagem ? (
                  <img src={variacao.imagem} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Layers className="h-4 w-4 text-muted" />
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex flex-wrap items-center gap-1.5">
                  {variacao.valores.map((valor) => (
                    <span key={valor.valorId} className="inline-flex items-center gap-1 rounded bg-fg/[0.06] px-1.5 py-px text-[11px] text-mist">
                      {valor.corHex && <span aria-hidden className="h-2.5 w-2.5 rounded-full border border-fg/[0.2]" style={{ background: valor.corHex }} />}
                      {valor.valor}
                    </span>
                  ))}
                  {!variacao.ativo && <span className="rounded bg-danger/[0.12] px-1.5 py-px text-[10px] text-danger">inativa</span>}
                </span>
                <span className="truncate text-[10.5px] text-faint">{variacao.sku || "sem SKU"}</span>
              </div>

              <span className="shrink-0 text-right text-[12px] tabular-nums text-mist">
                {formatCurrency(variacao.valorVendaEfetivo ?? valorVendaProduto)}
                {variacao.valorVenda == null && <span className="ml-1 text-[10px] text-faint">herda</span>}
              </span>

              <span className={`w-[70px] shrink-0 text-right text-[12.5px] tabular-nums ${Number(variacao.quantidade) <= 0 ? "text-danger" : "text-ink"}`}>
                {formatNumber(Number(variacao.quantidade) || 0)}
              </span>

              <button type="button" onClick={() => abrirEdicao(variacao)} title="Editar" className="focus-ring shrink-0 cursor-pointer rounded-md p-1.5 text-muted transition-colors hover:text-ink">
                <Pencil size={13} />
              </button>
              <button type="button" onClick={() => void excluir(variacao)} title="Remover" className="focus-ring shrink-0 cursor-pointer rounded-md p-1.5 text-muted transition-colors hover:text-danger">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={aberto}
        onClose={() => setAberto(false)}
        title={rascunho.id ? "Editar variação" : "Nova variação"}
        subtitle="Estoque, preço e foto próprios"
      >
        <Form onSubmit={(e) => { e.preventDefault(); void salvar(); }} className="!gap-3">
          <FormGrid cols={2}>
            {utilizaveis.map((atributo) => (
              <div key={atributo.id} className="flex flex-col">
                <label htmlFor={`attr-${atributo.id}`} className="mb-1.5 block text-[11px] uppercase tracking-[0.08em] text-faint">
                  {atributo.nome}
                </label>
                <div className="glass-subtle flex min-w-0 items-center gap-2 rounded-lg border-fg/[0.09] px-3 transition-all focus-within:border-accent/60">
                  <select
                    id={`attr-${atributo.id}`}
                    value={rascunho.escolhas[atributo.id] ?? ""}
                    onChange={(e) => setRascunho((r) => ({ ...r, escolhas: { ...r.escolhas, [atributo.id]: e.target.value } }))}
                    className="w-full min-w-0 flex-1 cursor-pointer appearance-none bg-transparent py-2.5 pr-6 text-sm text-ink outline-none [&>option]:bg-surface"
                  >
                    <option value="">—</option>
                    {atributo.valores.map((valor) => (
                      <option key={valor.id} value={valor.id}>{valor.valor}</option>
                    ))}
                  </select>
                </div>
                <p className="mt-1 min-h-[14px] text-[10.5px] leading-[14px] text-faint" />
              </div>
            ))}
          </FormGrid>

          <UploadImagem
            tipo="produto"
            rotulo="Foto desta variação"
            valor={rascunho.imagem}
            onChange={(url) => setRascunho((r) => ({ ...r, imagem: url ?? "" }))}
          />

          <FormGrid cols={2}>
            <CurrencyField
              label="Venda"
              hint={rascunho.valorVenda == null ? `Vazio herda ${formatCurrency(valorVendaProduto)}` : undefined}
              value={rascunho.valorVenda ?? 0}
              onValueChange={(v) => setRascunho((r) => ({ ...r, valorVenda: v }))}
            />
            <CurrencyField
              label="Custo"
              value={rascunho.valorCompra ?? 0}
              onValueChange={(v) => setRascunho((r) => ({ ...r, valorCompra: v }))}
            />
          </FormGrid>

          <FormGrid cols={3}>
            <TextField
              label="Quantidade"
              type="number"
              min="0"
              step="any"
              /*
               * Na edição, a quantidade some.
               *
               * Estoque só muda por movimento (entrada/saída/ajuste), que grava
               * o extrato junto. Um campo editável aqui seria a única porta do
               * sistema por onde o saldo muda sem deixar rastro — e o extrato
               * deixaria de bater com o saldo, que é a única coisa que ele
               * precisa fazer.
               */
              disabled={Boolean(rascunho.id)}
              hint={rascunho.id ? "Use entrada/saída para mexer" : "Estoque inicial"}
              value={rascunho.quantidade}
              onChange={(e) => setRascunho((r) => ({ ...r, quantidade: e.target.value }))}
            />
            <TextField
              label="Avisar abaixo de"
              type="number"
              min="0"
              step="any"
              hint="Vazio usa o do produto"
              value={rascunho.estoqueMinimo}
              onChange={(e) => setRascunho((r) => ({ ...r, estoqueMinimo: e.target.value }))}
            />
            <TextField
              label="SKU"
              placeholder="CAM-PRT-M"
              value={rascunho.sku}
              onChange={(e) => setRascunho((r) => ({ ...r, sku: e.target.value }))}
            />
          </FormGrid>

          <TextField
            label="Código de barras"
            placeholder="7891234567890"
            value={rascunho.codigoBarras}
            onChange={(e) => setRascunho((r) => ({ ...r, codigoBarras: e.target.value }))}
          />

          {rascunho.id && (
            <SwitchField
              label="Variação ativa"
              hint="Desligada, ela some do PDV e do total do produto — sem apagar o histórico de vendas."
              checked={rascunho.ativo}
              onChange={(v) => setRascunho((r) => ({ ...r, ativo: v }))}
            />
          )}

          <FormActions onCancel={() => setAberto(false)} saving={salvando} submitText="Salvar variação" />
        </Form>
      </Modal>

      {variacoes.length > 0 && variacoes.every((v) => Number(v.quantidade) <= 0) && (
        <p className="flex items-center gap-2 border-t border-fg/[0.06] px-5 py-2.5 text-[11.5px] text-danger">
          <PackageX size={13} /> Todas as variações estão zeradas — nenhuma venda deste produto vai passar.
        </p>
      )}
    </div>
  );
};

export default VariacoesPainel;
