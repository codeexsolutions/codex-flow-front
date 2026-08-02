import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, Users, Package, ShoppingCart, UserRound } from "lucide-react";

import AssinaturaService from "@/features/assinatura/services/assinatura.service";
import { CICLO_LABEL, RECURSO_LABEL, type Plano } from "@/features/assinatura/types/assinatura.types";
import { formatCurrencyFromCents } from "@/shared/utils/currency";
import { formatNumber } from "@/shared/utils/format";

/** Limite nulo no banco significa "sem teto". */
const limite = (valor: number | null) => (valor === null ? "∞" : formatNumber(valor));

/** Mini stat tile: o limite é o número, o rótulo fica discreto embaixo. */
function LimiteTile({ icon, label, valor }: { icon: React.ReactNode; label: string; valor: number | null }) {
  return (
    <div className="bg-canvas px-3 py-2.5 text-center">
      <p className="text-[17px] leading-none tabular-nums text-ink">{limite(valor)}</p>
      <p className="mt-1.5 flex items-center justify-center gap-1 text-[10px] leading-none text-faint">
        <span className="text-muted">{icon}</span>
        {label}
      </p>
    </div>
  );
}

function CardPlano({ plano, onEscolher }: { plano: Plano; onEscolher: (p: Plano) => void }) {
  const recursos = Object.entries(plano.recursos ?? {}).filter(([, ativo]) => Boolean(ativo));

  return (
    <div
      className={`card glass-sheen flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
        plano.destaque ? "border-accent/35 shadow-[0_20px_60px_-30px_rgb(var(--accent))]" : "hover:border-fg/[0.14]"
      }`}
    >
      <div className="p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] text-ink">{plano.nome}</h2>
          {plano.destaque && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.6px] text-accent-soft ring-1 ring-accent/25">Mais escolhido</span>
          )}
        </div>

        <p className="mt-1.5 min-h-[34px] text-[12px] leading-relaxed text-mist">{plano.descricao}</p>

        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="text-[34px] leading-none tracking-tight text-ink">{formatCurrencyFromCents(plano.precoCentavos)}</span>
          <span className="text-[12px] text-faint">{CICLO_LABEL[plano.ciclo]}</span>
        </div>
      </div>

      {/* KPI row dos limites — divisórias são os vãos de 1px do grid */}
      <div className="grid grid-cols-4 gap-px bg-fg/[0.06] py-px">
        <LimiteTile icon={<Users size={10} />} label="Usuários" valor={plano.limiteUsuarios} />
        <LimiteTile icon={<UserRound size={10} />} label="Clientes" valor={plano.limiteClientes} />
        <LimiteTile icon={<Package size={10} />} label="Produtos" valor={plano.limiteProdutos} />
        <LimiteTile icon={<ShoppingCart size={10} />} label="Pedidos" valor={plano.limitePedidosMes} />
      </div>

      <div className="flex flex-1 flex-col justify-between gap-5 p-6">
        <ul className="flex flex-col gap-2">
          {recursos.length === 0 ? (
            <li className="text-[12px] text-faint">Recursos essenciais do sistema.</li>
          ) : (
            recursos.map(([chave]) => (
              <li key={chave} className="flex items-center gap-2 text-[12px] text-mist">
                <Check size={13} className="shrink-0 text-success" />
                {RECURSO_LABEL[chave] ?? chave}
              </li>
            ))
          )}
        </ul>

        <button
          type="button"
          onClick={() => onEscolher(plano)}
          className={`focus-ring group inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] transition-all active:scale-[0.99] ${
            plano.destaque
              ? "bg-accent text-white shadow-[0_10px_30px_-12px_rgb(var(--accent))] hover:brightness-110"
              : "border border-fg/[0.1] text-ink hover:border-accent/35 hover:bg-fg/[0.04]"
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

    AssinaturaService.listarPlanos()
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
    <div className="aurora relative min-h-[100dvh] w-full overflow-x-hidden bg-canvas px-5 py-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col">
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
          <h1 className="mt-5 text-2xl tracking-tight text-ink sm:text-[28px]">Escolha o plano da sua empresa</h1>
          <p className="mt-2.5 max-w-lg text-[13px] leading-relaxed text-mist">
            Escolha o plano, cadastre a empresa e já entre no sistema. O acesso é liberado assim que confirmarmos o
            primeiro pagamento via Pix.
          </p>
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
            Nenhum plano disponível no momento.
          </p>
        )}

        {!carregando && planos.length > 0 && (
          <div className="mt-10 grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {planos.map((plano) => (
              <CardPlano key={plano.id} plano={plano} onEscolher={escolher} />
            ))}
          </div>
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
