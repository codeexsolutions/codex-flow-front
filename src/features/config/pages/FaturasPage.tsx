import { useMemo, useState } from "react";
import { Receipt, Crown, QrCode, Check, Copy, Loader2, ArrowRight, FileText, CircleCheck, Clock, Sparkles, Hash, Building2 } from "lucide-react";
import { Modal } from "@/shared/ui/Modal";
import { useAlert } from "@/shared/ui/Alert";
import { formatCurrency } from "@/shared/utils/currency";
import { formatDocument } from "@/shared/utils/format";
import useAuth from "@/features/auth/store/auth.store";
import useEnterprise from "@/features/empresa/store/enterprise.store";
import { getPixSettings, generatePixPayload, getQrCodeUrl } from "@/shared/utils/pix";

const ASSINATURA = {
  nome: "Codex Flow Pro",
  valor: 72.9,
  ciclo: "Mensal",
};

type FaturaStatus = "PAGA" | "PENDENTE" | "VENCIDA" | "CANCELADA";
type FaturaType = {
  id: string;
  competencia: string;
  vencimento: string;
  valor: number;
  status: FaturaStatus;
  pagamento?: string;
};

const STATUS_META: Record<FaturaStatus, { label: string; text: string; bg: string; ring: string; dot: string }> = {
  PAGA: { label: "Paga", text: "text-success", bg: "bg-success/20", ring: "ring-success/25", dot: "bg-success" },
  PENDENTE: { label: "Pendente", text: "text-warning", bg: "bg-warning/20", ring: "ring-warning/25", dot: "bg-warning" },
  VENCIDA: { label: "Vencida", text: "text-danger", bg: "bg-danger/20", ring: "ring-danger/25", dot: "bg-danger" },
  CANCELADA: { label: "Cancelada", text: "text-mist", bg: "bg-fg/[0.06]", ring: "ring-fg/[0.1]", dot: "bg-faint" },
};

function StatusBadge({ status }: { status: FaturaStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] ring-1 ${m.bg} ${m.text} ${m.ring}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

/* Dados mockados — substituir pelo service quando o backend estiver pronto */
const MOCK_FATURAS: FaturaType[] = [
  { id: "f6", competencia: "Set/2026", vencimento: "10/09/2026", valor: 72.9, status: "PENDENTE" },
  { id: "f5", competencia: "Ago/2026", vencimento: "10/08/2026", valor: 72.9, status: "PENDENTE" },
  { id: "f4", competencia: "Jul/2026", vencimento: "10/07/2026", valor: 72.9, status: "VENCIDA" },
  { id: "f3", competencia: "Jun/2026", vencimento: "10/06/2026", valor: 72.9, status: "PAGA", pagamento: "15/06/2026" },
  { id: "f2", competencia: "Mai/2026", vencimento: "10/05/2026", valor: 72.9, status: "PAGA", pagamento: "12/05/2026" },
  { id: "f1", competencia: "Abr/2026", vencimento: "10/04/2026", valor: 72.9, status: "PAGA", pagamento: "08/04/2026" },
];

type Filtro = "TODAS" | "A_PAGAR" | "PAGA";

const FaturasPage = () => {
  const alert = useAlert();
  const { user } = useAuth();
  const { enterprise } = useEnterprise();

  const [faturas] = useState<FaturaType[]>(MOCK_FATURAS);
  const [filtro, setFiltro] = useState<Filtro>("TODAS");
  const [faturaSelecionada, setFaturaSelecionada] = useState<FaturaType | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [processando, setProcessando] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [mostrarPagas, setMostrarPagas] = useState(false);
  const [pixPayload, setPixPayload] = useState("");

  const pendentes = useMemo(() => faturas.filter((f) => f.status !== "PAGA" && f.status !== "CANCELADA"), [faturas]);
  const pagas = useMemo(() => faturas.filter((f) => f.status === "PAGA"), [faturas]);

  const filtradas = useMemo(() => {
    if (filtro === "A_PAGAR") return pendentes;
    if (filtro === "PAGA") return pagas;
    return faturas;
  }, [faturas, filtro, pendentes, pagas]);

  const totalAPagar = useMemo(() => pendentes.reduce((a, f) => a + f.valor, 0), [pendentes]);
  const totalPago = useMemo(() => pagas.reduce((a, f) => a + f.valor, 0), [pagas]);
  const qtdPendentes = pendentes.length;

  const proximaFatura = useMemo(() => {
    const vencidas = pendentes.filter((f) => f.status === "VENCIDA");
    return vencidas[0] ?? pendentes[0] ?? null;
  }, [pendentes]);

  const qrCodeUrl = pixPayload ? getQrCodeUrl(pixPayload) : "";

  const abrirPagamento = (f: FaturaType) => {
    setProcessando(f.id);
    // Gera payload PIX dinâmico
    const pixSettings = getPixSettings();
    if (pixSettings) {
      const payload = generatePixPayload({
        pixKey: pixSettings.key,
        pixKeyType: pixSettings.keyType,
        merchantName: pixSettings.ownerName,
        merchantCity: pixSettings.city,
        amount: f.valor,
        transactionId: f.id,
        description: `Codex Flow - ${f.competencia}`,
      });
      setPixPayload(payload);
    } else {
      setPixPayload("");
    }
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
      await navigator.clipboard.writeText(pixPayload);
      setCopiado(true);
      alert.success("Código copiado!", "Cole no app do seu banco.");
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      alert.error("Falha ao copiar", "Copie manualmente.");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-y-auto xl:grid-cols-3">
        {/* Grade principal */}
        <div className="flex min-w-0 flex-col gap-5 xl:col-span-2">
          {/* Resumo da assinatura */}
          <div className="relative overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/[0.12] to-transparent p-5">
            <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-accent/15 blur-3xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-accent-soft">
                  <Sparkles size={14} /> Plano atual
                </p>
                <h2 className="mt-1 text-lg text-ink">{ASSINATURA.nome}</h2>
                <p className="text-[13px] text-mist">
                  <span className="text-2xl tracking-tight text-ink">{formatCurrency(ASSINATURA.valor)}</span>
                  <span className="text-faint">/{ASSINATURA.ciclo.toLowerCase()}</span>
                </p>
              </div>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/20">
                <Crown size={24} className="text-accent-soft" />
              </div>
            </div>
          </div>

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
              {filtradas.length} {filtradas.length === 1 ? "fatura" : "faturas"}
            </span>
          </div>

          {/* Pendentes em destaque */}
          {filtro !== "PAGA" && pendentes.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-fg/[0.07] bg-surface">
              <div className="border-b border-fg/[0.06] px-5 py-3">
                <p className="flex items-center gap-2 text-[13px] text-ink">
                  <Clock size={15} className="text-warning" /> A pagar
                </p>
              </div>
              <div className="divide-y divide-fg/[0.05]">
                {pendentes.map((f) => {
                  const carregando = processando === f.id;
                  return (
                    <div key={f.id} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-fg/[0.02]">
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
                          <StatusBadge status={f.status} />
                        </div>
                        <button onClick={() => abrirPagamento(f)} disabled={carregando} className="flex h-9 items-center gap-1.5 rounded-xl bg-accent px-3 text-xs text-white transition-all hover:bg-accent active:scale-95 disabled:opacity-70">
                          {carregando ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <>
                              <QrCode size={14} /> Pagar
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pagas — colapsável */}
          {filtro !== "A_PAGAR" && pagas.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-fg/[0.07] bg-surface">
              <button onClick={() => setMostrarPagas(!mostrarPagas)} className="flex w-full items-center justify-between gap-3 border-b border-fg/[0.06] px-5 py-3 text-left transition-colors hover:bg-fg/[0.02]">
                <p className="flex items-center gap-2 text-[13px] text-ink">
                  <CircleCheck size={15} className="text-success" /> Pagas
                </p>
                <span className="text-[11px] text-mist">{mostrarPagas ? "Ocultar" : `${pagas.length} ${pagas.length === 1 ? "fatura" : "faturas"}`}</span>
              </button>
              {mostrarPagas && (
                <div className="divide-y divide-fg/[0.05]">
                  {pagas.map((f) => (
                    <div key={f.id} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-fg/[0.02]">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-success/30 bg-success/15 text-success">
                          <Receipt size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm text-ink">{f.competencia}</p>
                          <p className="text-[11px] text-faint">Paga em {f.pagamento}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-ink">{formatCurrency(f.valor)}</p>
                        <StatusBadge status={f.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {filtradas.length === 0 && <div className="rounded-2xl border border-dashed border-fg/[0.12] px-6 py-14 text-center text-sm text-faint">Nenhuma fatura neste filtro.</div>}
        </div>

        {/* Aside — resumo financeiro */}
        <aside className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-0">
          <div className="overflow-hidden rounded-2xl border border-fg/[0.08] bg-gradient-to-b from-surface-raised to-surface p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/25 to-accent-soft/10">
                {enterprise?.urlLogo ? <img src={enterprise.urlLogo} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-6 w-6 text-accent-soft" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{enterprise?.nomeFantasia || user?.nome || "—"}</p>
                <p className="text-[11px] text-faint">{user?.email || "—"}</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-fg/[0.06] bg-fg/[0.03] px-4 py-3">
                <span className="flex items-center gap-2 text-[12px] text-mist">
                  <Hash size={13} className="text-faint" /> Código
                </span>
                <span className="text-[12px] text-ink">{enterprise?.codigoEmpresa || "—"}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-fg/[0.06] bg-fg/[0.03] px-4 py-3">
                <span className="flex items-center gap-2 text-[12px] text-mist">
                  <FileText size={13} className="text-faint" /> CNPJ
                </span>
                <span className="text-[12px] text-ink">{enterprise?.cpfCnpj ? formatDocument(enterprise.cpfCnpj) : "—"}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-warning/20 bg-warning/[0.08] p-4">
              <p className="flex items-center gap-1.5 text-[11px] text-warning">
                <Clock size={14} /> Pendente
              </p>
              <p className="mt-1 text-xl text-ink">{formatCurrency(totalAPagar)}</p>
              <p className="text-[11px] text-faint">
                {qtdPendentes} {qtdPendentes === 1 ? "fatura" : "faturas"}
              </p>
            </div>
            <div className="rounded-xl border border-success/20 bg-success/[0.08] p-4">
              <p className="flex items-center gap-1.5 text-[11px] text-success">
                <CircleCheck size={14} /> Pago
              </p>
              <p className="mt-1 text-xl text-ink">{formatCurrency(totalPago)}</p>
              <p className="text-[11px] text-faint">
                {pagas.length} {pagas.length === 1 ? "fatura" : "faturas"}
              </p>
            </div>
          </div>

          {proximaFatura && (
            <button onClick={() => abrirPagamento(proximaFatura)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-accent to-accent-strong py-3.5 text-sm text-white shadow-lg shadow-accent/25 transition-all hover:brightness-110 active:scale-[0.99]">
              <QrCode size={18} /> Pagar agora
              <ArrowRight size={16} />
            </button>
          )}
        </aside>
      </div>

      {/* Modal Pix */}
      <Modal open={!!faturaSelecionada} onClose={fecharModal} title="Pagamento via Pix" subtitle={faturaSelecionada ? `${faturaSelecionada.competencia} · ${formatCurrency(faturaSelecionada.valor)}` : undefined} accent="rgb(var(--accent))" size="sm">
        <div className="flex flex-col items-center">
          <div className="relative mb-5 rounded-3xl bg-white p-4 shadow-2xl">
            <img src={qrCodeUrl} alt="QR Code" className="h-56 w-56 rounded-2xl" onLoad={() => setQrLoading(false)} onError={() => setQrLoading(false)} />
            {qrLoading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/50">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>
          <p className="mb-4 text-center text-sm text-mist">Escaneie o QR Code ou copie o código abaixo</p>
          <div className="w-full select-all break-all rounded-2xl border border-fg/[0.08] bg-canvas p-4 font-mono text-xs text-mist">{pixPayload || "Configure sua chave PIX em Configurações"}</div>
          <button onClick={copiarPix} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 text-white transition-colors hover:bg-accent">
            {copiado ? (
              <>
                <Check size={18} /> Copiado!
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

export default FaturasPage;
