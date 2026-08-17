import { useState } from "react";
import { Plus, Trash2, Loader2, Palette, Type, ChevronLeft, ChevronRight } from "lucide-react";

import type { Atributo, AtributoValor } from "@/shared/domain/estoque";
import EstoqueService from "@/features/estoque/services/estoque.service";
import { useAlert } from "@/shared/ui/Alert";
import { extractErrorMessage, getErrorTitle } from "@/shared/utils/errorHandler";

/**
 * Onde a empresa define os eixos de variação dos seus produtos.
 *
 * ---------------------------------------------------------------------------
 * Por que esta tela existe
 * ---------------------------------------------------------------------------
 * Antes a lista de tamanhos vinha de uma constante no código: ROUPA
 * (PP..XGG), CALCADO (33..46) e VOLUME (50ml..5kg). Servia a uma loja de roupa
 * e a nenhuma outra — quem vende tinta precisa de "3,6L" e quem vende parafuso
 * precisa de "M6", e nenhum dos dois podia acrescentar um valor sem alguém
 * publicar uma versão nova do sistema.
 *
 * Aqui a empresa cria "Tamanho", "Cor", "Voltagem", "Sabor" — o que ela
 * vender — e os valores de cada um.
 *
 * ---------------------------------------------------------------------------
 * Por que a ORDEM é editável e não alfabética
 * ---------------------------------------------------------------------------
 * Alfabética poria G antes de M e GG antes de P. A ordem que importa é a de
 * quem vende, e só ela sabe qual é.
 */

type Props = {
  atributos: Atributo[];
  /** Recarrega a ficha — a lista vem da API, não de estado local. */
  onMudou: () => Promise<void> | void;
};

const AtributosPainel = ({ atributos, onMudou }: Props) => {
  const alert = useAlert();

  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState<"TEXTO" | "COR">("TEXTO");
  const [salvando, setSalvando] = useState(false);

  /* Um campo de texto por atributo, e não um só compartilhado: com um campo
     único, digitar "Azul" e clicar no "+" do atributo errado é um erro que a
     tela convida a cometer. */
  const [rascunho, setRascunho] = useState<Record<string, string>>({});

  /**
   * Roda a ação, recarrega a ficha e avisa — e devolve se deu certo.
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

  const criarAtributo = async () => {
    const nome = novoNome.trim();
    if (!nome) return;

    const ok = await executar(
      () => EstoqueService.salvarAtributo({ nome, tipo: novoTipo, ordem: atributos.length }),
      "Atributo criado!",
    );

    if (ok) setNovoNome("");
  };

  const criarValor = async (atributo: Atributo) => {
    const valor = (rascunho[atributo.id] ?? "").trim();
    if (!valor) return;

    const ok = await executar(
      () => EstoqueService.salvarValor(atributo.id, { valor, ordem: atributo.valores.length }),
      "Valor adicionado!",
    );

    if (ok) setRascunho((r) => ({ ...r, [atributo.id]: "" }));
  };

  /**
   * Move um valor uma posição para o lado.
   *
   * ---------------------------------------------------------------------
   * Por que isto precisa existir
   * ---------------------------------------------------------------------
   * A ordem dos valores é a ordem de EXIBIÇÃO, em toda tela que mostra
   * variação. Sem poder mexer nela, a lista sai em ordem alfabética — e
   * alfabética para tamanho é: G, GG, M, P, PP, XG. Não existe loja em que
   * essa sequência faça sentido.
   *
   * Os tamanhos que vieram do cadastro antigo (migration 044) entraram todos
   * com `ordem = 0`, justamente porque não havia como o script adivinhar a
   * intenção de cada empresa. É aqui que ela é informada.
   *
   * ---------------------------------------------------------------------
   * Por que grava a lista inteira, e não só os dois que trocaram
   * ---------------------------------------------------------------------
   * Quando várias linhas empatam em `ordem` (o caso dos migrados, todos em
   * zero), trocar o número de duas delas não muda nada: o desempate continua
   * sendo alfabético e a peça "volta" sozinha para o lugar de onde saiu — que
   * parece um botão quebrado. Reescrever a posição de todas dá a cada uma um
   * valor distinto e o primeiro arrasto já vale. As listas são curtas (uma
   * grade de tamanhos tem sete itens), então é uma rajada pequena e só na
   * primeira vez.
   */
  const moverValor = async (atributo: Atributo, indice: number, direcao: -1 | 1) => {
    const destino = indice + direcao;

    if (destino < 0 || destino >= atributo.valores.length) return;

    const nova = [...atributo.valores];
    [nova[indice], nova[destino]] = [nova[destino], nova[indice]];

    setSalvando(true);
    try {
      /* Só o que de fato mudou de posição vai ao servidor. */
      const mexidos = nova
        .map((valor, posicao) => ({ valor, posicao }))
        .filter(({ valor, posicao }) => valor.ordem !== posicao);

      for (const { valor, posicao } of mexidos) {
        await EstoqueService.salvarValor(atributo.id, {
          id: valor.id,
          valor: valor.valor,
          corHex: valor.corHex,
          ordem: posicao,
        });
      }

      await onMudou();
    } catch (err) {
      alert.error(getErrorTitle(err), extractErrorMessage(err, "Não foi possível reordenar."));
    } finally {
      setSalvando(false);
    }
  };

  const excluirAtributo = async (atributo: Atributo) => {
    /*
     * O aviso diz o que ACONTECE, não "tem certeza?".
     *
     * Apagar um atributo apaga os valores dele e o vínculo com as variações —
     * as variações sobrevivem, mas perdem o rótulo. Quem clica precisa saber
     * disso antes, não descobrir vendo "/" no lugar de "M / Azul".
     */
    const { confirmed } = await alert.confirm(
      `Excluir "${atributo.nome}"?`,
      "Os valores somem junto, e as variações que os usavam ficam sem esse rótulo.",
      { type: "warning", confirmText: "Excluir" },
    );

    if (!confirmed) return;

    void executar(() => EstoqueService.excluirAtributo(atributo.id), "Atributo excluído.");
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Criar atributo */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-fg/[0.07] bg-fg/[0.02] p-2.5">
        <input
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void criarAtributo(); } }}
          placeholder="Tamanho, Cor, Voltagem…"
          aria-label="Nome do novo atributo"
          className="min-w-[140px] flex-1 rounded-lg border border-fg/[0.09] bg-transparent px-3 py-2 text-[13px] text-ink outline-none transition-colors focus:border-accent/60 placeholder:text-faint"
        />

        {/* Tipo é só exibição: COR desenha bolinha, TEXTO desenha o rótulo. */}
        <div className="flex items-center gap-1 rounded-lg border border-fg/[0.07] bg-fg/[0.03] p-1">
          {([["TEXTO", <Type key="t" size={13} />], ["COR", <Palette key="c" size={13} />]] as const).map(([valor, icone]) => (
            <button
              key={valor}
              type="button"
              onClick={() => setNovoTipo(valor)}
              aria-pressed={novoTipo === valor}
              title={valor === "COR" ? "Mostra uma bolinha colorida" : "Mostra o texto"}
              className={`focus-ring cursor-pointer rounded-md px-2.5 py-1.5 text-[11.5px] transition-colors ${novoTipo === valor ? "bg-accent text-white" : "text-mist hover:text-ink"}`}
            >
              <span className="flex items-center gap-1.5">{icone} {valor === "COR" ? "Cor" : "Texto"}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void criarAtributo()}
          disabled={salvando || !novoNome.trim()}
          className="focus-ring inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[12.5px] text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {salvando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Criar
        </button>
      </div>

      {atributos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-fg/[0.1] px-3 py-6 text-center text-[12px] text-faint">
          Nenhum atributo ainda. Crie “Tamanho” ou “Cor” para poder montar variações do mesmo produto.
        </p>
      ) : (
        atributos.map((atributo) => (
          <div key={atributo.id} className="rounded-lg border border-fg/[0.07]">
            <div className="flex items-center gap-2 border-b border-fg/[0.06] px-3 py-2">
              <span className="flex-1 text-[12.5px] text-ink">{atributo.nome}</span>
              <span className="text-[10.5px] text-faint">
                {atributo.valores.length} {atributo.valores.length === 1 ? "valor" : "valores"}
                {/* A dica só aparece quando há o que ordenar. Sem ela, a
                    sequência alfabética dos tamanhos herdados do cadastro
                    antigo (G, GG, M, P…) parece defeito, e não configuração
                    pendente. */}
                {atributo.valores.length > 1 && <span className="ml-1.5">· use ‹ › para ordenar</span>}
              </span>
              <button
                type="button"
                onClick={() => excluirAtributo(atributo)}
                title={`Excluir ${atributo.nome}`}
                className="focus-ring cursor-pointer rounded-md p-1.5 text-muted transition-colors hover:text-danger"
              >
                <Trash2 size={13} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 p-2.5">
              {atributo.valores.map((valor: AtributoValor, indice: number) => (
                <span
                  key={valor.id}
                  className="group inline-flex items-center gap-0.5 rounded-full border border-fg/[0.1] bg-fg/[0.04] py-1 pl-2.5 pr-1 text-[11.5px] text-mist"
                >
                  {atributo.tipo === "COR" && (
                    <span
                      aria-hidden
                      className="mr-1 h-3 w-3 shrink-0 rounded-full border border-fg/[0.2]"
                      style={{ background: valor.corHex ?? "transparent" }}
                    />
                  )}
                  <span className="mr-1">{valor.valor}</span>

                  {/* Setas em vez de arrastar: no celular o arrasto disputa com
                      a rolagem da página, e a lista vive dentro de um modal que
                      rola. Duas setas funcionam igual nos dois. */}
                  <button
                    type="button"
                    onClick={() => void moverValor(atributo, indice, -1)}
                    disabled={salvando || indice === 0}
                    title={`Mover ${valor.valor} para a esquerda`}
                    aria-label={`Mover ${valor.valor} para a esquerda`}
                    className="focus-ring cursor-pointer rounded-full p-0.5 text-faint transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-25"
                  >
                    <ChevronLeft size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void moverValor(atributo, indice, 1)}
                    disabled={salvando || indice === atributo.valores.length - 1}
                    title={`Mover ${valor.valor} para a direita`}
                    aria-label={`Mover ${valor.valor} para a direita`}
                    className="focus-ring cursor-pointer rounded-full p-0.5 text-faint transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-25"
                  >
                    <ChevronRight size={11} />
                  </button>

                  <button
                    type="button"
                    onClick={() => void executar(() => EstoqueService.excluirValor(valor.id), "Valor removido.")}
                    title={`Remover ${valor.valor}`}
                    className="focus-ring cursor-pointer rounded-full p-0.5 text-faint transition-colors hover:text-danger"
                  >
                    <Trash2 size={11} />
                  </button>
                </span>
              ))}

              <span className="inline-flex items-center gap-1">
                <input
                  value={rascunho[atributo.id] ?? ""}
                  onChange={(e) => setRascunho((r) => ({ ...r, [atributo.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void criarValor(atributo); } }}
                  placeholder={atributo.tipo === "COR" ? "Azul" : "P, M, G…"}
                  aria-label={`Novo valor para ${atributo.nome}`}
                  className="w-[110px] rounded-full border border-dashed border-fg/[0.14] bg-transparent px-2.5 py-1 text-[11.5px] text-ink outline-none transition-colors focus:border-accent/60 placeholder:text-faint"
                />
                <button
                  type="button"
                  onClick={() => void criarValor(atributo)}
                  disabled={salvando}
                  title="Adicionar valor"
                  className="focus-ring grid h-6 w-6 cursor-pointer place-items-center rounded-full bg-accent/[0.15] text-accent-soft transition-colors hover:bg-accent hover:text-white disabled:opacity-50"
                >
                  <Plus size={12} />
                </button>
              </span>
            </div>

            {/*
              Cor livre, não uma paleta.

              A primeira versão daqui oferecia dez cores fixas. Resolvia o
              caso do "azul" e falhava no primeiro cliente que vende esmalte,
              tinta ou tecido — que trabalha com trinta tons e precisa
              exatamente do dele. O seletor do sistema operacional não tem
              limite e é o mesmo que a pessoa já usa em qualquer outro lugar.
            */}
            {atributo.tipo === "COR" && atributo.valores.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-t border-fg/[0.06] px-2.5 py-2">
                {atributo.valores.map((valor) => (
                  <label
                    key={valor.id}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-fg/[0.03] px-2 py-1 transition-colors hover:bg-fg/[0.06]"
                    title={`Escolher a cor de ${valor.valor}`}
                  >
                    <input
                      type="color"
                      value={valor.corHex ?? "#888888"}
                      /* `onBlur` e não `onChange`: o seletor dispara a cada
                         movimento do cursor dentro dele, e salvar em cada um
                         seriam dezenas de requisições para uma escolha só. O
                         blur acontece quando a pessoa fecha o seletor — ou
                         seja, quando ela decidiu. */
                      onBlur={(e) => void executar(
                        () => EstoqueService.salvarValor(atributo.id, { id: valor.id, valor: valor.valor, corHex: e.target.value, ordem: valor.ordem }),
                        "Cor aplicada.",
                      )}
                      onChange={() => { /* o valor é lido no blur */ }}
                      className="h-5 w-5 cursor-pointer rounded border border-fg/[0.2] bg-transparent p-0"
                      aria-label={`Cor de ${valor.valor}`}
                    />
                    <span className="text-[10.5px] text-mist">{valor.valor}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default AtributosPainel;
