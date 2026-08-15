import { useEffect, useMemo, useRef, useState, type LegacyRef } from "react";
import { ShoppingCart, UserRound, Download, Loader2, AlertTriangle, ListFilter } from "lucide-react";

import { Modal } from "@/shared/ui/Modal";
import Invoice from "@/features/vendas/components/Invoice";
import NotaResumo from "@/features/vendas/components/NotaResumo";
import { ControlesPagina, ListaAcao, ListaCabecalho, ListaFantasmas, ListaLinha, TabelaCard, TabelaVazia } from "@/shared/ui/DataTable";
import Select from "@/shared/ui/Select";
import BuscaSugestoes from "@/shared/ui/BuscaSugestoes";
import { useAutoPageSize } from "@/shared/hooks/useAutoPageSize";
import { getInitials } from "@/shared/utils/format";
import { formatCurrency } from "@/shared/utils/currency";
import { type PedidoClienteType, estaAberto, estaCancelado, estaFechado, totalDoPedido, valorPagoDoPedido, valorPendenteDoPedido } from "@/shared/domain/pedido";
import { formatDateShort } from "@/shared/utils/date";
import { PedidoStatusBadge } from "@/shared/ui/StatusBadge";
import useAuth from "@/features/auth/store/auth.store";
import { ehGestor } from "@/features/vendas/components/TabsVendas";
import useVendaStore from "@/features/vendas/store/venda.store";
import VendasMobile, { type VendaItem } from "@/features/vendas/components/VendasMobile";
import Sheet from "@/shared/ui/Sheet";
import { useIsMobile } from "@/shared/hooks/useIsMobile";
import { gerarBlobNota } from "@/shared/ui/DownloadButton";
import { baixarNotaPdf } from "@/shared/ui/downloadNota";
import useEnterprise from "@/features/empresa/store/enterprise.store";
import ContaService, { type PrazoVenda } from "@/features/financeiro/services/conta.service";
import { dataBr, prazo } from "@/shared/utils/parcelas";

/**
 * A lista de vendas.
 *
 * A tabela era escrita à mão aqui — uma grade de nove colunas com cabeçalho,
 * linhas e estado vazio próprios, parecida com as das outras telas mas nunca
 * igual. Agora usa as mesmas peças de Clientes e Estoque (`TabelaCard`,
 * `ListaCabecalho`, `ListaLinha`).
 *
 * **Os controles moram no cabeçalho da tabela**, não numa barra acima dela.
 * Uma faixa de filtros solta sobre o cartão é uma segunda barra de comando
 * empilhada — cobra altura e fica longe da lista que comanda. Dentro do
 * cabeçalho, cada coisa tem o seu lado: a busca à esquerda, encostada no nome
 * da lista (dizer *o que* se procura), os seletores à direita (recortar o que
 * já está ali).
 */

type StatusFiltro = "todos" | "pago" | "pendente" | "vencida" | "cancelado";
type NotaAberta = { id?: string; clienteId: string; nome?: string };

const ROTULO_FILTRO: Record<StatusFiltro, string> = {
  todos: "Todas",
  pago: "Pagas",
  pendente: "Abertas",
  vencida: "Vencidas",
  cancelado: "Canceladas",
};

const ORDEM_FILTRO: StatusFiltro[] = ["todos", "pago", "pendente", "vencida", "cancelado"];

/**
 * As colunas. A do cliente é a que estica; as de dinheiro têm largura fixa
 * para que os valores fiquem alinhados entre si de linha em linha.
 */
const COLS = "grid-cols-[minmax(190px,1.7fr)_96px_120px_minmax(140px,1fr)_120px_120px_124px_56px]";

const ALTURA_LINHA = 60;

/** A faixa de títulos das colunas mora dentro do corpo medido — ver `offset`. */
const ALTURA_CABECALHO = 40;

/* ======================= Sales / Outlet Page ======================= */
const SalesList = () => {
  const mobile = useIsMobile();
  const vendas = useVendaStore((s) => s.vendas);
  const fetchVendas = useVendaStore((s) => s.fetchVendas);
  const enterprise = useEnterprise((s) => s.enterprise);

  const [notaAberta, setNotaAberta] = useState<NotaAberta | null>(null);
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const gestor = ehGestor(user);

  /* Download rápido na linha: um único nó de nota fora da tela, cujo conteúdo
     é preenchido com a venda escolhida antes de rasterizar. Assim não há N
     notas escondidas e o modal não precisa abrir. */
  const [notaDownload, setNotaDownload] = useState<PedidoClienteType | null>(null);
  const [baixandoNota, setBaixandoNota] = useState(false);
  const refNotaDownload = useRef<HTMLDivElement>(null);

  const baixarNota = async (v: PedidoClienteType, formato: "png" | "pdf" = "png") => {
    if (baixandoNota) return;

    setBaixandoNota(true);
    setNotaDownload(v);

    try {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      const blob = await gerarBlobNota(refNotaDownload);

      if (formato === "pdf") {
        await baixarNotaPdf(blob, enterprise?.nomeFantasia ?? "nota");
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `nota-${v.pedido.pedidoId}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }
    } catch {
      /* Falha de download não trava a tabela — o usuário tenta de novo. */
    } finally {
      setBaixandoNota(false);
      setNotaDownload(null);
    }
  };

  const [status, setStatus] = useState<StatusFiltro>("todos");
  /** "" = todos. Só o gestor vê este filtro — o vendedor já recebe só as dele. */
  const [vendedor, setVendedor] = useState("");

  /*
   * O prazo de cada nota — o que transforma "em aberto" em "vencida".
   *
   * Vem separado das vendas porque é outro assunto: a nota diz o que foi
   * vendido, o acordo diz quando aquilo tinha que ser pago. Nota sem acordo
   * simplesmente não aparece no mapa, e continua sendo uma venda à vista.
   */
  const [prazos, setPrazos] = useState<Map<string, PrazoVenda>>(new Map());

  const carregarPrazos = () => {
    ContaService.prazoDasVendas()
      .then((lista) => setPrazos(new Map(lista.map((p) => [String(p.pedidoId), p]))))
      /* Falha aqui não derruba a lista de vendas: some a coluna de
         vencimento, e o resto da tela continua servindo. */
      .catch(() => setPrazos(new Map()));
  };

  useEffect(() => {
    fetchVendas();
    carregarPrazos();
  }, [fetchVendas]);

  const abrirNota = (nota: NotaAberta) => setNotaAberta(nota);
  const fecharNota = () => {
    setNotaAberta(null);
    fetchVendas(true);
    carregarPrazos();
  };

  /* ======================= Filtros ======================= */

  /** Vencida = parcela em aberto com vencimento no passado. O critério é do
      servidor (`vencidas`), não do relógio do navegador. */
  const estaVencida = (v: PedidoClienteType) => !estaCancelado(v) && (prazos.get(v.pedido.pedidoId)?.vencidas ?? 0) > 0;

  /**
   * Tudo menos o status — é a base de que saem as contagens do seletor.
   *
   * Sem separar, "Pagas 12" contaria as pagas do sistema inteiro enquanto a
   * tela mostra só as de um vendedor: o número prometeria doze linhas e
   * entregaria três.
   */
  const baseFiltrada = useMemo(() => {
    let base = [...vendas].sort((a, b) => +new Date(b.pedido.dataPedido) - +new Date(a.pedido.dataPedido));

    if (vendedor) base = base.filter((v) => String(v.vendedorId ?? "") === vendedor);

    const termo = search.trim().toLowerCase();
    if (termo) base = base.filter((v) => v.nomeCliente?.toLowerCase().includes(termo));

    return base;
  }, [vendas, search, vendedor]);

  const porStatus = (lista: PedidoClienteType[], s: StatusFiltro) => {
    if (s === "pago") return lista.filter(estaFechado);
    if (s === "pendente") return lista.filter(estaAberto);
    if (s === "cancelado") return lista.filter(estaCancelado);
    if (s === "vencida") return lista.filter(estaVencida);
    return lista;
  };

  const vendasFiltradas = useMemo(() => porStatus(baseFiltrada, status), [baseFiltrada, status, prazos]);

  /** As opções do seletor de status, cada uma com quantas notas deixa passar. */
  const opcoesStatus = useMemo(
    () =>
      ORDEM_FILTRO.map((s) => ({
        valor: s,
        label: ROTULO_FILTRO[s],
        contagem: porStatus(baseFiltrada, s).length,
        /* O ponto só existe quando há nota vencida de verdade. */
        alerta: s === "vencida" && baseFiltrada.some(estaVencida),
      })),
    [baseFiltrada, prazos],
  );

  /*
   * Paginação.
   *
   * A lista não rola mais: quantas linhas cabem é medido pela altura do corpo
   * da tabela (`useAutoPageSize`), e o que sobra vai para a página seguinte.
   * Rolar dentro de um cartão que já rola dentro da página é o tipo de coisa
   * que faz alguém perder o rodapé com os totais — que é justamente onde
   * estão os dois números que essa tela existe para mostrar.
   */
  const { bodyRef, perPage } = useAutoPageSize<HTMLDivElement>({ rowHeight: ALTURA_LINHA + 1, minPerPage: 4, offset: ALTURA_CABECALHO });
  const [pagina, setPagina] = useState(1);

  /**
   * Os clientes que aparecem na busca — tirados das próprias vendas.
   *
   * Não é a base de clientes: sugerir quem nunca comprou daria uma lista que
   * leva a zero linhas. O número ao lado é quantas notas a pessoa tem, que é o
   * que ajuda a escolher entre dois nomes parecidos.
   */
  const clientesSugeridos = useMemo(() => {
    const mapa = new Map<string, { id: string; label: string; notas: number }>();

    for (const v of vendas) {
      const nome = v.nomeCliente?.trim();
      if (!nome) continue;

      const atual = mapa.get(nome) ?? { id: v.clienteId ?? nome, label: nome, notas: 0 };
      atual.notas += 1;
      mapa.set(nome, atual);
    }

    return [...mapa.values()]
      .sort((a, b) => b.notas - a.notas)
      .map((c) => ({ id: c.id, label: c.label, sub: `${c.notas} ${c.notas === 1 ? "nota" : "notas"}` }));
  }, [vendas]);

  /**
   * Vendedores extraídos das próprias vendas, não da lista de funcionários.
   *
   * Assim quem saiu da empresa continua aparecendo enquanto tiver venda no
   * período — some da lista quando não houver mais o que filtrar. Buscar de
   * `/funcionarios` daria o oposto: ex-funcionário sumiria e as vendas dele
   * ficariam inalcançáveis.
   */
  const vendedores = useMemo(() => {
    const mapa = new Map<string, string>();

    for (const v of vendas) {
      if (v.vendedorId) mapa.set(String(v.vendedorId), v.nomeVendedor || "Sem nome");
    }

    return Array.from(mapa, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [vendas]);

  const totalPaginas = Math.max(1, Math.ceil(vendasFiltradas.length / perPage));

  /* Filtro novo devolve a lista ao começo. Sem isto, quem está na página 4 e
     digita um nome cai numa página que o resultado não tem — e a tela aparece
     vazia com a busca cheia. */
  useEffect(() => {
    setPagina(1);
  }, [search, status, vendedor]);

  /* Trava a página dentro do total: o corpo pode encolher (janela menor, mais
     linhas por página) e deixar a página atual para trás do fim da lista. */
  useEffect(() => {
    setPagina((p) => Math.min(p, totalPaginas));
  }, [totalPaginas]);

  const primeiraDaPagina = (pagina - 1) * perPage + 1;
  const daPagina = vendasFiltradas.slice((pagina - 1) * perPage, pagina * perPage);
  const ultimaDaPagina = primeiraDaPagina + daPagina.length - 1;

  const totalEmAberto = useMemo(
    () => vendas.filter((v) => !estaCancelado(v)).reduce((acc, v) => acc + valorPendenteDoPedido(v), 0),
    [vendas],
  );

  /* O que já passou do vencimento — o número que faz alguém ligar cobrando. */
  const vencido = useMemo(() => {
    let valor = 0;
    let notas = 0;

    /* Percorre as VENDAS, não o mapa: nota cancelada não é cobrança, mesmo
       que o acordo dela ainda exista no financeiro. */
    for (const v of vendas) {
      if (estaCancelado(v)) continue;

      const p = prazos.get(v.pedido.pedidoId);

      if (p && p.vencidas > 0) {
        valor += p.vencido;
        notas += 1;
      }
    }

    return { valor, notas };
  }, [prazos, vendas]);

  if (mobile) {
    const itens: VendaItem[] = vendasFiltradas.map((v) => ({
      pedidoId: v.pedido.pedidoId,
      clienteId: v.clienteId,
      nomeCliente: v.nomeCliente,
      data: v.pedido.dataPedido,
      total: totalDoPedido(v),
      pendente: valorPendenteDoPedido(v),
      status: estaCancelado(v) ? "cancelado" : estaFechado(v) ? "pago" : (prazos.get(v.pedido.pedidoId)?.vencidas ?? 0) > 0 ? "vencido" : "pendente",
      vencimento: prazos.get(v.pedido.pedidoId)?.proximoVencimento ?? null,
    }));

    return (
      <div className="h-full w-full overflow-y-auto text-ink">
        <VendasMobile
          vendas={itens}
          totalVendas={vendas.length}
          totalEmAberto={totalEmAberto}
          vencido={vencido}
          busca={search}
          onBusca={setSearch}
          status={status}
          onStatus={setStatus}
          onAbrirNota={(v) => abrirNota({ id: v.pedidoId, clienteId: v.clienteId, nome: v.nomeCliente })}
          onBaixarNota={(v) => {
            const original = vendasFiltradas.find((x) => x.pedido.pedidoId === v.pedidoId);
            if (original) void baixarNota(original);
          }}
        />

        {/* A nota ocupa a tela toda: é onde a venda é editada e recebida. */}
        <Sheet open={!!notaAberta} onClose={fecharNota} title={notaAberta?.id ? "Venda" : "Nova venda"} subtitle={notaAberta?.nome} altura="cheia">
          {notaAberta && <Invoice id={notaAberta.id} clienteId={notaAberta.clienteId} nome={notaAberta.nome} onSaved={fecharNota} />}
        </Sheet>

        {/* Nó de nota fora da tela para o download rápido. */}
        <NotaEscondida venda={notaDownload} refNota={refNotaDownload} />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TabelaCard
        title="Todas as vendas"
        icon={<ShoppingCart size={15} />}
        count={vendasFiltradas.length}
        countLabel={`${vendasFiltradas.length === 1 ? "nota" : "notas"}${vendasFiltradas.length !== vendas.length ? ` de ${vendas.length}` : ""}`}
        minWidth={980}
        bodyRef={bodyRef}
        controles={
          <>
            {/* Busca e filtros no mesmo grupo: as três coisas restringem a
                mesma lista, e separá-las pelas duas pontas da barra fazia o
                olho atravessar o cabeçalho para montar um filtro só. */}
            <BuscaSugestoes
              valor={search}
              onValor={setSearch}
              sugestoes={clientesSugeridos}
              onEscolher={(s) => setSearch(s.label)}
              placeholder="Buscar cliente…"
              aria-label="Buscar venda por cliente"
              className="w-[230px] shrink-0"
            />

            {/* O seletor de vendedor só aparece quando há mais de um vendedor
                com venda: com um só, ele não filtra nada e vira ruído. */}
            {gestor && vendedores.length > 1 && (
              <Select
                valor={vendedor}
                onChange={setVendedor}
                aria-label="Filtrar por vendedor"
                icone={<UserRound size={14} />}
                className="w-[176px] shrink-0"
                opcoes={[
                  { valor: "", label: "Vendedores" },
                  ...vendedores.map((v) => ({ valor: v.id, label: v.nome })),
                ]}
              />
            )}

            <Select
              valor={status}
              onChange={(v) => setStatus(v as StatusFiltro)}
              aria-label="Filtrar por situação da nota"
              icone={<ListFilter size={14} />}
              className="w-[162px] shrink-0"
              opcoes={opcoesStatus}
            />
          </>
        }
        footer={
          <>
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5">
                Total em aberto <strong className="nums text-[13px] text-danger">{formatCurrency(totalEmAberto)}</strong>
              </span>

              {/* O vencido só aparece quando existe: uma coluna zerada
                  permanente ensina o olho a ignorar o lugar onde o alerta
                  apareceria. */}
              {vencido.notas > 0 && (
                <span className="flex items-center gap-1.5 text-danger">
                  <AlertTriangle size={12} />
                  Vencido <strong className="nums text-[13px]">{formatCurrency(vencido.valor)}</strong>
                  <span className="text-faint">
                    em {vencido.notas} {vencido.notas === 1 ? "nota" : "notas"}
                  </span>
                </span>
              )}
            </span>

            {totalPaginas > 1 && (
              <span className="flex items-center gap-3">
                <span className="hidden tabular-nums sm:inline">
                  {primeiraDaPagina}–{ultimaDaPagina} de {vendasFiltradas.length}
                </span>
                <ControlesPagina pagina={pagina} totalPaginas={totalPaginas} onPagina={setPagina} />
              </span>
            )}
          </>
        }
      >
        {vendasFiltradas.length === 0 ? (
          <TabelaVazia
            icon={<ShoppingCart size={20} />}
            title="Nenhuma venda encontrada"
            description={status === "todos" && !search ? "As notas que você emitir aparecem aqui." : "Nenhuma nota bate com o filtro escolhido."}
          />
        ) : (
          <>
            <ListaCabecalho cols={COLS}>
              <span>Cliente</span>
              <span>Data</span>
              <span>Situação</span>
              <span>Vencimento</span>
              <span className="text-right">Total</span>
              <span className="text-right">Pago</span>
              <span className="text-right">Pendente</span>
              <span />
            </ListaCabecalho>

            {daPagina.map((v) => {
              const total = totalDoPedido(v);
              const pago = valorPagoDoPedido(v);
              const pendente = valorPendenteDoPedido(v);
              const idCurto = v.pedido.pedidoId?.slice(-6).toUpperCase() ?? "—";
              const baixandoEsta = baixandoNota && notaDownload?.pedido.pedidoId === v.pedido.pedidoId;

              /* O vencimento que interessa é o da PRÓXIMA parcela em aberto —
                 as já pagas não cobram nada de ninguém. */
              const p = prazos.get(v.pedido.pedidoId);
              const atrasada = !estaCancelado(v) && (p?.vencidas ?? 0) > 0;

              return (
                <ListaLinha
                  key={v.pedido.pedidoId}
                  cols={COLS}
                  altura={ALTURA_LINHA}
                  ariaLabel={`Abrir a nota de ${v.nomeCliente}`}
                  destaque={atrasada ? "danger" : undefined}
                  onClick={() => abrirNota({ id: v.pedido.pedidoId, clienteId: v.clienteId, nome: v.nomeCliente })}
                  acoes={
                    <ListaAcao
                      icon={baixandoEsta ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      label="Baixar nota"
                      onClick={() => void baixarNota(v)}
                    />
                  }
                >
                  {/* Cliente e número da nota na mesma célula: o código sozinho
                      numa coluna própria gastava 84px para dizer o que ninguém
                      procura primeiro — e a busca é por nome. */}
                  <span className="flex min-w-0 items-center gap-2.5 pr-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/25 bg-accent/[0.12] text-[10.5px] text-accent-soft">
                      {getInitials(v.nomeCliente)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] text-ink">{v.nomeCliente}</span>
                      <span className="block truncate font-mono text-[10px] text-faint">#{idCurto}</span>
                    </span>
                  </span>

                  <span className="nums text-[12px] text-mist">{formatDateShort(v.pedido.dataPedido)}</span>
                  <span><PedidoStatusBadge status={v.pedido.pedidoStatus} /></span>

                  <span className="min-w-0 pr-3">
                    {p?.proximoVencimento ? (
                      <>
                        <span className={`nums block truncate text-[12px] ${atrasada ? "text-danger" : "text-mist"}`}>{dataBr(String(p.proximoVencimento))}</span>
                        <span className={`block truncate text-[10px] ${atrasada ? "text-danger" : "text-muted"}`}>
                          {atrasada ? `${p.diasAtraso} ${p.diasAtraso === 1 ? "dia" : "dias"} em atraso` : prazo(String(p.proximoVencimento)).texto}
                        </span>
                      </>
                    ) : p ? (
                      <span className="text-[12px] text-success">quitada</span>
                    ) : (
                      <span className="text-[12px] text-faint">à vista</span>
                    )}
                  </span>

                  <span className="nums text-right text-[12.5px] text-ink">{formatCurrency(total)}</span>
                  {/* Zerado fica apagado: um valor em verde ou vermelho que
                      diz "0,00" pinta de urgência uma linha que não tem. */}
                  <span className={`nums text-right text-[12.5px] ${pago > 0 ? "text-success" : "text-faint"}`}>{formatCurrency(pago)}</span>
                  <span className={`nums text-right text-[12.5px] ${pendente > 0 ? "text-danger" : "text-faint"}`}>{formatCurrency(pendente)}</span>
                  <span />
                </ListaLinha>
              );
            })}

            {/* Linhas vazias completando a página: sem elas o rodapé sobe e
                desce conforme a última página tem duas ou dez notas — e a
                paginação vira um alvo que se move entre um clique e outro. */}
            <ListaFantasmas quantidade={Math.max(0, perPage - daPagina.length)} altura={ALTURA_LINHA} />
          </>
        )}
      </TabelaCard>

      <Modal open={!!notaAberta} onClose={fecharNota} title={notaAberta?.id ? "Venda" : "Nova venda"} subtitle={notaAberta?.nome} size="full">
        {/* `onSaved` também aqui: sem ele, salvar a alteração ou cancelar a nota
            no desktop não recarregava a lista nem fechava o modal — a tela
            ficava mostrando o estado antigo até um F5. */}
        {notaAberta && <Invoice id={notaAberta.id} clienteId={notaAberta.clienteId} nome={notaAberta.nome} onSaved={fecharNota} />}
      </Modal>

      {/* Nó de nota fora da tela para o download rápido. */}
      <NotaEscondida venda={notaDownload} refNota={refNotaDownload} />
    </div>
  );
};

/** Nó de nota escondido à esquerda — `html-to-image` precisa que ele exista
    no DOM, então fica fora do viewport em vez de `display:none`. */
function NotaEscondida({ venda, refNota }: { venda: PedidoClienteType | null; refNota: LegacyRef<HTMLDivElement> }) {
  return (
    <div className="fixed -left-[9999px] top-0 w-[900px]" aria-hidden>
      {venda && <NotaResumo venda={venda} refNota={refNota} />}
    </div>
  );
}

export default SalesList;
