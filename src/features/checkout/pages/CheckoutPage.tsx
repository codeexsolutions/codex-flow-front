import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, Building2, Receipt, Loader2, QrCode, Check, Copy, Sparkles, ArrowRight,
  CircleCheck, Clock, AlertTriangle, MessageCircle, Mail, RefreshCw, LogOut, CalendarDays,
  Wallet, ShieldCheck,
} from "lucide-react";

import { Modal } from "@/shared/ui/Modal";
import { useAlert } from "@/shared/ui/Alert";
import { formatCurrencyFromCents } from "@/shared/utils/currency";
import { formatDocument } from "@/shared/utils/format";
import { MONTHS } from "@/shared/utils/date";

import useAuth from "@/features/auth/store/auth.store";
import { useLiberacaoEmpresa } from "@/shared/realtime/useLiberacaoEmpresa";
import AssinaturaService from "@/features/assinatura/services/assinatura.service";
import {
  CICLO_LABEL, FaturaMeta, ehPagavel, type Fatura, type MinhaAssinatura, type Plano, type StatusFatura,
} from "@/features/assinatura/types/assinatura.types";

type Filtro = "TODAS" | "A_PAGAR" | "PAGA";

/** Vencimento chega como ISO puro; na tela vale a data, não o fuso. */
const dataBr = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

/** Competência vem como "AAAA-MM" — na tela ninguém lê isso. */
const competenciaBr = (competencia: string) => {
  const [ano, mes] = competencia.split("-");
  return MONTHS[Number(mes) - 1] ? `${MONTHS[Number(mes) - 1]}/${ano}` : competencia;
};

/* ================================================================== */
/* Peças da tela */
/* ================================================================== */

/**
 * Stat tile: rótulo discreto, valor em destaque, apoio opcional.
 * Todos os tiles têm o mesmo peso — quem carrega a leitura é o número.
 *
 * O fundo é opaco de propósito: as divisórias do KPI row são os vãos de 1px do
 * grid, e um fundo translúcido deixaria a linha atravessar o tile.
 */
function StatTile({ label, value, hint, icon }: { label: string; value: React.ReactNode; hint?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-canvas px-4 py-3.5">
      <p className="flex items-center gap-1.5 text-[11px] text-faint">
        <span className="text-muted">{icon}</span>
        {label}
      </p>
      <p className="mt-1.5 truncate text-[19px] leading-tight text-ink">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-mist">{hint}</p>}
    </div>
  );
}

/** Status sempre com ponto + texto: nunca só a cor. */
function StatusBadge({ status }: { status: StatusFatura }) {
  const m = FaturaMeta[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] ring-1 ${m.bg} ${m.text} ${m.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

/** Aviso de uma linha — substitui os banners em degradê que poluíam o topo. */
function Aviso({ icon, titulo, texto, acao }: { icon: React.ReactNode; titulo: string; texto: string; acao?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-accent/20 bg-accent/[0.06] px-5 py-4 sm:flex-row sm:items-center">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-soft">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-ink">{titulo}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-mist">{texto}</p>
      </div>
      {acao}
    </div>
  );
}

/* ================================================================== */
/* Página */
/* ================================================================== */
/**
 * `embutido` = a tela está dentro de Configurações → Faturas, que já tem
 * cabeçalho, padding e área de rolagem próprios. Sem isso a página repetia o
 * cabeçalho, dobrava o padding e ainda centralizava o conteúdo num container
 * que já estava centralizado — era a "formatação fora do lugar".
 */
const CheckoutPage = ({ embutido = false }: { embutido?: boolean }) => {
  const navigate = useNavigate();
  const alert = useAlert();
  const { logout } = useAuth();

  const [assinatura, setAssinatura] = useState<MinhaAssinatura | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [filtro, setFiltro] = useState<Filtro>("TODAS");
  const [faturaSelecionada, setFaturaSelecionada] = useState<Fatura | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [trocandoPlano, setTrocandoPlano] = useState(false);
  const [planos, setPlanos] = useState<Plano[]>([]);

  const carregar = useCallback(async () => {
    try {
      setAssinatura(await AssinaturaService.minha());
      setErro("");
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setErro(err?.response?.data?.message ?? err?.message ?? "Não foi possível carregar sua assinatura.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const faturas = assinatura?.faturas ?? [];

  const faturasAbertas = useMemo(() => faturas.filter((f) => f.status !== "PAGA" && f.status !== "CANCELADA"), [faturas]);
  const faturasPagas = useMemo(() => faturas.filter((f) => f.status === "PAGA"), [faturas]);

  const faturasFiltradas = useMemo(() => {
    if (filtro === "A_PAGAR") return faturasAbertas;
    if (filtro === "PAGA") return faturasPagas;
    return faturas;
  }, [faturas, filtro, faturasAbertas, faturasPagas]);

  const totalAPagar = useMemo(() => faturasAbertas.reduce((acc, f) => acc + f.valorCentavos, 0), [faturasAbertas]);
  const totalPago = useMemo(() => faturasPagas.reduce((acc, f) => acc + f.valorCentavos, 0), [faturasPagas]);

  const proximaFatura = assinatura?.faturaEmAberto ?? null;
  const emConfirmacao = faturasAbertas.filter((f) => f.status === "AGUARDANDO_CONFIRMACAO");

  const empresa = assinatura?.empresa;
  const plano = assinatura?.plano;
  const pix = assinatura?.pix;
  const suporte = assinatura?.suporte;

  // Trocar de plano vale sempre: com a assinatura ativa, o backend cobra só a
  // diferença numa fatura intermediária em vez do valor cheio.
  const podeTrocarPlano = Boolean(assinatura?.plano);

  /* ------------------------- Ações ------------------------- */

  const abrirPagamento = (f: Fatura) => {
    if (!ehPagavel(f)) return;
    setQrLoading(true);
    setCopiado(false);
    setFaturaSelecionada(f);
  };

  const fecharModal = () => {
    setFaturaSelecionada(null);
    setCopiado(false);
  };

  const copiarPix = async () => {
    if (!pix?.copiaECola) return;
    try {
      await navigator.clipboard.writeText(pix.copiaECola);
      setCopiado(true);
      alert.success("Código copiado!", "Cole no aplicativo do seu banco.");
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      alert.error("Falha ao copiar", "Copie o código manualmente.");
    }
  };

  /**
   * Abre o WhatsApp com a mensagem pronta e marca a fatura como aguardando
   * confirmação — é assim que ela entra na fila do painel do dono.
   *
   * A janela abre ANTES do await de propósito: navegador bloqueia popup que
   * não venha direto do clique.
   */
  const avisarPagamento = async (f: Fatura) => {
    if (enviando) return;

    if (suporte?.linkWhatsapp) {
      window.open(suporte.linkWhatsapp, "_blank", "noopener,noreferrer");
    }

    setEnviando(true);

    try {
      setAssinatura(await AssinaturaService.enviarComprovante(f.id));
      fecharModal();

      await alert.success(
        "Recebemos seu aviso!",
        suporte?.linkWhatsapp
          ? "Envie o comprovante na conversa do WhatsApp que abrimos. Assim que confirmarmos, seu acesso é liberado."
          : `Envie o comprovante para ${suporte?.email || "o suporte"}. Assim que confirmarmos, seu acesso é liberado.`,
      );
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      alert.error("Não foi possível registrar", err?.response?.data?.message ?? err?.message ?? "Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  const abrirTrocaDePlano = async () => {
    setTrocandoPlano(true);

    if (planos.length === 0) {
      try {
        setPlanos(await AssinaturaService.listarPlanos());
      } catch {
        alert.error("Falha ao carregar planos", "Tente novamente em instantes.");
      }
    }
  };

  const trocarPlano = async (codigo: string) => {
    if (codigo === plano?.codigo) {
      setTrocandoPlano(false);
      return;
    }

    try {
      const atualizada = await AssinaturaService.trocarPlano(codigo);
      const anterior = plano?.precoCentavos ?? 0;
      const novo = atualizada.plano?.precoCentavos ?? 0;

      setAssinatura(atualizada);
      setTrocandoPlano(false);

      alert.success(
        "Plano atualizado!",
        novo > anterior && assinatura?.status === "ATIVA"
          ? `Geramos uma fatura de ${formatCurrencyFromCents(novo - anterior)} com a diferença.`
          : "Sua fatura em aberto já está com o novo valor.",
      );
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      alert.error("Não foi possível trocar o plano", err?.response?.data?.message ?? err?.message ?? "Tente novamente.");
    }
  };

  const recarregar = () => {
    setCarregando(true);
    carregar();
  };

  /**
   * Pagamento confirmado pelo dono: o socket avisa, a sessão já foi renovada
   * com o token novo e aqui só resta comemorar e levar o cliente para dentro.
   */
  const aoLiberar = useCallback(async () => {
    await alert.success(
      "Empresa verificada! 🎉",
      "Confirmamos seu pagamento e liberamos o acesso completo ao CodeEx Flow. Bom trabalho!",
      { confirmText: "Entrar no sistema" },
    );

    navigate("/", { replace: true });
  }, [alert, navigate]);

  useLiberacaoEmpresa(aoLiberar);

  /**
   * QR em preto no branco: é o que os apps de banco leem com folga. Colorir o
   * código para combinar com o tema derruba o contraste que a leitura exige.
   */
  const qrCodeUrl = pix?.copiaECola
    ? `https://api.qrserver.com/v1/create-qr-code/?size=440x440&margin=12&data=${encodeURIComponent(pix.copiaECola)}`
    : "";

  /* ------------------------- Estados de carga ------------------------- */

  if (carregando) {
    return (
      <div className="flex min-h-[60dvh] w-full items-center justify-center gap-2 text-sm text-mist">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        Carregando sua assinatura...
      </div>
    );
  }

  if (erro || !assinatura) {
    return (
      <div className="flex min-h-[60dvh] w-full flex-col items-center justify-center gap-4 px-6 text-center">
        <AlertTriangle className="h-8 w-8 text-danger" />
        <p className="max-w-md text-sm text-mist">{erro || "Assinatura não encontrada."}</p>
        <div className="flex gap-2">
          <button onClick={recarregar} className="focus-ring flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm text-white transition hover:brightness-110">
            <RefreshCw size={14} /> Tentar de novo
          </button>
          <button onClick={logout} className="focus-ring flex items-center gap-2 rounded-xl border border-fg/[0.08] px-4 py-2 text-sm text-mist transition hover:bg-fg/[0.04]">
            <LogOut size={14} /> Sair
          </button>
        </div>
      </div>
    );
  }

  const contaLiberada = Boolean(empresa?.ativo);

  return (
    <div className="relative w-full text-ink">
      {/* Cabeçalho — só quando a tela é a página inteira */}
      <header className={`sticky top-0 z-20 border-b border-fg/[0.06] bg-canvas/80 backdrop-blur-xl ${embutido ? "hidden" : ""}`}>
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-3.5 lg:px-8">
          {contaLiberada && (
            <button onClick={() => navigate(-1)} className="focus-ring flex h-9 w-9 items-center justify-center rounded-xl border border-fg/[0.07] text-mist transition-colors hover:bg-fg/[0.04]" aria-label="Voltar">
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="text-[15px] tracking-tight text-ink">Assinatura e faturas</h1>
            <p className="truncate text-[11px] text-faint">{empresa?.nomeFantasia}</p>
          </div>

          {/* Sem botão de atualizar: a liberação chega pelo socket. */}
          {!contaLiberada && (
            <button onClick={logout} className="focus-ring flex h-9 items-center gap-1.5 rounded-xl border border-fg/[0.07] px-3 text-xs text-mist transition hover:bg-fg/[0.04]">
              <LogOut size={13} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          )}
        </div>
      </header>

      {/* Embutido: alinhado à esquerda, sem padding próprio — quem cuida disso
          é a página de Configurações. Sozinho: centralizado na viewport. */}
      <div className={embutido ? "flex w-full flex-col gap-5" : "mx-auto flex max-w-5xl flex-col gap-6 px-5 py-8 lg:px-8"}>
        {/* ---------- Aviso contextual (só um, quando faz sentido) ---------- */}
        {emConfirmacao.length > 0 ? (
          <Aviso
            icon={<Clock className="h-4 w-4" />}
            titulo="Recebemos seu aviso de pagamento"
            texto={`Estamos conferindo ${emConfirmacao.length === 1 ? "a fatura" : "as faturas"} e liberamos seu acesso assim que confirmarmos — normalmente em algumas horas.`}
            acao={
              suporte?.linkWhatsapp ? (
                <a
                  href={suporte.linkWhatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-xl border border-fg/[0.08] px-3 py-2 text-[12px] text-mist transition hover:bg-fg/[0.04] hover:text-ink"
                >
                  <MessageCircle size={14} /> Enviar comprovante
                </a>
              ) : undefined
            }
          />
        ) : (
          !contaLiberada && (
            <Aviso
              icon={<ShieldCheck className="h-4 w-4" />}
              titulo="Falta só o primeiro pagamento"
              texto="Pague a fatura abaixo via Pix e nos envie o comprovante. Assim que confirmarmos, todo o sistema é liberado."
            />
          )
        )}

        {/* ---------- Hero: o número que importa + ação ---------- */}
        <section className="card glass-sheen overflow-hidden">
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-end sm:justify-between lg:p-7">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[1.2px] text-faint">Total em aberto</p>
              <p className="mt-1 text-[44px] leading-none tracking-tight text-ink sm:text-5xl">{formatCurrencyFromCents(totalAPagar)}</p>
              <p className="mt-2 text-[13px] text-mist">
                {faturasAbertas.length === 0
                  ? "Nenhuma fatura pendente."
                  : `${faturasAbertas.length} ${faturasAbertas.length === 1 ? "fatura" : "faturas"} · vence ${dataBr(proximaFatura?.vencimento)}`}
              </p>
            </div>

            {proximaFatura && ehPagavel(proximaFatura) && (
              <button
                onClick={() => abrirPagamento(proximaFatura)}
                className="focus-ring group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm text-white shadow-[0_10px_30px_-12px_rgb(var(--accent))] transition-all hover:brightness-110 active:scale-[0.99]"
              >
                <QrCode size={16} />
                Pagar com Pix
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
          </div>

          {/* KPI row — mesma altura, mesmo peso, sem degradês concorrentes */}
          <div className="grid grid-cols-2 gap-px bg-fg/[0.06] pt-px lg:grid-cols-4">
            <StatTile
              icon={<Sparkles size={12} />}
              label="Plano"
              value={plano?.nome ?? "—"}
              hint={plano ? `${formatCurrencyFromCents(plano.precoCentavos)}${CICLO_LABEL[plano.ciclo]}` : "Sem plano definido"}
            />
            <StatTile
              icon={<CalendarDays size={12} />}
              label="Próximo vencimento"
              value={dataBr(proximaFatura?.vencimento ?? assinatura.proximoVencimento)}
              hint={proximaFatura ? FaturaMeta[proximaFatura.status].label : "Em dia"}
            />
            <StatTile
              icon={<Wallet size={12} />}
              label="Total pago"
              value={formatCurrencyFromCents(totalPago)}
              hint={`${faturasPagas.length} ${faturasPagas.length === 1 ? "fatura" : "faturas"}`}
            />
            <StatTile
              icon={contaLiberada ? <CircleCheck size={12} /> : <Clock size={12} />}
              label="Conta"
              value={contaLiberada ? "Liberada" : "Aguardando"}
              hint={contaLiberada ? "Acesso completo" : "Liberamos após o pagamento"}
            />
          </div>
        </section>

        {/* ---------- Faturas: uma lista só ---------- */}
        <section className="card glass-sheen overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-fg/[0.06] px-5 py-3.5">
            <p className="flex items-center gap-2 text-sm text-ink">
              <Receipt size={15} className="text-muted" />
              Faturas
            </p>

            <div className="flex gap-1 rounded-lg bg-fg/[0.04] p-0.5">
              {(
                [
                  ["TODAS", "Todas"],
                  ["A_PAGAR", "A pagar"],
                  ["PAGA", "Pagas"],
                ] as [Filtro, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setFiltro(id)}
                  className={`focus-ring rounded-md px-2.5 py-1 text-[11px] transition-colors ${filtro === id ? "bg-accent text-white" : "text-mist hover:text-ink"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {faturasFiltradas.length === 0 ? (
            <p className="px-5 py-14 text-center text-[13px] text-faint">Nenhuma fatura neste filtro.</p>
          ) : (
            <ul className="divide-y divide-fg/[0.05]">
              {faturasFiltradas.map((f) => (
                <li key={f.id} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-fg/[0.02]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-ink">{f.descricao || `Assinatura ${competenciaBr(f.competencia)}`}</p>
                    <p className="mt-0.5 text-[11px] text-faint">
                      {f.status === "PAGA" ? `Pago em ${dataBr(f.pagoEm)}` : `Vence em ${dataBr(f.vencimento)}`}
                    </p>
                  </div>

                  <StatusBadge status={f.status} />

                  <p className="w-28 shrink-0 text-right text-[13px] tabular-nums text-ink">{formatCurrencyFromCents(f.valorCentavos)}</p>

                  <div className="w-[76px] shrink-0 text-right">
                    {ehPagavel(f) && (
                      <button onClick={() => abrirPagamento(f)} className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/[0.08] px-2.5 text-[12px] text-accent-soft transition hover:bg-accent/[0.16]">
                        <QrCode size={13} /> Pagar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---------- Rodapé: empresa, plano e suporte em uma faixa ---------- */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="card glass-sheen p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-fg/[0.07] bg-fg/[0.03]">
                {empresa?.urlLogo ? <img src={empresa.urlLogo} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-5 w-5 text-muted" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] text-ink">{empresa?.nomeFantasia}</p>
                <p className="truncate text-[11px] text-faint">
                  {empresa?.cpfCnpj ? formatDocument(empresa.cpfCnpj) : "—"} · {empresa?.codigoEmpresa}
                </p>
              </div>
            </div>

            {podeTrocarPlano && (
              <button onClick={abrirTrocaDePlano} className="focus-ring mt-4 w-full rounded-xl border border-fg/[0.07] py-2 text-[12px] text-mist transition hover:bg-fg/[0.04] hover:text-ink">
                Trocar de plano antes de pagar
              </button>
            )}
          </div>

          <div className="card glass-sheen flex flex-col gap-2 p-5">
            <p className="text-[11px] uppercase tracking-[1.2px] text-faint">Precisa de ajuda?</p>

            {suporte?.linkWhatsapp && (
              <a href={suporte.linkWhatsapp} target="_blank" rel="noopener noreferrer" className="focus-ring flex items-center gap-2.5 rounded-xl border border-fg/[0.06] px-3.5 py-2.5 text-[13px] text-mist transition hover:bg-fg/[0.04] hover:text-ink">
                <MessageCircle size={15} className="text-muted" /> WhatsApp {suporte.whatsapp}
              </a>
            )}

            {suporte?.email && (
              <a href={`mailto:${suporte.email}`} className="focus-ring flex items-center gap-2.5 rounded-xl border border-fg/[0.06] px-3.5 py-2.5 text-[13px] text-mist transition hover:bg-fg/[0.04] hover:text-ink">
                <Mail size={15} className="text-muted" /> {suporte.email}
              </a>
            )}

            {!suporte?.linkWhatsapp && !suporte?.email && <p className="text-[13px] text-faint">Nenhum canal de suporte configurado.</p>}
          </div>
        </section>
      </div>

      {/* ==================== MODAL PIX ==================== */}
      <Modal
        open={!!faturaSelecionada}
        onClose={fecharModal}
        title="Pagamento via Pix"
        subtitle={faturaSelecionada ? `${competenciaBr(faturaSelecionada.competencia)} · ${formatCurrencyFromCents(faturaSelecionada.valorCentavos)}` : undefined}
        size="sm"
      >
        <div className="flex flex-col items-center">
          {pix?.copiaECola ? (
            <>
              {/* Cartão branco e QR preto: contraste é requisito de leitura. */}
              <div className="relative mb-4 rounded-2xl bg-white p-3 shadow-e2">
                <img src={qrCodeUrl} alt="QR Code do Pix" className="h-52 w-52 rounded-lg" onLoad={() => setQrLoading(false)} onError={() => setQrLoading(false)} />
                {qrLoading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white">
                    <Loader2 className="h-7 w-7 animate-spin text-accent" />
                  </div>
                )}
              </div>

              <p className="text-[13px] text-mist">Escaneie o QR Code ou copie o código</p>
              <p className="mt-1 text-center text-[11px] text-faint">
                {pix.beneficiario} · {pix.chave}
              </p>

              <button onClick={copiarPix} className="focus-ring mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm text-white transition-all hover:brightness-110">
                {copiado ? (
                  <>
                    <Check size={16} /> Código copiado
                  </>
                ) : (
                  <>
                    <Copy size={16} /> Copiar código Pix
                  </>
                )}
              </button>

              <details className="mt-3 w-full">
                <summary className="cursor-pointer list-none text-center text-[11px] text-faint transition-colors hover:text-mist">Ver o código completo</summary>
                <p className="mt-2 max-h-24 select-all overflow-y-auto break-all rounded-xl border border-fg/[0.07] bg-canvas p-3 font-mono text-[11px] leading-relaxed text-mist">{pix.copiaECola}</p>
              </details>
            </>
          ) : (
            <p className="py-6 text-center text-[13px] text-mist">A chave Pix ainda não foi configurada. Fale com o suporte para receber os dados de pagamento.</p>
          )}

          {faturaSelecionada && (
            <button
              onClick={() => avisarPagamento(faturaSelecionada)}
              disabled={enviando}
              className="focus-ring mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-success/30 bg-success/[0.1] py-3 text-sm text-success transition-all hover:bg-success/[0.18] disabled:opacity-60"
            >
              {enviando ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
              {suporte?.linkWhatsapp ? "Já paguei — enviar comprovante" : "Já paguei — avisar o suporte"}
            </button>
          )}

          <p className="mt-3 text-center text-[11px] leading-relaxed text-faint">Confirmamos o pagamento e liberamos seu acesso — normalmente em algumas horas.</p>
        </div>
      </Modal>

      {/* ==================== MODAL TROCA DE PLANO ==================== */}
      <Modal
        open={trocandoPlano}
        onClose={() => setTrocandoPlano(false)}
        title="Trocar de plano"
        subtitle={
          assinatura?.status === "ATIVA"
            ? "No upgrade geramos uma fatura só com a diferença. No downgrade não há cobrança: o preço menor vale no próximo ciclo."
            : "A fatura em aberto passa a valer o preço do novo plano."
        }
        size="sm"
      >
        {planos.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-mist">
            <Loader2 className="h-4 w-4 animate-spin text-accent" /> Carregando planos...
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {planos.map((p) => {
              const atual = p.codigo === plano?.codigo;

              return (
                <button
                  key={p.id}
                  onClick={() => trocarPlano(p.codigo)}
                  className={`focus-ring flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                    atual ? "border-accent/40 bg-accent/[0.08]" : "border-fg/[0.07] hover:border-accent/30 hover:bg-fg/[0.03]"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-[13px] text-ink">
                      {p.nome}
                      {atual && <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] text-accent-soft">Atual</span>}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-mist">{p.descricao}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[13px] tabular-nums text-ink">{formatCurrencyFromCents(p.precoCentavos)}</span>
                    <span className="block text-[10px] text-faint">{CICLO_LABEL[p.ciclo]}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CheckoutPage;
