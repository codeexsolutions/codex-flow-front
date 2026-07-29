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
  PartyPopper,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Modal } from "@/shared/ui/Modal";
import { useAlert } from "@/shared/ui/Alert";
import { formatCurrency } from "@/shared/utils/currency";
import { formatDocument } from "@/shared/utils/format";

import useAuth from "@/features/auth/store/auth.store";
import useEnterprise from "@/features/empresa/store/enterprise.store";
import type EnterpriseType from "@/shared/domain/empresa";
import type { FaturaType, FaturaStatus } from "@/shared/domain/fatura";
import { FaturaMeta, ehPagavel } from "@/shared/domain/fatura";

const PLANO = { nome: "Pro", preco: 149, ciclo: "Mensal" };

const PIX_CODE = "00020126580014BR.GOV.BCB.PIX0136codexflow@exemplo.com5204000053039865802BR5913CodEx Solutions6009Fortaleza62070503***6304ABCD";

type Filtro = "TODAS" | "A_PAGAR" | "PAGA";

/* ================================================================== */
/* UI auxiliar */
/* ================================================================== */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex shrink-0 items-center gap-2 text-[13px] text-mist">
        <span className="text-faint">{icon}</span>
        {label}
      </span>
      <span className="min-w-0 truncate text-right text-[13px] text-ink">{value || "—"}</span>
    </div>
  );
}

function FaturaStatusBadge({ status }: { status: FaturaStatus }) {
  const m = FaturaMeta[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] ring-1 ${m.bg} ${m.text} ${m.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function SectionCard({ title, icon, action, children, className = "" }: { title?: string; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-hidden card glass-sheen rounded-2xl/80 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-fg/[0.07] px-5 py-3.5">
          <p className="flex items-center gap-2 text-sm text-ink">
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
/* Página */
/* ================================================================== */
const CheckoutPage = () => {
  const navigate = useNavigate();
  const alert = useAlert();
  const { enterprise, loading } = useEnterprise() as { enterprise: EnterpriseType | null; loading?: boolean };
  const { user } = useAuth();

  // TODO: trocar por dados vindos do serviço de faturas
  const [faturas] = useState<FaturaType[]>([
    { id: "f4", competencia: "Ago/2026", vencimento: "10/08/2026", valor: 149, status: "PENDENTE" },
    { id: "f3", competencia: "Jul/2026", vencimento: "10/07/2026", valor: 149, status: "VENCIDA" },
    { id: "f2", competencia: "Jun/2026", vencimento: "10/06/2026", valor: 149, status: "PAGA" },
    { id: "f1", competencia: "Mai/2026", vencimento: "10/05/2026", valor: 149, status: "PAGA" },
  ]);

  const [filtro, setFiltro] = useState<Filtro>("TODAS");
  const [faturaSelecionada, setFaturaSelecionada] = useState<FaturaType | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [processando, setProcessando] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [mostrarPagas, setMostrarPagas] = useState(false);

  // Filtros
  const faturasPendentes = useMemo(() => faturas.filter(ehPagavel), [faturas]);
  const faturasPagas = useMemo(() => faturas.filter((f) => f.status === "PAGA"), [faturas]);

  const faturasFiltradas = useMemo(() => {
    if (filtro === "A_PAGAR") return faturasPendentes;
    if (filtro === "PAGA") return faturasPagas;
    return faturas;
  }, [faturas, filtro, faturasPendentes, faturasPagas]);

  const totalAPagar = useMemo(() => faturasPendentes.reduce((acc, f) => acc + f.valor, 0), [faturasPendentes]);
  const totalPago = useMemo(() => faturasPagas.reduce((acc, f) => acc + f.valor, 0), [faturasPagas]);
  const qtdAPagar = faturasPendentes.length;

  const proximaFatura = useMemo(() => {
    const vencidas = faturasPendentes.filter((f) => f.status === "VENCIDA");
    return vencidas[0] ?? faturasPendentes[0] ?? null;
  }, [faturasPendentes]);

  const end = enterprise?.endereco;
  const cont = enterprise?.contato;

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&color=7C6EF5&bgcolor=15132A&data=${encodeURIComponent(PIX_CODE)}`;

  const abrirPagamento = (f: FaturaType) => {
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
    <div className="relative w-full text-ink">
      {/* brilho decorativo */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(124,110,245,0.15),transparent_70%)]" />

      {/* Cabeçalho */}
      <header className="sticky top-0 z-20 border-b border-fg/[0.07] bg-canvas/70 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-5 py-3.5 lg:px-8">
          <button onClick={() => navigate(-1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-fg/[0.08] bg-fg/[0.04] text-mist transition-colors hover:bg-fg/[0.08]">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/25 to-accent-soft/10">
            <Receipt className="h-5 w-5 text-accent-soft" />
          </div>
          <div>
            <h1 className="text-lg tracking-tight text-ink">Faturamento</h1>
            <p className="text-xs text-faint">Assinatura e pagamentos</p>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <div className="relative z-10 mx-auto max-w-6xl px-5 py-8 lg:px-8">
        <div className="flex flex-col gap-6">
          {/* Banner de boas-vindas para contas inativas */}
          {user && !user.ativo && (
            <div className="overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-r from-accent/[0.15] via-accent/[0.08] to-transparent p-5">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/25 text-accent-soft">
                  <PartyPopper className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] text-ink">Bem-vindo ao Codex Flow! 🎉</h2>
                  <p className="mt-1 text-sm leading-relaxed text-mist">
                    Sua conta foi criada com sucesso! Faça o <strong className="text-accent-soft">primeiro pagamento</strong> abaixo para ativar sua conta
                    e liberar todas as funcionalidades do sistema.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ===== Hero duplo: total pendente + total pago ===== */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Pendente */}
            <div className="relative overflow-hidden rounded-3xl border border-warning/25 bg-gradient-to-br from-warning/[0.16] via-warning/[0.05] to-transparent p-6 lg:p-7">
              <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-warning/15 blur-3xl" />
              <div className="relative">
                <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-warning">
                  <Clock size={14} /> Total em aberto
                </p>
                <p className="mt-1.5 text-4xl tracking-tight text-ink">{formatCurrency(totalAPagar)}</p>
                <p className="mt-1.5 text-sm text-mist">
                  {qtdAPagar > 0 ? `${qtdAPagar} ${qtdAPagar === 1 ? "fatura pendente" : "faturas pendentes"}` : "Nenhuma fatura pendente 🎉"}
                </p>
              </div>
            </div>

            {/* Pago */}
            <div className="relative overflow-hidden rounded-3xl border border-success/25 bg-gradient-to-br from-success/[0.16] via-success/[0.05] to-transparent p-6 lg:p-7">
              <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-success/15 blur-3xl" />
              <div className="relative">
                <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-success">
                  <CircleCheck size={14} /> Total pago
                </p>
                <p className="mt-1.5 text-4xl tracking-tight text-ink">{formatCurrency(totalPago)}</p>
                <p className="mt-1.5 text-sm text-mist">
                  {faturasPagas.length} {faturasPagas.length === 1 ? "fatura paga" : "faturas pagas"}
                </p>
              </div>
            </div>
          </div>

          {/* Botão de pagamento rápido */}
          {proximaFatura && (
            <button
              onClick={() => abrirPagamento(proximaFatura)}
              disabled={processando === proximaFatura.id}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-accent to-accent-strong py-4 text-sm text-white shadow-lg shadow-accent/25 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-70"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              {processando === proximaFatura.id ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <QrCode size={18} /> Pagar {proximaFatura.status === "VENCIDA" ? "fatura vencida" : "próxima fatura"} — {formatCurrency(proximaFatura.valor)}
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          )}

          {/* ===== Grade: faturas + empresa ===== */}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            {/* Coluna principal */}
            <div className="flex flex-col gap-6">
              {/* Filtros */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1 rounded-lg bg-fg/[0.04] p-1">
                  {(
                    [
                      ["TODAS", "Todas"],
                      ["A_PAGAR", "A pagar"],
                      ["PAGA", "Pagas"],
                    ] as [Filtro, string][]
                  ).map(([id, label]) => (
                    <button key={id} onClick={() => setFiltro(id)} className={`rounded-md px-3 py-1.5 text-[11px] transition-colors ${filtro === id ? "bg-accent text-white" : "text-mist hover:text-ink"}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-faint">
                  {faturasFiltradas.length} {faturasFiltradas.length === 1 ? "fatura" : "faturas"}
                </span>
              </div>

              {/* Lista de faturas */}
              <div className="flex flex-col gap-2">
                {/* Pendentes em destaque */}
                {filtro !== "PAGA" && faturasPendentes.length > 0 && (
                  <SectionCard
                    title={filtro === "A_PAGAR" ? undefined : "A pagar"}
                    icon={filtro === "A_PAGAR" ? undefined : <AlertTriangle size={14} className="text-warning" />}
                  >
                    <div className="divide-y divide-fg/[0.05]">
                      {faturasPendentes.map((f) => {
                        const carregando = processando === f.id;
                        return (
                          <div key={f.id} className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-fg/[0.02]">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${f.status === "VENCIDA" ? "border-danger/30 bg-danger/15 text-danger" : "border-warning/30 bg-warning/15 text-warning"}`}>
                                <Receipt size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm text-ink">{f.competencia}</p>
                                <p className="text-[11px] text-faint">Vencimento {f.vencimento}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="text-sm text-ink">{formatCurrency(f.valor)}</p>
                                <FaturaStatusBadge status={f.status} />
                              </div>
                              <button onClick={() => abrirPagamento(f)} disabled={carregando} className="flex h-9 items-center gap-1.5 rounded-xl bg-accent px-3 text-xs text-white transition-all hover:bg-accent active:scale-95 disabled:opacity-70">
                                {carregando ? <Loader2 size={14} className="animate-spin" /> : <><QrCode size={14} /> Pagar</>}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </SectionCard>
                )}

                {/* Pagas (colapsável) */}
                {filtro !== "A_PAGAR" && faturasPagas.length > 0 && (
                  <SectionCard
                    title="Pagas"
                    icon={<CircleCheck size={14} className="text-success" />}
                    action={
                      <button
                        onClick={() => setMostrarPagas(!mostrarPagas)}
                        className="flex items-center gap-1 text-[11px] text-mist transition-colors hover:text-ink"
                      >
                        {mostrarPagas ? "Ocultar" : `${faturasPagas.length} pagas`}
                        {mostrarPagas ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    }
                  >
                    {mostrarPagas && (
                      <div className="divide-y divide-fg/[0.05]">
                        {faturasPagas.map((f) => (
                          <div key={f.id} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-fg/[0.02]">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-success/30 bg-success/15 text-success">
                                <Receipt size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm text-ink">{f.competencia}</p>
                                <p className="text-[11px] text-faint">Vencimento {f.vencimento}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-ink">{formatCurrency(f.valor)}</p>
                              <FaturaStatusBadge status={f.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {!mostrarPagas && (
                      <div className="px-5 py-3 text-center text-[11px] text-faint">
                        {faturasPagas.length} {faturasPagas.length === 1 ? "fatura paga" : "faturas pagas"} — clique para exibir
                      </div>
                    )}
                  </SectionCard>
                )}

                {faturasFiltradas.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-fg/[0.12] px-6 py-14 text-center text-sm text-faint">Nenhuma fatura neste filtro.</div>
                )}
              </div>

              <SectionCard title="Formas de pagamento" icon={<CreditCard size={15} className="text-accent-soft" />}>
                <div className="flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between rounded-xl border border-accent/30 bg-accent/[0.08] px-4 py-3">
                    <span className="flex items-center gap-2.5 text-sm text-ink">
                      <QrCode size={16} className="text-accent-soft" /> Pix
                    </span>
                    <span className="rounded-full bg-success/25 px-2.5 py-0.5 text-[11px] text-success ring-1 ring-success/25">Disponível</span>
                  </div>
                  {[
                    { icon: <CreditCard size={16} />, label: "Cartão de crédito" },
                    { icon: <Barcode size={16} />, label: "Boleto" },
                  ].map((m) => (
                    <div key={m.label} className="flex items-center justify-between rounded-xl border border-fg/[0.06] bg-fg/[0.02] px-4 py-3 opacity-60">
                      <span className="flex items-center gap-2.5 text-sm text-mist">
                        {m.icon} {m.label}
                      </span>
                      <span className="rounded-full bg-fg/[0.06] px-2.5 py-0.5 text-[11px] text-mist">Em breve</span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            {/* Coluna aside: empresa */}
            <div className="flex flex-col gap-6 lg:sticky lg:top-24">
              <SectionCard>
                <div className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/25 to-accent-soft/10">
                      {enterprise?.urlLogo || enterprise?.urlImagem ? <img src={enterprise.urlLogo || enterprise.urlImagem} alt={enterprise.nomeFantasia} className="h-full w-full object-cover" /> : <Building2 className="h-6 w-6 text-accent-soft" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base text-ink">{enterprise?.nomeFantasia || (loading ? "Carregando…" : "—")}</p>
                      <div className="mt-1 flex items-center gap-2">
                        {enterprise?.ativo ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/25 px-2 py-0.5 text-[10px] text-success ring-1 ring-success/25">
                            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Conta ativa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-danger/20 px-2 py-0.5 text-[10px] text-danger ring-1 ring-danger/25">
                            <span className="h-1.5 w-1.5 rounded-full bg-danger" /> Inativa
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col divide-y divide-fg/[0.05]">
                    <InfoRow icon={<Hash size={14} />} label="Código" value={enterprise?.codigoEmpresa} />
                    <InfoRow icon={<FileText size={14} />} label="CNPJ" value={enterprise?.cpfCnpj ? formatDocument(enterprise.cpfCnpj) : undefined} />
                    <InfoRow icon={<User size={14} />} label="Representante" value={enterprise?.nomeRepresentante} />
                    {enterprise?.inscMunicipal && <InfoRow icon={<FileText size={14} />} label="Insc. Municipal" value={enterprise.inscMunicipal} />}
                  </div>
                </div>
              </SectionCard>

              {end && (
                <SectionCard title="Endereço" icon={<MapPin size={15} className="text-accent-soft" />}>
                  <div className="px-5 py-3">
                    <p className="text-sm leading-relaxed text-mist">
                      {end.logradouro}, {end.numero}
                      {end.complemento ? ` — ${end.complemento}` : ""}
                      <br />
                      {end.bairro} · {end.cidade}/{end.uf}
                      <br />
                      <span className="text-mist">CEP {end.cep}</span>
                    </p>
                  </div>
                </SectionCard>
              )}

              {cont && (cont.telefone || cont.celular || cont.whatsapp || cont.email) && (
                <SectionCard title="Contato" icon={<Phone size={15} className="text-accent-soft" />}>
                  <div className="flex flex-col divide-y divide-fg/[0.05] px-5">
                    {cont.telefone != null && <InfoRow icon={<Phone size={14} />} label="Telefone" value={String(cont.telefone)} />}
                    {cont.celular && <InfoRow icon={<Smartphone size={14} />} label="Celular" value={cont.celular} />}
                    {cont.whatsapp && <InfoRow icon={<MessageCircle size={14} />} label="WhatsApp" value={cont.whatsapp} />}
                    {cont.email && <InfoRow icon={<Mail size={14} />} label="E-mail" value={cont.email} />}
                  </div>
                </SectionCard>
              )}

              <SectionCard>
                <div className="flex items-center justify-between gap-3 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/25 to-accent-soft/10">
                      <Sparkles className="h-5 w-5 text-accent-soft" />
                    </div>
                    <div>
                      <p className="text-sm text-ink">Plano {PLANO.nome}</p>
                      <p className="text-xs text-faint">{PLANO.ciclo}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg text-ink">{formatCurrency(PLANO.preco)}</p>
                    <p className="text-[11px] text-faint">/mês</p>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== MODAL PIX ==================== */}
      <Modal open={!!faturaSelecionada} onClose={fecharModal} title="Pagamento via Pix" subtitle={faturaSelecionada ? `${faturaSelecionada.competencia} · ${formatCurrency(faturaSelecionada.valor)}` : undefined} accent="rgb(var(--accent))" size="sm">
        <div className="flex flex-col items-center">
          <div className="relative mb-5 rounded-3xl bg-white p-4 shadow-2xl">
            <img src={qrCodeUrl} alt="QR Code Pix" className="h-56 w-56 rounded-2xl" onLoad={() => setQrLoading(false)} onError={() => setQrLoading(false)} />
            {qrLoading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/50">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>

          <p className="mb-4 text-center text-sm text-mist">Escaneie o QR Code ou copie o código abaixo</p>

          <div className="w-full select-all break-all rounded-2xl border border-fg/[0.08] bg-canvas p-4 font-mono text-xs text-mist">{PIX_CODE}</div>

          <button onClick={copiarPix} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 text-white transition-colors hover:bg-accent">
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

          <p className="mt-4 text-center text-xs text-faint">O pagamento é confirmado automaticamente em poucos segundos.</p>
        </div>
      </Modal>
    </div>
  );
};

export default CheckoutPage;
