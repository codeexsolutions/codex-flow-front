import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft, Package, Pencil, AlertTriangle, RotateCw, Loader2, Wallet,
  TrendingUp, Boxes, Barcode, Bookmark, MapPin, Tag, Layers, Ruler, Wrench,
  Sliders, Infinity as InfinityIcon,
} from "lucide-react";

import { PageScreen } from "@/shared/ui/PageShell";
import { Modal } from "@/shared/ui/Modal";
import { useAlert } from "@/shared/ui/Alert";
import { extractErrorMessage, getErrorTitle } from "@/shared/utils/errorHandler";
import { formatCurrency } from "@/shared/utils/currency";
import { formatNumber, EMPTY } from "@/shared/utils/format";
import useSincronizacao from "@/shared/realtime/useSincronizacao";

import type ProductType from "@/shared/domain/produto";
import { nivelEstoque, SEM_CATEGORIA } from "@/shared/domain/produto";
import type { FichaProduto } from "@/shared/domain/estoque";
import ProductService from "@/features/estoque/services/product.service";
import EstoqueService from "@/features/estoque/services/estoque.service";
import { ProdutoForm } from "@/features/estoque/components/ProdutoForm";
import type { ProductFormData } from "@/features/estoque/schema/product.schema";
import { calcularGanho } from "@/features/estoque/schema/product.schema";
import VariacoesPainel from "@/features/estoque/components/VariacoesPainel";
import InsumosPainel from "@/features/estoque/components/InsumosPainel";
import MovimentosPainel from "@/features/estoque/components/MovimentosPainel";
import AtributosPainel from "@/features/estoque/components/AtributosPainel";

/**
 * A página do produto — tudo o que existe sobre um item, num lugar só.
 *
 * ---------------------------------------------------------------------------
 * Por que uma PÁGINA, e não o modal de edição
 * ---------------------------------------------------------------------------
 * O modal cabia quando produto era "nome, preço e quantidade". Não cabe mais:
 * variações, insumos, extrato de movimentação e a ficha de identificação são
 * quatro blocos que precisam ser lidos juntos e comparados entre si — e um
 * modal de 500 px de altura obriga a rolar dentro de uma caixa que flutua
 * sobre a lista que a pessoa acabou de deixar.
 *
 * Página também significa ENDEREÇO: `/estoque/<id>` pode ser favoritado,
 * mandado no WhatsApp para o colega ("confere esse produto aqui") e aberto de
 * volta pelo histórico. Um modal não tem nada disso.
 *
 * A edição dos campos básicos continua em modal, e continua sendo o mesmo
 * formulário do cadastro — dois formulários para a mesma coisa divergiriam no
 * primeiro campo novo.
 */

/* -------------------------------------------------------------------------- */
/* Peças                                                                      */
/* -------------------------------------------------------------------------- */

const StatCard = ({ icon, label, value, hint, tom }: { icon: ReactNode; label: string; value: string; hint?: string; tom?: "danger" | "warning" | "success" }) => (
  <div className="card glass-sheen rounded-2xl p-4">
    <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-inset ${
      tom === "danger" ? "bg-danger/[0.14] text-danger ring-danger/20"
        : tom === "warning" ? "bg-warning/[0.14] text-warning ring-warning/20"
        : tom === "success" ? "bg-success/[0.14] text-success ring-success/20"
        : "bg-accent/[0.14] text-accent-soft ring-accent/20"
    }`}>
      {icon}
    </div>
    <p className="text-[11px] uppercase tracking-[0.1em] text-faint">{label}</p>
    <p className="mt-1 truncate text-xl tabular-nums tracking-tight text-ink">{value}</p>
    {hint && <p className="mt-0.5 truncate text-[11px] text-faint">{hint}</p>}
  </div>
);

/**
 * Linha de dado da ficha.
 *
 * Campo vazio NÃO some — aparece como "—". Sumir faria a ficha mudar de altura
 * conforme o produto e esconderia justamente o que falta preencher, que é a
 * informação mais acionável desta tela.
 *
 * `vazio` troca esse traço por um nome quando a ausência TEM nome — é o caso
 * da categoria, cuja falta se chama "Sem categoria" em toda tela do sistema.
 * O tom continua apagado: é um estado, não um valor preenchido.
 */
const Dado = ({ icon, label, valor, vazio = EMPTY }: { icon: ReactNode; label: string; valor?: string | null; vazio?: string }) => (
  <div className="flex items-center gap-3 px-5 py-2.5">
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-fg/[0.04] text-muted">{icon}</span>
    <span className="w-[104px] shrink-0 text-[11px] uppercase tracking-[0.08em] text-faint">{label}</span>
    <span className={`min-w-0 flex-1 truncate text-[12.5px] ${valor ? "text-ink" : "text-faint"}`}>{valor || vazio}</span>
  </div>
);

const Cartao = ({ children }: { children: ReactNode }) => (
  <div className="card glass-sheen overflow-hidden rounded-2xl">{children}</div>
);

/* -------------------------------------------------------------------------- */
/* Página                                                                     */
/* -------------------------------------------------------------------------- */

const ProdutoDetalhe = () => {
  const { produtoId } = useParams();
  const navigate = useNavigate();
  const alert = useAlert();

  const [ficha, setFicha] = useState<FichaProduto | null>(null);
  /** Catálogo — usado só para escolher insumos. */
  const [catalogo, setCatalogo] = useState<ProductType[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState<"editar" | "atributos" | null>(null);

  const carregar = useCallback(async () => {
    if (!produtoId) return;

    setErro(null);

    try {
      const dados = await EstoqueService.ficha(produtoId);
      setFicha(dados);
    } catch (err) {
      setErro(extractErrorMessage(err, "Não foi possível carregar o produto."));
    } finally {
      setCarregando(false);
    }
  }, [produtoId]);

  useEffect(() => {
    setCarregando(true);
    void carregar();
  }, [carregar]);

  /* O catálogo é buscado uma vez, e à parte da ficha: ele só serve ao seletor
     de insumos, e falhar nele não pode impedir a página de abrir. */
  useEffect(() => {
    ProductService.getAll()
      .then((res) => {
        const lista = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
        setCatalogo(lista as ProductType[]);
      })
      .catch(() => setCatalogo([]));
  }, []);

  /* Venda em outro caixa, entrada lançada pelo colega: a ficha se atualiza
     sozinha, sem ninguém apertar nada. */
  useSincronizacao(["produtos", "pedidos"], () => { void carregar(); });

  const salvarEdicao = async (dados: ProductFormData) => {
    if (!produtoId) return;

    try {
      await ProductService.update({ id: produtoId, ...dados });
      setModal(null);
      await carregar();
      alert.success("Produto atualizado!", "As alterações foram salvas.");
    } catch (err) {
      alert.error(getErrorTitle(err), extractErrorMessage(err, "Não foi possível salvar as alterações."));
    }
  };

  const excluir = async () => {
    if (!produtoId) return;

    try {
      const mensagem = await ProductService.remove(produtoId);
      alert.success("Pronto!", mensagem);
      navigate("/estoque");
    } catch (err) {
      alert.error(getErrorTitle(err), extractErrorMessage(err, "Não foi possível excluir o produto."));
    }
  };

  if (carregando) {
    return (
      <PageScreen title="Produto" icon={<Package className="h-5 w-5" />}>
        <div className="flex flex-1 items-center justify-center text-faint">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </PageScreen>
    );
  }

  if (erro || !ficha) {
    return (
      <PageScreen title="Produto" icon={<Package className="h-5 w-5" />}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <AlertTriangle className="h-6 w-6 text-danger" />
          <p className="text-[13px] text-mist">{erro ?? "Produto não encontrado."}</p>
          <div className="flex gap-2">
            <button onClick={() => void carregar()} className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-fg/[0.1] px-3 py-2 text-[12.5px] text-mist hover:text-ink">
              <RotateCw className="h-3.5 w-3.5" /> Tentar novamente
            </button>
            <button onClick={() => navigate("/estoque")} className="focus-ring cursor-pointer rounded-lg bg-accent px-3 py-2 text-[12.5px] text-white">
              Voltar ao estoque
            </button>
          </div>
        </div>
      </PageScreen>
    );
  }

  const { produto, variacoes, insumos, usadoEm, movimentos, atributos, categorias, disponivel, limitadoPor } = ficha;

  const ehServico = produto.tipo === "SERVICO";
  const conta = produto.controlaEstoque !== false && !ehServico;
  const nivel = nivelEstoque(produto);
  const { lucro, margem } = calcularGanho(Number(produto.valorCompra) || 0, Number(produto.valorVenda) || 0);

  /* `-1` é o contrato da API para "nada limita" — ver a nota em
     `EstoqueService.calcularDisponivel`. `Infinity` não sobrevive ao JSON. */
  const ilimitado = disponivel < 0;

  const quantidade = Number(produto.quantidade) || 0;
  const valorEmEstoque = (Number(produto.valorCompra) || 0) * quantidade;

  return (
    <PageScreen
      icon={<Package className="h-5 w-5" />}
      title={produto.nome}
      subtitle={[produto.categoria, produto.marca, produto.sku].filter(Boolean).join(" · ") || (ehServico ? "Serviço" : "Produto")}
    >
      {/* Barra de ações */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => navigate("/estoque")}
          className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-fg/[0.08] bg-fg/[0.04] px-3 py-2 text-[13px] text-mist transition-colors hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" /> Estoque
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setModal("atributos")}
          title="Cadastrar tamanhos, cores e outros eixos de variação"
          className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-fg/[0.08] bg-fg/[0.04] px-3 py-2 text-[13px] text-mist transition-colors hover:text-ink"
        >
          <Sliders className="h-4 w-4" /> Atributos
        </button>

        <button
          type="button"
          onClick={() => setModal("editar")}
          className="focus-ring inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-accent-soft to-accent px-4 py-2 text-[13px] text-white shadow-glow transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <Pencil className="h-4 w-4" /> Editar
        </button>
      </div>

      {/* Cabeçalho: foto + números */}
      <section className="grid shrink-0 grid-cols-1 gap-3 lg:grid-cols-[240px_1fr]">
        <Cartao>
          <div className="flex aspect-square w-full items-center justify-center overflow-hidden bg-fg/[0.03]">
            {produto.imagem ? (
              <img src={produto.imagem} alt={produto.nome} className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-faint">
                <Package className="h-8 w-8" />
                <span className="text-[11px]">Sem foto</span>
              </div>
            )}
          </div>
        </Cartao>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {/*
           * "Dá para vender" e não "quantidade em estoque".
           *
           * São números diferentes quando há receita: uma cesta com 2 prontas e
           * material para mais 5 dá para vender 7. É este o número que decide se
           * a venda passa, então é ele que fica em primeiro lugar.
           */}
          <StatCard
            icon={ilimitado ? <InfinityIcon className="h-4 w-4" /> : <Boxes className="h-4 w-4" />}
            label="Dá para vender"
            value={ilimitado ? "Ilimitado" : formatNumber(disponivel)}
            hint={ilimitado ? (ehServico ? "Serviço não conta estoque" : "Venda liberada sem estoque") : (limitadoPor ?? undefined)}
            tom={ilimitado ? undefined : disponivel <= 0 ? "danger" : nivel === "baixo" ? "warning" : "success"}
          />

          <StatCard
            icon={<Package className="h-4 w-4" />}
            label={produto.usaVariacoes ? "Soma das variações" : "Em estoque"}
            value={conta ? `${formatNumber(quantidade)} ${produto.unidade || ""}`.trim() : EMPTY}
            hint={conta && produto.estoqueMinimo != null ? `Avisa abaixo de ${formatNumber(produto.estoqueMinimo)}` : undefined}
          />

          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Margem"
            value={margem === null ? EMPTY : `${margem.toFixed(0)}%`}
            hint={`Lucro de ${formatCurrency(lucro)} por unidade`}
            tom={lucro < 0 ? "danger" : undefined}
          />

          <StatCard
            icon={<Wallet className="h-4 w-4" />}
            label="Valor parado"
            value={conta ? formatCurrency(valorEmEstoque) : EMPTY}
            hint={conta ? `${formatCurrency(Number(produto.valorCompra) || 0)} de custo` : undefined}
          />
        </div>
      </section>

      {/* Aviso de bloqueio — o que o operador vai encontrar no PDV */}
      {conta && disponivel <= 0 && !ilimitado && (
        <div className="flex shrink-0 items-start gap-2.5 rounded-xl border border-danger/40 bg-danger/[0.12] px-4 py-3 text-[12.5px] text-danger">
          <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
          <span>
            <strong className="font-normal">A venda deste item está bloqueada.</strong>{" "}
            {limitadoPor && limitadoPor !== "Estoque próprio"
              ? `Falta ${limitadoPor}. Lance a entrada desse material para liberar.`
              : "Lance uma entrada de estoque para liberar."}{" "}
            Para vender assim mesmo, ligue “permitir venda sem estoque” na edição do produto.
          </span>
        </div>
      )}

      <section className="grid min-h-0 grid-cols-1 gap-3 xl:grid-cols-2">
        {/* Ficha */}
        <Cartao>
          <div className="flex items-center gap-3 border-b border-fg/[0.07] px-5 py-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/[0.14] text-accent-soft ring-1 ring-inset ring-accent/20">
              <Tag className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[13px] text-ink">Ficha</h2>
              <p className="text-[11px] text-faint">{ehServico ? "Serviço" : "Produto"} · {conta ? "controla estoque" : "não conta unidades"}</p>
            </div>
          </div>

          <div className="flex flex-col divide-y divide-fg/[0.04]">
            <Dado icon={<Bookmark size={13} />} label="SKU" valor={produto.sku} />
            <Dado icon={<Barcode size={13} />} label="Cód. barras" valor={produto.codigoBarras} />
            {/* "Sem categoria" e não "—": ver a nota de `SEM_CATEGORIA`. O
                traço aqui diria "não sei", quando o sistema sabe muito bem. */}
            <Dado icon={<Layers size={13} />} label="Categoria" valor={produto.categoria} vazio={SEM_CATEGORIA} />
            <Dado icon={<Tag size={13} />} label="Marca" valor={produto.marca} />
            <Dado icon={<Ruler size={13} />} label="Unidade" valor={produto.unidade} />
            <Dado icon={<MapPin size={13} />} label="Localização" valor={produto.localizacao} />
            <Dado icon={<Wallet size={13} />} label="Custo" valor={formatCurrency(Number(produto.valorCompra) || 0)} />
            <Dado icon={<Wallet size={13} />} label="Venda" valor={formatCurrency(Number(produto.valorVenda) || 0)} />
            <Dado
              icon={<Wrench size={13} />}
              label="Sem estoque"
              valor={produto.permiteVendaSemEstoque ? "Pode vender assim mesmo" : "Venda bloqueada"}
            />
          </div>

          {produto.descricao && (
            <p className="border-t border-fg/[0.06] px-5 py-3 text-[12.5px] leading-relaxed text-mist">{produto.descricao}</p>
          )}
        </Cartao>

        {/* Variações */}
        <Cartao>
          <VariacoesPainel
            produtoId={String(produto.id)}
            valorVendaProduto={Number(produto.valorVenda) || 0}
            variacoes={variacoes}
            atributos={atributos}
            onMudou={carregar}
          />
        </Cartao>

        {/* Insumos */}
        <Cartao>
          <InsumosPainel
            produtoId={String(produto.id)}
            insumos={insumos}
            usadoEm={usadoEm}
            produtos={catalogo}
            onMudou={carregar}
            onAbrirProduto={(id) => navigate(`/estoque/${id}`)}
          />
        </Cartao>

        {/* Extrato */}
        <Cartao>
          <MovimentosPainel
            produtoId={String(produto.id)}
            movimentos={movimentos}
            variacoes={variacoes}
            podeMovimentar={conta}
            onMudou={carregar}
          />
        </Cartao>
      </section>

      <Modal open={modal === "editar"} onClose={() => setModal(null)} title="Editar item" subtitle="Navegue pelas abas para achar o campo" size="lg" maxWidth="sm:max-w-3xl">
        <ProdutoForm
          submitText="Salvar alterações"
          onCancel={() => setModal(null)}
          onDelete={excluir}
          onSubmit={salvarEdicao}
          /* A ficha já traz as categorias da empresa — ver a nota do campo em
             `fichaProdutoDto`. Buscá-las de novo aqui deixaria o seletor vazio
             pelo tempo de uma requisição, com o modal já aberto. */
          categorias={categorias}
          defaultValues={{
            nome: produto.nome,
            tipo: produto.tipo ?? "PRODUTO",
            valorCompra: produto.valorCompra,
            valorVenda: produto.valorVenda,
            quantidade: produto.quantidade,
            descricao: produto.descricao,
            imagem: produto.imagem,
            sku: produto.sku ?? "",
            codigoBarras: produto.codigoBarras ?? "",
            unidade: produto.unidade ?? "",
            categoriaId: produto.categoriaId ?? "",
            marca: produto.marca ?? "",
            localizacao: produto.localizacao ?? "",
            observacoes: produto.observacoes ?? "",
            estoqueMinimo: produto.estoqueMinimo ?? null,
            controlaEstoque: produto.controlaEstoque ?? true,
            permiteVendaSemEstoque: produto.permiteVendaSemEstoque ?? false,
          }}
        />
      </Modal>

      <Modal
        open={modal === "atributos"}
        onClose={() => setModal(null)}
        title="Atributos"
        subtitle="Os eixos de variação da sua loja — valem para todos os produtos"
        size="lg"
      >
        <AtributosPainel atributos={atributos} onMudou={carregar} />
      </Modal>
    </PageScreen>
  );
};

export default ProdutoDetalhe;
