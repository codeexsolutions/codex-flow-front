import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Loader2, Users, Package, ShoppingCart, UserRound,
  Wallet, BarChart3, MessageCircle, Zap, Sparkles, Check, Infinity as InfinityIcon,
  ShieldCheck, Smartphone, WifiOff, Store, Truck, Target, Workflow, Table2,
  FileText, Code2, Building2, Headset,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import AssinaturaService from "@/features/assinatura/services/assinatura.service";
import { CICLO_LABEL, RECURSO_LABEL, type Plano } from "@/features/assinatura/types/assinatura.types";
import { formatCurrencyFromCents } from "@/shared/utils/currency";
import { formatNumber } from "@/shared/utils/format";

/**
 * Cada recurso tem cara própria. Uma coluna de check verdes repetidos não diz
 * nada — o olho passa reto. Com o ícone do que a linha significa, dá para
 * comparar dois planos de relance, sem ler palavra por palavra.
 */
const RECURSO_ICONE: Record<string, LucideIcon> = {
  pdv: Store,
  clientes: UserRound,
  produtos: Package,
  vendas: ShoppingCart,
  financeiro: Wallet,
  orcamentos: FileText,
  planilhas: Table2,
  crm: Target,
  crmMultiAtendente: Headset,
  metas: Target,
  automacoes: Workflow,
  relatorios: BarChart3,
  correios: Truck,
  whatsappIntegrado: MessageCircle,
  multiLoja: Building2,
  api: Code2,
  suporteWhatsapp: MessageCircle,
  suportePrioritario: Zap,
};

/** Ordem fixa das linhas — a mesma em todo cartão, para comparar de relance. */
const ORDEM_RECURSOS = Object.keys(RECURSO_LABEL);

const LIMITES: { chave: keyof Plano; label: string; icone: LucideIcon }[] = [
  { chave: "limiteUsuarios", label: "Usuários", icone: Users },
  { chave: "limiteClientes", label: "Clientes", icone: UserRound },
  { chave: "limiteProdutos", label: "Produtos", icone: Package },
  { chave: "limitePedidosMes", label: "Vendas/mês", icone: ShoppingCart },
];

/** O que vale para todo plano — dito uma vez, embaixo, em vez de repetido em cada cartão. */
const INCLUSO = [
  { icone: Smartphone, texto: "Instala como aplicativo no celular" },
  { icone: WifiOff, texto: "Continua abrindo se a internet cair" },
  { icone: ShieldCheck, texto: "Seus dados isolados dos de outras lojas" },
  { icone: Sparkles, texto: "Seis temas e nove cores de destaque" },
];

/** Limite nulo no banco significa "sem teto". */
const LimiteValor = ({ valor }: { valor: number | null }) =>
  valor === null ? (
    <span className="flex items-center justify-center text-accent-soft" title="Sem limite">
      <InfinityIcon size={18} strokeWidth={2.4} />
    </span>
  ) : (
    <span className="text-[17px] leading-none tabular-nums text-ink">{formatNumber(valor)}</span>
  );

function CardPlano({ plano, onEscolher }: { plano: Plano; onEscolher: (p: Plano) => void }) {

  /*
   * Só o que o plano TEM.
   *
   * A versão anterior listava os recursos todos e riscava os ausentes, para
   * as linhas se alinharem entre os cartões. Isso funcionava com três planos
   * e sete recursos. Com seis planos e dezoito, o cartão do Solo virava uma
   * lista de quinze coisas riscadas — que é o argumento do concorrente, não o
   * nosso. Quem quer o Solo precisa ver o Solo resolvendo o problema dele.
   */
  const inclusos = ORDEM_RECURSOS.filter((chave) => plano.recursos?.[chave] === true);

  return (
    <div
      className={`card glass-sheen relative flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
        plano.destaque ? "border-accent/40 shadow-[0_24px_70px_-32px_rgb(var(--accent))]" : "hover:border-fg/[0.16]"
      }`}
    >
      {/* Fio de luz no topo: marca o plano em destaque sem gritar. */}
      {plano.destaque && <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-soft to-transparent" />}

      <div className="p-6 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[16px] text-ink">{plano.nome}</h2>
            {/* Para quem é, antes do que faz: é assim que a pessoa se
                reconhece num cartão em vez de comparar dezoito linhas. */}
            {plano.publicoAlvo && <p className="mt-0.5 text-[11px] text-accent-soft">{plano.publicoAlvo}</p>}
            <p className="mt-1.5 min-h-[34px] text-[12px] leading-relaxed text-mist">{plano.descricao}</p>
          </div>

          {plano.destaque && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-[10px] uppercase tracking-[0.6px] text-accent-soft ring-1 ring-accent/25">
              <Sparkles size={10} />
              Mais escolhido
            </span>
          )}
        </div>

        <div className="mt-5 flex items-baseline gap-1.5">
          <span className="text-[34px] leading-none tracking-tight text-ink">{formatCurrencyFromCents(plano.precoCentavos)}</span>
          <span className="text-[12px] text-faint">{CICLO_LABEL[plano.ciclo]}</span>
        </div>
      </div>

      {/* Limites — as divisórias são os vãos de 1px do próprio grid. */}
      <div className="grid grid-cols-4 gap-px bg-fg/[0.06] py-px">
        {LIMITES.map(({ chave, label, icone: Icone }) => (
          <div key={label} className="flex flex-col items-center gap-1.5 bg-canvas px-2 py-3">
            <LimiteValor valor={plano[chave] as number | null} />
            <span className="flex items-center gap-1 text-center text-[9.5px] leading-none text-faint">
              <Icone size={10} className="shrink-0 text-muted" />
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-6 p-6">
        <ul className="flex flex-col gap-2">
          {inclusos.map((chave) => {
            const Icone = RECURSO_ICONE[chave] ?? Check;

            return (
              <li key={chave} className="flex items-center gap-2.5 text-[12.5px] text-mist">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent/[0.12] text-accent-soft ring-1 ring-inset ring-accent/20">
                  <Icone size={13} />
                </span>
                {RECURSO_LABEL[chave] ?? chave}
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => onEscolher(plano)}
          className={`focus-ring group inline-flex min-h-[46px] w-full items-center justify-center gap-1.5 rounded-xl text-[13.5px] transition-all active:scale-[0.99] ${
            plano.destaque
              ? "bg-accent text-white shadow-[0_12px_32px_-12px_rgb(var(--accent))] hover:brightness-110"
              : "border border-fg/[0.12] text-ink hover:border-accent/40 hover:bg-fg/[0.04]"
          }`}
        >
          Escolher {plano.nome}
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}

const PlanosPage = () => {
  const navigate = useNavigate();

  const [planos, setPlanos] = useState<Plano[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    // `true`: esta é a página da comparação completa — quem chegou aqui pediu
    // para ver tudo. A venda normal acontece no diagnóstico do cadastro, que
    // mostra um plano só.
    AssinaturaService.listarPlanos(true)
      .then((lista) => ativo && setPlanos(lista))
      .catch(() => ativo && setErro("Não foi possível carregar os planos. Tente novamente em instantes."))
      .finally(() => ativo && setCarregando(false));

    return () => {
      ativo = false;
    };
  }, []);

  /** O plano escolhido viaja na URL — o cadastro lê e já abre marcado. */
  const escolher = (plano: Plano) => navigate(`/cadastro?plano=${encodeURIComponent(plano.codigo)}`);

  return (
    /* `vitrine`: página pública veste a identidade do Flow, não o tema que o
       visitante salvou em Aparência. */
    <div className="vitrine aurora relative min-h-[100dvh] w-full overflow-x-hidden bg-canvas px-5 py-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col">
        <button
          type="button"
          onClick={() => navigate("/page")}
          className="focus-ring mb-8 inline-flex w-fit items-center gap-1.5 rounded-xl border border-fg/[0.07] px-3 py-1.5 text-[12px] text-mist transition hover:bg-fg/[0.04] hover:text-ink"
        >
          <ArrowLeft size={13} />
          Voltar
        </button>

        <div className="flex flex-col items-center text-center">
          <img src="/logo.png" alt="CodeEx Flow" width={48} height={48} className="h-12 w-12 rounded-xl shadow-e2" />
          <h1 className="mt-5 text-2xl tracking-tight text-ink sm:text-[28px]">Todos os planos, lado a lado</h1>
          <p className="mt-2.5 max-w-lg text-[13px] leading-relaxed text-mist">
            Do empreendedor que vende sozinho à operação com mais de uma loja. Você troca de plano quando quiser,
            pagando só a diferença.
          </p>

          {/*
           * A saída para quem abriu esta página e travou.
           *
           * Seis colunas de preço é informação demais para quem nunca usou um
           * ERP — foi por isso que o cadastro passou a perguntar em vez de
           * mostrar. Quem chegou aqui pela curiosidade e não sabe decidir tem
           * o caminho curto a um clique, em vez de fechar a aba.
           */}
          <button
            type="button"
            onClick={() => navigate("/cadastro")}
            className="focus-ring group mt-6 inline-flex items-center gap-2 rounded-xl border border-accent/25 bg-accent/[0.08] px-4 py-2.5 text-[13px] text-accent-soft transition hover:bg-accent/[0.14]"
          >
            <Sparkles size={14} />
            Não sabe qual? Responda 3 perguntas
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {carregando && (
          <div className="flex items-center justify-center gap-2 py-28 text-[13px] text-mist">
            <Loader2 size={15} className="animate-spin text-accent" />
            Carregando planos...
          </div>
        )}

        {!carregando && erro && (
          <p className="mt-12 rounded-2xl border border-danger/25 bg-danger/[0.06] px-6 py-10 text-center text-[13px] text-danger">{erro}</p>
        )}

        {!carregando && !erro && planos.length === 0 && (
          <p className="mt-12 rounded-2xl border border-dashed border-fg/[0.12] px-6 py-14 text-center text-[13px] text-faint">
            Nenhum plano disponível agora. Fale com o suporte para liberar seu cadastro.
          </p>
        )}

        {!carregando && planos.length > 0 && (
          <>
            {/* `items-start`, não `items-stretch`: com seis cartões em duas
                fileiras, esticar iguala a altura de toda a fileira ao maior
                cartão dela — e o Solo, que tem cinco linhas, ganharia um vão
                do tamanho do Ilimitado embaixo. */}
            <div className="mt-10 grid grid-cols-1 items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {planos.map((plano) => (
                <CardPlano key={plano.id} plano={plano} onEscolher={escolher} />
              ))}
            </div>

            {/* O que não varia entre planos fica aqui, dito uma vez só. */}
            <div className="mt-8 rounded-2xl border border-fg/[0.07] bg-fg/[0.02] p-6">
              <p className="text-[11px] uppercase tracking-[1.6px] text-faint">Em todos os planos</p>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {INCLUSO.map(({ icone: Icone, texto }) => (
                  <div key={texto} className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-fg/[0.05] text-accent-soft">
                      <Icone size={15} />
                    </span>
                    <span className="text-[12.5px] leading-snug text-mist">{texto}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <p className="mt-10 text-center text-[12px] text-faint">
          Já tem conta?{" "}
          <button type="button" onClick={() => navigate("/login")} className="focus-ring rounded text-accent transition-colors hover:text-accent-soft">
            Entrar
          </button>
        </p>
      </div>
    </div>
  );
};

export default PlanosPage;
