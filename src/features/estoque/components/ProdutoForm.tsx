import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Hash, ShoppingBag, Tag, Barcode, Ruler, MapPin, Layers, Bookmark,
  AlertTriangle, Check, Package, Wallet, Boxes,
} from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { calcularGanho, productSchema, type ProductFormData, type ProductFormInput } from "@/features/estoque/schema/product.schema";
import type { Categoria } from "@/shared/domain/estoque";
import { SEM_CATEGORIA } from "@/shared/domain/produto";
import {
  Form, FormGrid, FormSection, TextField, SelectBox, TextArea, CurrencyField,
  FormActions, SwitchField,
} from "@/shared/ui/form/FormKit";
import UploadImagem from "@/shared/ui/UploadImagem";
import { formatCurrency } from "@/shared/utils/currency";
import { useAlert } from "@/shared/ui/Alert";

/**
 * Cadastro do item — produto ou serviço.
 *
 * ---------------------------------------------------------------------------
 * Por que ABAS, e não um formulário só
 * ---------------------------------------------------------------------------
 * A ficha do produto cresceu de cinco campos para quinze (SKU, código de
 * barras, unidade, categoria, marca, localização, estoque mínimo e as duas
 * chaves de regra de estoque). Numa coluna só, isso vira uma escada que só
 * termina rolando — e quem está com o fornecedor na frente descarregando nota
 * olha a pilha e adia o cadastro. É o mesmo problema que a ficha do cliente
 * teve, e a resposta é a mesma.
 *
 * A versão anterior tentou resolver com uma sanfona ("Identificação e
 * organização", fechada por padrão). Resolvia pela metade e criava um
 * problema novo: campo dentro de bloco fechado é campo que ninguém sabe que
 * existe, e um erro de validação lá dentro pedia "revise os campos
 * destacados" sem nada destacado à vista.
 *
 * ---------------------------------------------------------------------------
 * As abas NÃO são um caminho obrigatório
 * ---------------------------------------------------------------------------
 * Não há "Continuar". O botão de cadastrar está disponível desde a primeira
 * aba, porque **só o nome é obrigatório** — preço, estoque e organização são o
 * que se sabe do item agora, não pedágio. Fatiar um formulário e depois
 * obrigar a atravessar as quatro telas seria trocar uma pilha por um corredor.
 */

/** As quatro perguntas do cadastro, na ordem em que a loja as responde. */
const ETAPAS = [
  { id: "item", titulo: "Item", icone: Package },
  { id: "preco", titulo: "Preço", icone: Wallet },
  { id: "estoque", titulo: "Estoque", icone: Boxes },
  { id: "organizacao", titulo: "Organização", icone: Bookmark },
] as const;

type Props = {
  defaultValues?: Partial<ProductFormInput>;
  onSubmit: (data: ProductFormData) => void;
  onCancel: () => void;
  /** Quando fornecido, exibe o botão de excluir (modo edição). */
  onDelete?: () => void;
  submitText: string;
  /** Cadastro em série: ao salvar, limpa os campos em vez de fechar o modal. */
  resetarAoSalvar?: boolean;
  /**
   * As categorias cadastradas pela empresa.
   *
   * Vem de fora, e não de uma busca aqui dentro, porque as duas telas que
   * abrem este formulário já têm a lista carregada — a de estoque para montar
   * o filtro, a ficha do produto porque a ficha traz tudo numa requisição só.
   * Buscar de novo aqui seria uma terceira ida ao servidor a cada vez que o
   * modal abre, para mostrar o que já estava na tela atrás dele.
   */
  categorias?: Categoria[];
};

const VAZIO: ProductFormInput = {
  nome: "",
  tipo: "PRODUTO",
  valorCompra: 0,
  valorVenda: 0,
  quantidade: 0,
  descricao: "",
  imagem: "",
  sku: "",
  codigoBarras: "",
  unidade: "",
  categoriaId: "",
  marca: "",
  localizacao: "",
  observacoes: "",
  estoqueMinimo: null,
  controlaEstoque: true,
  permiteVendaSemEstoque: false,
};

/** Abre e fecha por altura — o campo empurra o resto em vez de cobrir. */
const REVELA = {
  fechado: { opacity: 0, height: 0 },
  aberto: { opacity: 1, height: "auto" },
};

const temTexto = (valor: unknown) => String(valor ?? "").trim() !== "";

export function ProdutoForm({ defaultValues, onSubmit, onCancel, onDelete, submitText, resetarAoSalvar, categorias = [] }: Props) {
  const alert = useAlert();
  const reduzir = useReducedMotion();

  const [etapa, setEtapa] = useState(0);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    trigger,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput, unknown, ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: { ...VAZIO, ...defaultValues },

    /*
     * Explícito, e não pelo padrão.
     *
     * Com a animação de troca, a aba que sai é DESMONTADA — só uma existe no
     * DOM por vez. `shouldUnregister: false` é o que faz o valor sobreviver a
     * isso: sem ele, sair da aba de Preço apagaria custo e venda, e o produto
     * seria salvo zerado sem ninguém ver.
     *
     * É o padrão do react-hook-form v7, mas fica escrito porque agora existe
     * código que DEPENDE dele — mudá-lo, ou migrar de versão, quebraria a
     * gravação de um jeito silencioso e longe da causa.
     */
    shouldUnregister: false,
  });

  const valores = watch();

  const tipo = valores.tipo;
  const controla = valores.controlaEstoque;
  const custo = Number(valores.valorCompra) || 0;
  const venda = Number(valores.valorVenda) || 0;

  const ehServico = tipo === "SERVICO";
  const { lucro, margem } = calcularGanho(custo, venda);

  /*
   * Serviço não tem estoque — então a aba de estoque SOME, não fica vazia.
   *
   * Uma aba que abre num "isto não se aplica a você" é pior do que não existir:
   * ocupa um quarto da barra, convida ao clique e não responde nada. Quem
   * limpa o dado é o schema, na saída (ver `productSchema`), então esconder
   * aqui é decisão de tela e não de dado.
   */
  const etapas = useMemo(() => ETAPAS.filter((e) => !(ehServico && e.id === "estoque")), [ehServico]);

  /* Trocar para SERVICO com a aba de estoque aberta deixaria a tela em branco:
     a aba deixa de existir e nenhum bloco casa com o índice. Volta para a
     primeira, que é onde a troca de tipo acabou de acontecer. */
  useEffect(() => {
    if (etapa > etapas.length - 1) setEtapa(0);
  }, [etapa, etapas.length]);

  /*
   * O que cada aba já tem.
   *
   * Alimenta o tique verde da navegação — que é o que permite pular direto
   * para o que falta em vez de reler as quatro. Numa edição feita meses
   * depois, é a diferença entre "onde estava a localização?" e um clique.
   */
  const preenchida = useMemo(() => {
    const porId: Record<string, boolean> = {
      item: temTexto(valores.nome),
      preco: Number(valores.valorVenda) > 0 || Number(valores.valorCompra) > 0,
      estoque: Number(valores.quantidade) > 0 || temTexto(valores.unidade) || valores.estoqueMinimo != null,
      organizacao: [valores.sku, valores.codigoBarras, valores.categoriaId, valores.marca, valores.localizacao].some(temTexto),
    };

    return etapas.map((e) => porId[e.id] ?? false);
  }, [valores, etapas]);

  /**
   * Sair da primeira aba valida o nome, e só ele.
   *
   * É o único campo obrigatório: exigir qualquer outro para trocar de aba
   * seria inventar obrigatoriedade que o cadastro não tem. Descobrir o nome
   * vazio depois de preencher preço e estoque é que sairia caro.
   */
  const irPara = async (destino: number) => {
    if (destino === etapa) return;
    // Voltar nunca valida: quem clica em "Item" quer justamente corrigir o
    // que está lá.
    if (destino > 0 && !(await trigger("nome"))) return setEtapa(0);
    setEtapa(destino);
  };

  /** Em que aba mora o campo — usado quando a submissão falha. */
  const etapaDoCampo = (campo: string) => {
    const mapa: Record<string, (typeof ETAPAS)[number]["id"]> = {
      nome: "item", tipo: "item", descricao: "item", imagem: "item",
      valorCompra: "preco", valorVenda: "preco",
      quantidade: "estoque", unidade: "estoque", estoqueMinimo: "estoque",
      controlaEstoque: "estoque", permiteVendaSemEstoque: "estoque",
      sku: "organizacao", codigoBarras: "organizacao", categoriaId: "organizacao",
      marca: "organizacao", localizacao: "organizacao", observacoes: "organizacao",
    };

    return etapas.findIndex((e) => e.id === mapa[campo]);
  };

  const handleValid = async (data: ProductFormData) => {
    const { confirmed } = await alert.confirm(
      ehServico ? "Salvar serviço?" : "Salvar produto?",
      "Confirme os dados antes de salvar.",
    );
    if (!confirmed) return;

    onSubmit(data);

    if (!resetarAoSalvar) return;

    /* Tipo, unidade e categoria sobrevivem à limpeza: quem cadastra camisetas
       cadastra a próxima camiseta. Nome, preços e quantidade zeram — herdar o
       preço do item anterior é como um erro entra no estoque sem ninguém ver. */
    reset({ ...VAZIO, tipo: data.tipo, unidade: data.unidade, categoriaId: data.categoriaId });
    setEtapa(0);
    setFocus("nome");
  };

  /**
   * Erro numa aba fechada é erro invisível.
   *
   * Com o formulário fatiado, um campo inválido pode estar em outra tela — e o
   * aviso mandaria "revise os campos destacados" sem nada destacado à vista.
   * Então a submissão inválida leva junto para onde está o problema.
   */
  const handleInvalid = (erros: typeof errors) => {
    const primeiro = Object.keys(erros)[0];
    const destino = primeiro ? etapaDoCampo(primeiro) : -1;

    if (destino >= 0) setEtapa(destino);

    alert.error("Campos inválidos", "Revise os campos destacados e tente novamente.");
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    const { confirmed } = await alert.confirm("Excluir produto?", "Essa ação não pode ser desfeita.", {
      type: "warning",
      confirmText: "Excluir",
    });
    if (!confirmed) return;
    onDelete();
  };

  const atual = etapas[etapa]?.id;

  return (
    <Form onSubmit={handleSubmit(handleValid, handleInvalid)} className="!gap-4">
      {/* ---------- Navegação das abas ---------- */}
      {/*
       * A pílula do destaque é UM elemento que se move, não um fundo que
       * acende e apaga em cada botão. É o mesmo `layoutId` do painel de
       * pagamentos da nota: o framer interpola a posição entre um render e
       * outro, e o olho segue para onde foi — em vez de procurar o que mudou.
       */}
      <div
        className="grid gap-0.5 rounded-xl border border-fg/[0.07] bg-fg/[0.02] p-0.5"
        style={{ gridTemplateColumns: `repeat(${etapas.length}, minmax(0, 1fr))` }}
      >
        {etapas.map((e, i) => {
          const Icone = e.icone;
          const on = i === etapa;

          return (
            <button
              key={e.id}
              type="button"
              onClick={() => void irPara(i)}
              aria-current={on ? "step" : undefined}
              className="focus-ring relative flex min-h-[38px] cursor-pointer items-center justify-center gap-1.5 rounded-[10px] px-2 text-[12.5px] transition-colors"
            >
              {on && (
                <motion.span
                  layoutId="aba-produto-form"
                  /* Sem animação de layout para quem pediu menos movimento: o
                     destaque continua aparecendo, só não desliza. */
                  transition={reduzir ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 38 }}
                  className="absolute inset-0 rounded-[10px] bg-accent"
                />
              )}

              <span className={`relative flex items-center gap-1.5 ${on ? "text-white" : "text-mist"}`}>
                {preenchida[i] && !on ? <Check size={13} className="text-faint" /> : <Icone size={13} className={on ? "" : "text-faint"} />}

                {/* No celular só a aba atual mostra o rótulo: quatro nomes lado
                    a lado em 360px quebram linha e a barra dobra de altura. O
                    ícone continua identificando as outras. */}
                <span className={`min-w-0 truncate ${on ? "" : "hidden sm:inline"}`}>{e.titulo}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/*
       * A área do conteúdo tem ALTURA FIXA.
       *
       * Sem isso o modal encolhe e cresce a cada troca de aba — "Preço" tem
       * dois campos, "Organização" tem seis —, e o que acontece na prática é
       * que o botão de salvar sobe e desce debaixo do cursor: a pessoa clica
       * onde ele estava e acerta outra coisa. Com altura fixa, a janela é uma
       * só do começo ao fim e os botões ficam parados.
       *
       * O que não couber rola aqui dentro, não na janela: rolar o modal
       * inteiro levaria as abas para fora da vista, que é justamente a
       * navegação de que a pessoa precisa para sair dali.
       *
       * `58dvh` no celular acompanha a altura da tela (com o teclado aberto,
       * `dvh` encolhe junto e o campo em foco continua visível); acima de
       * `sm` vira um valor fixo, porque aí a janela não depende mais do
       * aparelho.
       */}
      <div className="relative h-[58dvh] overflow-y-auto overflow-x-hidden pr-1 sm:h-[366px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            /* A `key` é o que faz o framer entender que é OUTRO conteúdo, e
               não o mesmo mudando. Sem ela não há saída nem entrada. */
            key={atual}
            initial={reduzir ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduzir ? { opacity: 0 } : { opacity: 0, y: -4 }}
            /* `mode="wait"` para a aba que sai não dividir o espaço com a que
               entra: no cruzamento, os dois conjuntos de campos se sobrepõem e
               viram embaralhado, não transição. */
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex flex-col gap-3"
          >
          {/* ---------- Item ---------- */}
          {atual === "item" && (
          <div className="flex flex-col gap-3">
            <FormGrid cols={2}>
              <SelectBox label="Tipo" icon={<Tag className="h-3.5 w-3.5" />} error={errors.tipo?.message} {...register("tipo")}>
                <option value="PRODUTO">Produto</option>
                <option value="SERVICO">Serviço</option>
              </SelectBox>

              <TextField
                label="Nome"
                icon={<ShoppingBag className="h-3.5 w-3.5" />}
                placeholder={ehServico ? "Instalação de ar-condicionado" : "Camiseta básica preta"}
                autoFocus
                error={errors.nome?.message}
                {...register("nome")}
              />
            </FormGrid>

            {/*
             * A foto é ESCOLHIDA, não colada.
             *
             * Aqui havia um campo de texto "URL (opcional)". O que aparecia nele em
             * produção era link de CDN do WhatsApp — que EXPIRA: a foto some do
             * catálogo sozinha, semanas depois, e ninguém liga uma coisa à outra.
             * Agora o arquivo vira WebP no servidor e mora no nosso storage.
             */}
            <Controller
              control={control}
              name="imagem"
              render={({ field }) => (
                <UploadImagem
                  tipo="produto"
                  rotulo="Foto"
                  valor={field.value}
                  onChange={(url) => field.onChange(url ?? "")}
                />
              )}
            />

            <TextArea label="Descrição" rows={3} placeholder="Opcional" error={errors.descricao?.message} {...register("descricao")} />
          </div>
          )}

          {/* ---------- Preço ---------- */}
          {atual === "preco" && (
          <div className="flex flex-col gap-3">
            <FormGrid cols={2}>
              <Controller
                control={control}
                name="valorCompra"
                render={({ field }) => (
                  <CurrencyField label="Custo" hint="O que o item custa para você" value={Number(field.value) || 0} onValueChange={field.onChange} error={errors.valorCompra?.message} />
                )}
              />

              <Controller
                control={control}
                name="valorVenda"
                render={({ field }) => (
                  <CurrencyField label="Venda" hint="O que o cliente paga" value={Number(field.value) || 0} onValueChange={field.onChange} error={errors.valorVenda?.message} />
                )}
              />
            </FormGrid>

            {/* O ganho aparece sozinho quando há preço de venda — é a resposta que
                antes se buscava na calculadora do celular. */}
            <AnimatePresence initial={false}>
              {venda > 0 && (
                <motion.div
                  variants={reduzir ? undefined : REVELA}
                  initial="fechado"
                  animate="aberto"
                  exit="fechado"
                  transition={{ duration: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div
                    className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 ${
                      lucro < 0 ? "bg-danger/[0.08]" : lucro === 0 ? "bg-fg/[0.03]" : "bg-success/[0.08]"
                    }`}
                  >
                    <span className="text-[11px] uppercase tracking-[0.08em] text-faint">{lucro < 0 ? "Prejuízo" : "Lucro"}</span>
                    <span className="flex items-baseline gap-2 tabular-nums">
                      <motion.span
                        key={lucro}
                        initial={reduzir ? false : { opacity: 0, y: -3 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.14 }}
                        className={`text-[15px] leading-none ${lucro < 0 ? "text-danger" : lucro === 0 ? "text-mist" : "text-success"}`}
                      >
                        {formatCurrency(lucro)}
                      </motion.span>
                      {margem !== null && <span className="text-[11.5px] text-mist">{margem.toFixed(0)}%</span>}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          )}

          {/* ---------- Estoque ---------- */}
          {/* Não existe para serviço: ver a nota em `etapas`. */}
          {atual === "estoque" && (
          <div className="flex flex-col gap-3">
            <FormGrid cols={3}>
              <TextField
                label="Quantidade"
                type="number"
                min="0"
                step="any"
                icon={<Hash className="h-3.5 w-3.5" />}
                error={errors.quantidade?.message}
                {...register("quantidade", { valueAsNumber: true })}
              />

              <TextField
                label="Unidade"
                placeholder="un, kg, m, cx…"
                icon={<Ruler className="h-3.5 w-3.5" />}
                hint="Como você conta este item"
                error={errors.unidade?.message}
                {...register("unidade")}
              />

              <TextField
                label="Avisar abaixo de"
                type="number"
                min="0"
                step="any"
                placeholder="5"
                icon={<AlertTriangle className="h-3.5 w-3.5" />}
                hint="Vazio usa o padrão"
                error={errors.estoqueMinimo?.message}
                {...register("estoqueMinimo")}
              />
            </FormGrid>

            <FormSection title="Regras de venda">
              <div className="flex flex-col gap-2">
                <Controller
                  control={control}
                  name="controlaEstoque"
                  render={({ field }) => (
                    <SwitchField
                      label="Controlar estoque deste item"
                      hint="Desligue para itens sob encomenda, que não têm unidade para contar."
                      checked={field.value ?? true}
                      onChange={field.onChange}
                    />
                  )}
                />

                {/* Só aparece quando controlar estoque está ligado: sem contagem,
                    "vender sem estoque" não decide nada. */}
                <AnimatePresence initial={false}>
                  {controla && (
                    <motion.div
                      variants={reduzir ? undefined : REVELA}
                      initial="fechado"
                      animate="aberto"
                      exit="fechado"
                      transition={{ duration: 0.16 }}
                      className="overflow-hidden"
                    >
                      <Controller
                        control={control}
                        name="permiteVendaSemEstoque"
                        render={({ field }) => (
                          <SwitchField
                            label="Permitir venda mesmo sem estoque"
                            hint="Por padrão a venda é bloqueada quando o saldo acaba. Ligue só para o item que você vende encomendado."
                            checked={field.value ?? false}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </FormSection>
          </div>
          )}

          {/* ---------- Organização ---------- */}
          {atual === "organizacao" && (
          <div className="flex flex-col gap-3">
            <FormGrid cols={2}>
              <TextField label="SKU" placeholder="CAM-PRT" icon={<Bookmark className="h-3.5 w-3.5" />} hint="Seu código interno" error={errors.sku?.message} {...register("sku")} />
              <TextField label="Código de barras" placeholder="7891234567890" icon={<Barcode className="h-3.5 w-3.5" />} hint="O que a leitora bipa" error={errors.codigoBarras?.message} {...register("codigoBarras")} />
            </FormGrid>

            <FormGrid cols={3}>
              {/*
               * Escolhida, não digitada.
               *
               * Aqui era um campo de texto, e o que ele produzia era
               * "Bebida", "Bebidas" e "bebidas" convivendo como três
               * categorias — o filtro da lista mostrava as três, cada uma com
               * um pedaço dos produtos. A lista de opções é o cadastro da
               * empresa, mantido pelo botão "Categorias" da tela de estoque.
               *
               * A primeira opção é a ausência, com nome próprio: um seletor
               * que abre em branco não diz se o produto está sem categoria ou
               * se a tela não carregou.
               */}
              <SelectBox
                label="Categoria"
                icon={<Layers className="h-3.5 w-3.5" />}
                hint={categorias.length === 0 ? "Crie categorias no botão “Categorias”, no estoque" : undefined}
                error={errors.categoriaId?.message}
                {...register("categoriaId")}
              >
                <option value="">{SEM_CATEGORIA}</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </SelectBox>

              <TextField label="Marca" placeholder="—" icon={<Tag className="h-3.5 w-3.5" />} error={errors.marca?.message} {...register("marca")} />
              <TextField label="Localização" placeholder="Prateleira A3" icon={<MapPin className="h-3.5 w-3.5" />} error={errors.localizacao?.message} {...register("localizacao")} />
            </FormGrid>

            <TextArea label="Observações" rows={2} placeholder="Anotações internas — não aparecem na nota" error={errors.observacoes?.message} {...register("observacoes")} />
          </div>
          )}

          </motion.div>
        </AnimatePresence>
      </div>

      <FormActions onCancel={onCancel} onDelete={onDelete ? handleDelete : undefined} saving={isSubmitting} submitText={submitText} />
    </Form>
  );
}
