import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Building2,
  Receipt,
  Loader2,
  FileText,
  User,
  Hash,
  MapPin,
  Phone,
  Smartphone,
  MessageCircle,
  Mail,
  QrCode,
  CreditCard,
  Barcode,
  Check,
  Copy,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Modal } from "../components/Modal";
import { useAlert } from "../components/Alert/Alert";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDocument } from "../utils/format";

import useEnterprise from "../store/enterprise.store";
import type EnterpriseType from "../types/EnterpriseType";

const PLANO = { nome: "Pro", preco: 149, ciclo: "Mensal" };

const PIX_CODE =
  "00020126580014BR.GOV.BCB.PIX0136codexflow@exemplo.com5204000053039865802BR5913CodEx Solutions6009Fortaleza62070503***6304ABCD";

type FaturaStatus = "PAGA" | "PENDENTE" | "VENCIDA";
type Fatura = {
  id: string;
  competencia: string;
  vencimento: string;
  valor: number;
  status: FaturaStatus;
};

type Filtro = "TODAS" | "A_PAGAR" | "PAGA";

const statusMeta: Record<FaturaStatus, { label: string; text: string; bg: string; ring: string; dot: string }> = {
  PAGA: {
    label: "Paga",
    text: "text-[#5dcaa5]",
    bg: "bg-[#0f6e56]/20",
    ring: "ring-[#5dcaa5]/25",
    dot: "bg-[#5dcaa5]",
  },
  PENDENTE: {
    label: "Pendente",
    text: "text-[#fac775]",
    bg: "bg-[#ba7517]/20",
    ring: "ring-[#fac775]/25",
    dot: "bg-[#fac775]",
  },
  VENCIDA: {
    label: "Vencida",
    text: "text-[#f09595]",
    bg: "bg-[#a22d2d]/20",
    ring: "ring-[#f09595]/25",
    dot: "bg-[#f09595]",
  },
};

const ehPagavel = (f: Fatura) => f.status !== "PAGA";

/* ================================================================== */
/*  UI auxiliar                                                        */
/* ================================================================== */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex shrink-0 items-center gap-2 text-[13px] text-[#8a86b0]">
        <span className="text-[#6f6a93]">{icon}</span>
        {label}
      </span>
      <span className="min-w-0 truncate text-right text-[13px] font-medium text-[#e8e4ff]">{value || "—"}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: FaturaStatus }) {
  const m = statusMeta[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${m.bg} ${m.text} ${m.ring}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function SectionCard({
  title,
  icon,
  action,
  children,
  className = "",
}: {
  title?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-white/[0.08] bg-[#15132a]/80 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-3.5">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#f1eeff]">
            {icon}
            {title}
          </p>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/* ================================================================== */
/*  Página                                                            */
/* ================================================================== */
const CheckoutPage = () => {
  const navigate = useNavigate();
  const alert = useAlert();
  const { enterprise, loading } = useEnterprise() as { enterprise: EnterpriseType | null; loading?: boolean };

  // TODO: trocar por dados vindos do seu serviço de faturas
  const [faturas] = useState<Fatura[]>([
    { id: "f4", competencia: "Ago/2026", vencimento: "10/08/2026", valor: 149, status: "PENDENTE" },
    { id: "f3", competencia: "Jul/2026", vencimento: "10/07/2026", valor: 149, status: "VENCIDA" },
    { id: "f2", competencia: "Jun/2026", vencimento: "10/06/2026", valor: 149, status: "PAGA" },
    { id: "f1", competencia: "Mai/2026", vencimento: "10/05/2026", valor: 149, status: "PAGA" },
  ]);

  const [filtro, setFiltro] = useState<Filtro>("TODAS");
  const [faturaSelecionada, setFaturaSelecionada] = useState<Fatura | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [processando, setProcessando] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const faturasFiltradas = useMemo(() => {
    if (filtro === "A_PAGAR") return faturas.filter(ehPagavel);
    if (filtro === "PAGA") return faturas.filter((f) => f.status === "PAGA");
    return faturas;
  }, [faturas, filtro]);

  const totalAPagar = useMemo(() => faturas.filter(ehPagavel).reduce((acc, f) => acc + f.valor, 0), [faturas]);
  const qtdAPagar = faturas.filter(ehPagavel).length;

  const proximaFatura = useMemo(() => {
    const abertas = faturas.filter(ehPagavel);
    const vencidas = abertas.filter((f) => f.status === "VENCIDA");
    return vencidas[0] ?? abertas[0] ?? null;
  }, [faturas]);

  const end = enterprise?.endereco;
  const cont = enterprise?.contato;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&color=7C6EF5&bgcolor=15132A&data=${encodeURIComponent(
    PIX_CODE,
  )}`;

  const abrirPagamento = (f: Fatura) => {
    if (!ehPagavel(f)) return;
    setProcessando(f.id);
    setTimeout(() => {
      setProcessando(null);
      setQrLoading(true);
      setFaturaSelecionada(f);
    }, 400);
  };

  const fecharModal = () => {
    setFaturaSelecionada(null);
    setCopiado(false);
  };

  const copiarPix = async () => {
    try {
      await navigator.clipboard.writeText(PIX_CODE);
      setCopiado(true);
      alert.success("Código copiado!", "Cole no aplicativo do seu banco.");
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      alert.error("Falha ao copiar", "Copie o código manualmente.");
    }
  };

  return (
    // Sem h-screen / overflow próprios: a página flui dentro do shell e quem rola é o layout.
    <div className="relative w-full text-[#e8e4ff]">
      {/* brilho decorativo (não interfere no scroll) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(124,110,245,0.15),transparent_70%)]" />

      {/* Cabeçalho — cola no topo ao rolar */}
      <header className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#0e0d1a]/70 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-5 py-3.5 lg:px-8">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-[#b7b2d8] transition-colors hover:bg-white/[0.08]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#7c6ef5]/25 bg-gradient-to-br from-[#7c6ef5]/25 to-[#a78bfa]/10">
            <Receipt className="h-5 w-5 text-[#b7aef9]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[#f1eeff]">Faturamento</h1>
            <p className="text-xs text-[#6f6a93]">Assinatura e pagamentos</p>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <div className="relative z-10 mx-auto max-w-6xl px-5 py-8 lg:px-8">
        <div className="flex flex-col gap-6">
          {/* ===== Hero: total em aberto ===== */}
          <div className="relative overflow-hidden rounded-3xl border border-[#7c6ef5]/25 bg-gradient-to-br from-[#7c6ef5]/[0.16] via-[#7c6ef5]/[0.05] to-transparent p-6 lg:p-7">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#7c6ef5]/20 blur-3xl" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-[#a99ff0]">Total em aberto</p>
                <p className="mt-1.5 text-4xl font-semibold tracking-tight text-[#f1eeff]">
                  {formatCurrency(totalAPagar)}
                </p>
                <p className="mt-1.5 text-sm text-[#8a86b0]">
                  {qtdAPagar > 0
                    ? `${qtdAPagar} ${qtdAPagar === 1 ? "fatura pendente" : "faturas pendentes"}`
                    : "Tudo em dia — nenhuma fatura em aberto 🎉"}
                </p>
              </div>
              {proximaFatura ? (
                <button
                  onClick={() => abrirPagamento(proximaFatura)}
                  disabled={processando === proximaFatura.id}
                  className="group flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#7c6ef5] to-[#8b7bf7] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#7c6ef5]/25 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-70 sm:min-w-[190px]"
                >
                  {processando === proximaFatura.id ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <QrCode size={17} /> Pagar via Pix
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0f6e56]/20 ring-1 ring-[#5dcaa5]/25">
                  <Check className="h-6 w-6 text-[#5dcaa5]" />
                </div>
              )}
            </div>
          </div>

          {/* ===== Grade: faturas (principal) + empresa (aside) ===== */}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            {/* -------- Coluna principal -------- */}
            <div className="flex flex-col gap-6">
              <SectionCard
                title="Suas faturas"
                icon={<FileText size={15} className="text-[#b7aef9]" />}
                action={
                  <div className="flex gap-1 rounded-lg bg-white/[0.04] p-1">
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
                        className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          filtro === id ? "bg-[#7c6ef5] text-white" : "text-[#8a86b0] hover:text-[#e8e4ff]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                }
              >
                <div className="divide-y divide-white/[0.05]">
                  {faturasFiltradas.length > 0 ? (
                    faturasFiltradas.map((f) => {
                      const pagavel = ehPagavel(f);
                      const carregando = processando === f.id;
                      return (
                        <div
                          key={f.id}
                          className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-white/[0.02]"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-[#8a86b0]">
                              <Receipt size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-[#e8e4ff]">{f.competencia}</p>
                              <p className="text-[11px] text-[#6f6a93]">Vencimento {f.vencimento}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm font-semibold text-[#f1eeff]">{formatCurrency(f.valor)}</p>
                              <StatusBadge status={f.status} />
                            </div>
                            {pagavel && (
                              <button
                                onClick={() => abrirPagamento(f)}
                                disabled={carregando}
                                className="flex h-9 items-center gap-1.5 rounded-xl bg-[#7c6ef5] px-3 text-xs font-semibold text-white transition-all hover:bg-[#8b7bf7] active:scale-95 disabled:opacity-70"
                              >
                                {carregando ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <>
                                    <QrCode size={14} /> Pagar
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-6 py-14 text-center text-sm text-[#6f6a93]">Nenhuma fatura neste filtro.</div>
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Formas de pagamento" icon={<CreditCard size={15} className="text-[#b7aef9]" />}>
                <div className="flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between rounded-xl border border-[#7c6ef5]/30 bg-[#7c6ef5]/[0.08] px-4 py-3">
                    <span className="flex items-center gap-2.5 text-sm font-medium text-[#e8e4ff]">
                      <QrCode size={16} className="text-[#b7aef9]" /> Pix
                    </span>
                    <span className="rounded-full bg-[#0f6e56]/25 px-2.5 py-0.5 text-[11px] font-medium text-[#5dcaa5] ring-1 ring-[#5dcaa5]/25">
                      Disponível
                    </span>
                  </div>
                  {[
                    { icon: <CreditCard size={16} />, label: "Cartão de crédito" },
                    { icon: <Barcode size={16} />, label: "Boleto" },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 opacity-60"
                    >
                      <span className="flex items-center gap-2.5 text-sm text-[#8a86b0]">
                        {m.icon} {m.label}
                      </span>
                      <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] text-[#8a86b0]">
                        Em breve
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            {/* -------- Coluna aside: empresa -------- */}
            <div className="flex flex-col gap-6 lg:sticky lg:top-24">
              <SectionCard>
                <div className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#7c6ef5]/30 bg-gradient-to-br from-[#7c6ef5]/25 to-[#a78bfa]/10">
                      {enterprise?.urlLogo || enterprise?.urlImagem ? (
                        <img
                          src={enterprise.urlLogo || enterprise.urlImagem}
                          alt={enterprise.nomeFantasia}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Building2 className="h-6 w-6 text-[#b7aef9]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-[#f1eeff]">
                        {enterprise?.nomeFantasia || (loading ? "Carregando…" : "—")}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        {enterprise?.ativo ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#0f6e56]/25 px-2 py-0.5 text-[10px] font-medium text-[#5dcaa5] ring-1 ring-[#5dcaa5]/25">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#5dcaa5]" /> Conta ativa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#a22d2d]/20 px-2 py-0.5 text-[10px] font-medium text-[#f09595] ring-1 ring-[#f09595]/25">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#f09595]" /> Inativa
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col divide-y divide-white/[0.05]">
                    <InfoRow icon={<Hash size={14} />} label="Código" value={enterprise?.codigoEmpresa} />
                    <InfoRow
                      icon={<FileText size={14} />}
                      label="CNPJ"
                      value={enterprise?.cpfCnpj ? formatDocument(enterprise.cpfCnpj) : undefined}
                    />
                    <InfoRow icon={<User size={14} />} label="Representante" value={enterprise?.nomeRepresentante} />
                    {enterprise?.inscMunicipal && (
                      <InfoRow icon={<FileText size={14} />} label="Insc. Municipal" value={enterprise.inscMunicipal} />
                    )}
                  </div>
                </div>
              </SectionCard>

              {end && (
                <SectionCard title="Endereço" icon={<MapPin size={15} className="text-[#b7aef9]" />}>
                  <div className="px-5 py-3">
                    <p className="text-sm leading-relaxed text-[#cfcbe8]">
                      {end.logradouro}, {end.numero}
                      {end.complemento ? ` — ${end.complemento}` : ""}
                      <br />
                      {end.bairro} · {end.cidade}/{end.uf}
                      <br />
                      <span className="text-[#8a86b0]">CEP {end.cep}</span>
                    </p>
                  </div>
                </SectionCard>
              )}

              {cont && (cont.telefone || cont.celular || cont.whatsapp || cont.email) && (
                <SectionCard title="Contato" icon={<Phone size={15} className="text-[#b7aef9]" />}>
                  <div className="flex flex-col divide-y divide-white/[0.05] px-5">
                    {cont.telefone != null && (
                      <InfoRow icon={<Phone size={14} />} label="Telefone" value={String(cont.telefone)} />
                    )}
                    {cont.celular && <InfoRow icon={<Smartphone size={14} />} label="Celular" value={cont.celular} />}
                    {cont.whatsapp && (
                      <InfoRow icon={<MessageCircle size={14} />} label="WhatsApp" value={cont.whatsapp} />
                    )}
                    {cont.email && <InfoRow icon={<Mail size={14} />} label="E-mail" value={cont.email} />}
                  </div>
                </SectionCard>
              )}

              <SectionCard>
                <div className="flex items-center justify-between gap-3 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#7c6ef5]/30 bg-gradient-to-br from-[#7c6ef5]/25 to-[#a78bfa]/10">
                      <Sparkles className="h-5 w-5 text-[#b7aef9]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#f1eeff]">Plano {PLANO.nome}</p>
                      <p className="text-xs text-[#6f6a93]">{PLANO.ciclo}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-[#f1eeff]">{formatCurrency(PLANO.preco)}</p>
                    <p className="text-[11px] text-[#6f6a93]">/mês</p>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== MODAL PIX (usa o seu Modal) ==================== */}
      <Modal
        open={!!faturaSelecionada}
        onClose={fecharModal}
        title="Pagamento via Pix"
        subtitle={
          faturaSelecionada
            ? `${faturaSelecionada.competencia} · ${formatCurrency(faturaSelecionada.valor)}`
            : undefined
        }
        accent="#7c6ef5"
        size="sm"
      >
        <div className="flex flex-col items-center">
          <div className="relative mb-5 rounded-3xl bg-white p-4 shadow-2xl">
            <img
              src={qrCodeUrl}
              alt="QR Code Pix"
              className="h-56 w-56 rounded-2xl"
              onLoad={() => setQrLoading(false)}
              onError={() => setQrLoading(false)}
            />
            {qrLoading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/50">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>

          <p className="mb-4 text-center text-sm text-[#8a86b0]">Escaneie o QR Code ou copie o código abaixo</p>

          <div className="w-full select-all break-all rounded-2xl border border-white/[0.08] bg-[#0e0d1a] p-4 font-mono text-xs text-[#b7b2d8]">
            {PIX_CODE}
          </div>

          <button
            onClick={copiarPix}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7c6ef5] py-3.5 font-semibold text-white transition-colors hover:bg-[#8b7bf7]"
          >
            {copiado ? (
              <>
                <Check size={18} /> Copiado com sucesso!
              </>
            ) : (
              <>
                <Copy size={18} /> Copiar código Pix
              </>
            )}
          </button>

          <p className="mt-4 text-center text-xs text-[#6f6a93]">
            O pagamento é confirmado automaticamente em poucos segundos.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default CheckoutPage;
