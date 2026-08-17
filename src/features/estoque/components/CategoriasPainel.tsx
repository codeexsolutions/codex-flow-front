import { useState } from "react";
import { Plus, Trash2, Loader2, Layers, Package } from "lucide-react";

import type { Categoria } from "@/shared/domain/estoque";
import { SEM_CATEGORIA } from "@/shared/domain/produto";
import EstoqueService from "@/features/estoque/services/estoque.service";
import { useAlert } from "@/shared/ui/Alert";
import { extractErrorMessage, getErrorTitle } from "@/shared/utils/errorHandler";
import { formatNumber } from "@/shared/utils/format";

/**
 * Onde a empresa define as gavetas do próprio catálogo.
 *
 * ---------------------------------------------------------------------------
 * Por que esta tela existe
 * ---------------------------------------------------------------------------
 * A categoria era um campo de texto no cadastro de cada produto. Isso tem três
 * defeitos que só aparecem depois de umas cem linhas de estoque:
 *
 *   • "Bebida", "Bebidas" e "bebidas" são três categorias para o sistema e uma
 *     só para quem vende. O filtro da lista mostrava as três, cada uma com um
 *     pedaço dos produtos — e quem filtrava concluía que a busca estava
 *     quebrada.
 *
 *   • Não havia como corrigir. Trocar "Vestuario" por "Vestuário" significava
 *     reabrir e reeditar produto por produto.
 *
 *   • Não havia como PLANEJAR: criar as gavetas antes de cadastrar o que vai
 *     dentro delas é o jeito natural de organizar um estoque novo, e o campo
 *     de texto só existia depois que já havia um produto.
 *
 * Aqui a categoria é um cadastro: cria-se, renomeia-se e apaga-se — e o rename
 * corrige todos os produtos dela de uma vez (quem faz isso é o banco, pelo
 * gatilho da migration 045).
 *
 * ---------------------------------------------------------------------------
 * Por que "Sem categoria" aparece na lista sem ser uma categoria
 * ---------------------------------------------------------------------------
 * Porque é a resposta que falta. Quem abre esta tela quer saber como o estoque
 * está dividido, e "12 em Bebidas, 4 em Limpeza" esconde os 30 que não estão
 * em lugar nenhum — que são justamente os que pedem trabalho. Ela vem por
 * último, sem botão de apagar nem de renomear: não é um registro, é uma
 * contagem.
 */

type Props = {
  categorias: Categoria[];
  /** Quantos produtos estão sem categoria. Ver a nota do cabeçalho. */
  semCategoria: number;
  /** Recarrega a lista — ela vem da API, não de estado local. */
  onMudou: () => Promise<void> | void;
};

/** O tom de quem nunca escolheu cor. Cinza do tema, não uma cor de verdade. */
const COR_NEUTRA = "#8a8a8a";

const CategoriasPainel = ({ categorias, semCategoria, onMudou }: Props) => {
  const alert = useAlert();

  const [novoNome, setNovoNome] = useState("");
  const [salvando, setSalvando] = useState(false);

  /* Um rascunho de nome por linha, e não um campo compartilhado: com um campo
     único, digitar o nome novo e clicar na linha errada é um erro que a tela
     convida a cometer. Undefined = a linha não está sendo editada. */
  const [rascunho, setRascunho] = useState<Record<string, string>>({});

  /**
   * Roda a ação, recarrega a lista e avisa — e devolve se deu certo.
   *
   * O retorno é o que permite limpar o campo SÓ quando o valor entrou. Limpar
   * antes de saber (ou sempre) apaga o que a pessoa digitou junto com o erro
   * que a impediu de salvar, e ela tem de redigitar para ler a mensagem.
   */
  const executar = async (acao: () => Promise<unknown>, sucesso: string): Promise<boolean> => {
    setSalvando(true);
    try {
      await acao();
      await onMudou();
      alert.success(sucesso, "");
      return true;
    } catch (err) {
      alert.error(getErrorTitle(err), extractErrorMessage(err, "Não foi possível salvar."));
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const criar = async () => {
    const nome = novoNome.trim();
    if (!nome) return;

    const ok = await executar(() => EstoqueService.salvarCategoria({ nome }), "Categoria criada!");

    if (ok) setNovoNome("");
  };

  /** Descarta a edição de nome de uma linha, voltando ao que está gravado. */
  const descartar = (categoriaId: string) =>
    setRascunho((r) => {
      const copia = { ...r };
      delete copia[categoriaId];
      return copia;
    });

  /**
   * Grava o nome novo — e só quando ele mudou de verdade.
   *
   * Sair do campo sem ter alterado nada é o gesto mais comum da tela (clicar
   * fora para fechar o teclado, ir para a próxima linha). Gravar nesses casos
   * dispararia uma requisição e um "salvo!" sobre uma edição que não houve —
   * e o aviso perde o sentido quando aparece sem motivo.
   */
  const renomear = async (categoria: Categoria, digitado: string) => {
    /* O nome vem do CAMPO, e não do rascunho no estado: o Escape reverte o
       valor do input e chama `blur` na mesma linha, e nesse instante o estado
       ainda guarda o texto abandonado — salvar a partir dele gravaria
       justamente a edição que a pessoa acabou de cancelar. */
    const nome = digitado.trim();

    /* Volta ao nome gravado quando o campo foi esvaziado: categoria sem nome
       não existe, e deixar o campo em branco na tela sugeriria que existe. */
    if (!nome || nome === categoria.nome) return descartar(categoria.id);

    const ok = await executar(
      () => EstoqueService.salvarCategoria({ id: categoria.id, nome, cor: categoria.cor }),
      "Categoria renomeada!",
    );

    if (ok) descartar(categoria.id);
  };

  const excluir = async (categoria: Categoria) => {
    const quantos = categoria.quantosProdutos ?? 0;

    /*
     * O aviso diz o que ACONTECE com os produtos, não "tem certeza?".
     *
     * Apagar uma categoria com 12 itens dentro parece — e a palavra "excluir"
     * reforça — que os 12 vão junto. Não vão: eles voltam para "Sem
     * categoria". Quem clica precisa saber disso ANTES, senão desiste de
     * organizar o catálogo com medo de perder produto.
     */
    const { confirmed } = await alert.confirm(
      `Excluir "${categoria.nome}"?`,
      quantos > 0
        ? `${formatNumber(quantos)} ${quantos === 1 ? "produto fica" : "produtos ficam"} sem categoria. Nenhum é apagado.`
        : "Nenhum produto usa esta categoria.",
      { type: "warning", confirmText: "Excluir" },
    );

    if (!confirmed) return;

    void executar(() => EstoqueService.excluirCategoria(categoria.id), "Categoria excluída.");
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Criar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-fg/[0.07] bg-fg/[0.02] p-2.5">
        {/* O cursor já começa aqui: o botão que abre este painel se chama
            "Nova Categoria", então digitar o nome tem de ser a primeira coisa
            possível — não mais um clique depois de o painel aparecer. */}
        <input
          autoFocus
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void criar(); } }}
          placeholder="Bebidas, Vestuário, Limpeza…"
          aria-label="Nome da nova categoria"
          className="min-w-[140px] flex-1 rounded-lg border border-fg/[0.09] bg-transparent px-3 py-2 text-[13px] text-ink outline-none transition-colors focus:border-accent/60 placeholder:text-faint"
        />

        <button
          type="button"
          onClick={() => void criar()}
          disabled={salvando || !novoNome.trim()}
          className="focus-ring inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[12.5px] text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {salvando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Criar
        </button>
      </div>

      {categorias.length === 0 ? (
        <p className="rounded-lg border border-dashed border-fg/[0.1] px-3 py-6 text-center text-[12px] text-faint">
          Nenhuma categoria ainda. Crie “Bebidas” ou “Vestuário” para poder agrupar e filtrar o que você vende.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-fg/[0.05] overflow-hidden rounded-lg border border-fg/[0.07]">
          {categorias.map((categoria) => {
            const quantos = categoria.quantosProdutos ?? 0;

            return (
              <li key={categoria.id} className="flex items-center gap-2 px-2.5 py-2">
                {/*
                  Cor livre, e não uma paleta de dez.
                  Mesma decisão dos atributos: quem vende esmalte ou tinta
                  trabalha com trinta tons e precisa exatamente do dele. O
                  seletor do sistema é o mesmo que a pessoa já usa em todo
                  lugar. `onBlur` porque o seletor dispara a cada movimento do
                  cursor dentro dele — salvar em cada um seriam dezenas de
                  requisições para uma escolha só.
                */}
                <label
                  className="shrink-0 cursor-pointer rounded-md p-1 transition-colors hover:bg-fg/[0.06]"
                  title={`Escolher a cor de ${categoria.nome}`}
                >
                  <input
                    type="color"
                    value={categoria.cor ?? COR_NEUTRA}
                    onBlur={(e) => void executar(
                      () => EstoqueService.salvarCategoria({ id: categoria.id, nome: categoria.nome, cor: e.target.value }),
                      "Cor aplicada.",
                    )}
                    onChange={() => { /* o valor é lido no blur */ }}
                    className="h-4 w-4 cursor-pointer rounded border border-fg/[0.2] bg-transparent p-0"
                    aria-label={`Cor de ${categoria.nome}`}
                  />
                </label>

                {/* O nome é o próprio campo de edição: um botão "renomear" que
                    troca o texto por um input faz duas etapas do que aqui é
                    uma — e a lista é curta o bastante para não haver risco de
                    editar a linha errada sem perceber. */}
                <input
                  value={rascunho[categoria.id] ?? categoria.nome}
                  onChange={(e) => setRascunho((r) => ({ ...r, [categoria.id]: e.target.value }))}
                  onBlur={(e) => void renomear(categoria, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
                    if (e.key === "Escape") {
                      e.currentTarget.value = categoria.nome;
                      descartar(categoria.id);
                      e.currentTarget.blur();
                    }
                  }}
                  disabled={salvando}
                  aria-label={`Nome da categoria ${categoria.nome}`}
                  title="Renomear — corrige todos os produtos desta categoria"
                  className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-[12.5px] text-ink outline-none transition-colors hover:border-fg/[0.1] focus:border-accent/60"
                />

                <span className="shrink-0 whitespace-nowrap text-[11px] tabular-nums text-faint">
                  {formatNumber(quantos)} {quantos === 1 ? "item" : "itens"}
                </span>

                <button
                  type="button"
                  onClick={() => void excluir(categoria)}
                  disabled={salvando}
                  title={`Excluir ${categoria.nome}`}
                  className="focus-ring shrink-0 cursor-pointer rounded-md p-1.5 text-muted transition-colors hover:text-danger disabled:opacity-40"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            );
          })}

          {/* A contagem do que ficou de fora. Ver a nota do cabeçalho sobre por
              que ela aparece aqui sem ser uma categoria. */}
          <li className="flex items-center gap-2 bg-fg/[0.02] px-2.5 py-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center text-muted">
              <Package size={13} />
            </span>
            <span className="min-w-0 flex-1 px-2 text-[12.5px] text-faint">{SEM_CATEGORIA}</span>
            <span className="shrink-0 whitespace-nowrap text-[11px] tabular-nums text-faint">
              {formatNumber(semCategoria)} {semCategoria === 1 ? "item" : "itens"}
            </span>
            {/* Espaço do botão de excluir, para os números ficarem alinhados
                com os das linhas de cima. */}
            <span className="w-[29px] shrink-0" aria-hidden />
          </li>
        </ul>
      )}

      <p className="flex items-start gap-2 text-[11px] leading-[15px] text-faint">
        <Layers size={13} className="mt-px shrink-0" />
        Renomear corrige todos os produtos da categoria de uma vez. Excluir não apaga produto nenhum — eles voltam para “{SEM_CATEGORIA}”.
      </p>
    </div>
  );
};

export default CategoriasPainel;
