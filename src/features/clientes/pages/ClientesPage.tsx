import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Search, AlertTriangle, ChevronLeft, ChevronRight, PieChart, RotateCw } from "lucide-react";
import CustomerService from "../../services/client.service";
import CustomerType, { eStatus, ContactType } from "../../types/ClientType";
import ClienteForm from "./Components/Form/cliente.form";
import type { ClienteFormData } from "./Components/Schema/cliente.schema";
import ClientesGrowthChart from "./Components/Chart/ClientesGrowthChart";
import { useAlert } from "../../components/Alert/Alert";
import { formatDocument, formatDate, formatNumber, getInitials, onlyDigits, toPercent } from "../../utils/format";
import HeaderPage from "../../components/Headers/HeaderPage";

const SEARCH_DEBOUNCE = 250;

const ROW_HEIGHT = 63.3;
const MIN_PER_PAGE = 5;
const FALLBACK_PER_PAGE = 10;

type Filtro = "todos" | "ativo" | "inativo";
const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "ativo", label: "Ativos" },
  { value: "inativo", label: "Inativos" },
];

const COLS = "grid-cols-[1fr_150px_120px_120px]";

function contactDigits(contato?: ContactType) {
  if (!contato) return "";
  return onlyDigits(`${contato.telefone ?? ""}${contato.celular ?? ""}${contato.whatsapp ?? ""}`);
}

function StatusBadge({ status }: { status: eStatus }) {
  return status === eStatus.ATIVO ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0f6e56]/40 bg-[#0f6e56]/20 px-2.5 py-1 text-[11px] font-medium text-[#5dcaa5]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#5dcaa5]" /> Ativo
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-[#8a85b4]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#6f6a93]" /> Inativo
    </span>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`grid ${COLS} items-center border-b border-white/[0.04] px-5`} style={{ height: ROW_HEIGHT }}>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 shrink-0 rounded-xl bg-white/[0.05]" />
            <div className="flex flex-col gap-1.5">
              <div className="h-3 w-32 rounded bg-white/[0.06]" />
              <div className="h-2 w-40 rounded bg-white/[0.04]" />
            </div>
          </div>
          <div className="h-3 w-24 rounded bg-white/[0.05]" />
          <div className="h-5 w-16 rounded-full bg-white/[0.05]" />
          <div className="ml-auto h-3 w-16 rounded bg-white/[0.05]" />
        </div>
      ))}
    </div>
  );
}

const Clientes = () => {
  const navigate = useNavigate();
  const alert = useAlert();

  const [customers, setCustomers] = useState<CustomerType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(FALLBACK_PER_PAGE);

  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await CustomerService.getAll();
      const list = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setCustomers(list as CustomerType[]);
    } catch {
      setError("Não foi possível carregar os clientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE);
    return () => clearTimeout(t);
  }, [search]);

  // Recalcula perPage sempre que a altura do corpo muda (resize da janela, banner de erro, etc)
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    const calc = () => {
      const h = el.clientHeight;
      if (h <= 0) return;
      const rows = Math.max(MIN_PER_PAGE, Math.floor(h / ROW_HEIGHT));
      setPerPage((prev) => (prev === rows ? prev : rows));
    };

    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const digits = onlyDigits(q);
    return (
      customers
        .filter((c) => {
          const matchStatus = filtro === "todos" || (filtro === "ativo" && c.status === eStatus.ATIVO) || (filtro === "inativo" && c.status === eStatus.INATIVO);

          if (!matchStatus) return false;
          if (!q) return true;

          const matchNome = c.nome?.toLowerCase().includes(q);
          const matchEmail = c.contato?.email?.toLowerCase().includes(q);
          const matchDoc = digits.length > 0 && (onlyDigits(c.cpfCnpj).includes(digits) || contactDigits(c.contato).includes(digits));

          return matchNome || matchEmail || matchDoc;
        })
        // Mais recentes primeiro; clientes sem data vão para o fim.
        .sort((a, b) => {
          const da = a.created_at ? new Date(a.created_at).getTime() : 0;
          const db = b.created_at ? new Date(b.created_at).getTime() : 0;
          return db - da;
        })
    );
  }, [customers, debouncedSearch, filtro]);

  const stats = useMemo(() => {
    const total = customers.length;
    const ativos = customers.filter((c) => c.status === eStatus.ATIVO).length;
    const now = new Date();
    const novos = customers.filter((c) => {
      if (!c.created_at) return false;
      const d = new Date(c.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { total, ativos, inativos: total - ativos, novos };
  }, [customers]);

  const pctAtivos = toPercent(stats.ativos, stats.total);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);
  const emptySlots = Math.max(0, perPage - pageItems.length);

  useEffect(() => setPage(1), [debouncedSearch, filtro]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const handleCreate = async (data: ClienteFormData) => {
    setSaving(true);
    try {
      await CustomerService.create(data);
      setShowCreate(false);
      await load();
      alert.success("Cliente cadastrado!", "O cliente foi adicionado com sucesso.");
    } catch {
      alert.error("Erro ao cadastrar", "Não foi possível cadastrar o cliente.");
    } finally {
      setSaving(false);
    }
  };

  const hasFilters = Boolean(search) || filtro !== "todos";

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[#0e0d1a] text-[#e8e4ff]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(124,110,245,0.16),transparent_70%)]" />

      <HeaderPage title="Clientes" subtitle="Cadastre, organize e acompanhe sua base de clientes" icon={<Users />} />

      <main className="relative flex min-h-0 flex-1 flex-col gap-5 overflow-hidden px-5 py-5 lg:px-8 lg:py-6">
        {error && (
          <div className="flex shrink-0 items-center justify-between gap-2.5 rounded-xl border border-[#a22d2d]/40 bg-[#a22d2d]/15 px-4 py-3 text-[13px] text-[#f0a5a5]">
            <span className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </span>
            <button onClick={load} className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-[#f0a5a5]/30 px-2.5 py-1 text-[12px] font-medium text-[#f0a5a5] transition-colors hover:bg-[#f0a5a5]/10">
              <RotateCw className="h-3.5 w-3.5" /> Tentar novamente
            </button>
          </div>
        )}

        {/* Grid principal: tabela + lateral, ambos esticados até o fim */}
        <section className="flex min-h-0 flex-1 flex-col gap-4 xl:flex-row xl:items-stretch">
          {/* Card da tabela — altura fixa da viewport */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#15132a]">
            {/* Toolbar do card */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7c6ef5]/[0.15]">
                  <Users className="h-4 w-4 text-[#9b8ff5]" />
                </div>
                <div>
                  <h2 className="text-[13px] font-medium text-[#e8e4ff]">Todos os clientes</h2>
                  <p className="text-[11px] text-[#6f6a93]">
                    {formatNumber(filtered.length)} {filtered.length === 1 ? "resultado" : "resultados"}
                  </p>
                </div>
              </div>

              <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 transition-colors focus-within:border-[#7c6ef5]/60 focus-within:bg-white/[0.06] sm:max-w-xs">
                  <Search className="h-4 w-4 text-[#4e4a72]" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, documento, e-mail…" aria-label="Buscar clientes" className="flex-1 bg-transparent py-2 text-[13px] text-[#e8e4ff] outline-none placeholder:text-[#6f6a93]" />
                </div>
                <div className="flex items-center gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] p-1">
                  {FILTROS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFiltro(opt.value)}
                      aria-pressed={filtro === opt.value}
                      className={`cursor-pointer rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${filtro === opt.value ? "bg-[#7c6ef5] text-white shadow-[0_4px_14px_-4px_rgba(124,110,245,0.8)]" : "text-[#8a85b4] hover:text-[#e8e4ff]"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cabeçalho de colunas */}
            <div className={`grid shrink-0 ${COLS} border-b border-white/[0.06] bg-white/[0.02] px-5 py-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#4e4a72]`}>
              <p>Cliente</p>
              <p>Documento</p>
              <p>Status</p>
              <p className="text-right">Cadastro</p>
            </div>

            {/* Corpo: sem scroll — o que não cabe vai pra próxima página */}
            <div ref={bodyRef} className="min-h-0 flex-1 overflow-hidden">
              {loading ? (
                <SkeletonRows count={perPage} />
              ) : filtered.length === 0 ? (
                <div className="flex h-full items-center justify-center py-10">
                  <div className="flex max-w-xs flex-col items-center gap-3 text-center text-[#6f6a93]">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[13px] text-[#b7b2d8]">Nenhum cliente encontrado</p>
                      <p className="mt-0.5 text-[11px]">{hasFilters ? "Ajuste a busca ou os filtros." : "Comece cadastrando seu primeiro cliente."}</p>
                    </div>
                    {!hasFilters && (
                      <button onClick={() => setShowCreate(true)} className="mt-1 cursor-pointer rounded-xl bg-[#7c6ef5] px-3.5 py-2 text-[12px] font-medium text-white transition-colors hover:bg-[#8b7bf7]">
                        Cadastrar primeiro cliente
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {pageItems.map((c) => (
                    <button
                      key={c.id ?? c.cpfCnpj}
                      onClick={() => c.id && navigate(`/clientes/${c.id}`)}
                      aria-label={`Abrir cliente ${c.nome}`}
                      className={`group relative grid w-full ${COLS} items-center border-b border-white/[0.04] px-5 text-left transition-colors before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:rounded-r before:bg-[#7c6ef5] before:opacity-0 before:transition-opacity hover:bg-white/[0.03] hover:before:opacity-100`}
                      style={{ height: ROW_HEIGHT }}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#7c6ef5]/25 bg-gradient-to-br from-[#7c6ef5]/25 to-[#a78bfa]/10 text-[11px] font-semibold text-[#b7aef9]">{getInitials(c.nome)}</div>
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-[13px] font-medium text-[#e8e4ff]">{c.nome}</span>
                          {c.contato?.email && <span className="truncate text-[11px] text-[#6f6a93]">{c.contato.email}</span>}
                        </div>
                      </div>
                      <span className="text-[12px] tabular-nums text-[#8a85b4]">{formatDocument(c.cpfCnpj)}</span>
                      <span>
                        <StatusBadge status={c.status} />
                      </span>
                      <span className="text-right text-[12px] tabular-nums text-[#8a85b4]">{formatDate(c.created_at)}</span>
                    </button>
                  ))}

                  {/* Linhas vazias pra preencher o espaço quando a página não enche */}
                  {Array.from({ length: emptySlots }).map((_, i) => (
                    <div key={`empty-${i}`} aria-hidden className="border-b border-white/[0.04]" style={{ height: ROW_HEIGHT }} />
                  ))}
                </>
              )}
            </div>

            {/* Rodapé / paginação */}
            <div className="flex shrink-0 items-center justify-between border-t border-white/[0.06] bg-white/[0.02] px-5 py-3 text-[11px] text-[#6f6a93]">
              <p>
                {formatNumber(filtered.length)} {filtered.length === 1 ? "cliente" : "clientes"}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex cursor-pointer items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[#b7b2d8] transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                </button>
                <span className="px-1 tabular-nums">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="flex cursor-pointer items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[#b7b2d8] transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Próxima <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Lateral: gráfico + composição */}
          <aside className="flex flex-col gap-4 xl:w-[340px]">
            <div className="flex min-h-[280px] flex-1 flex-col [&>*]:h-full">
              <ClientesGrowthChart customers={customers} />
            </div>

            {/* Composição da base */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#15132a] p-4">
              <div className="mb-3.5 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7c6ef5]/[0.15]">
                  <PieChart className="h-4 w-4 text-[#9b8ff5]" />
                </div>
                <h2 className="text-[13px] font-medium text-[#e8e4ff]">Composição da base</h2>
              </div>

              <div className="flex h-2.5 overflow-hidden rounded-full bg-white/[0.05]">
                <div className="bg-gradient-to-r from-[#0f6e56] to-[#5dcaa5] transition-all" style={{ width: `${pctAtivos}%` }} />
                <div className="flex-1 bg-white/[0.08]" />
              </div>

              <div className="mt-3.5 flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#5dcaa5]" />
                  <span className="text-[#8a85b4]">Ativos</span>
                  <span className="font-medium text-[#e8e4ff] tabular-nums">{formatNumber(stats.ativos)}</span>
                  <span className="text-[#6f6a93] tabular-nums">({pctAtivos}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#6f6a93]" />
                  <span className="text-[#8a85b4]">Inativos</span>
                  <span className="font-medium text-[#e8e4ff] tabular-nums">{formatNumber(stats.inativos)}</span>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </main>

      {showCreate && <ClienteForm saving={saving} onClose={() => setShowCreate(false)} onSubmit={handleCreate} />}
    </div>
  );
};

export default Clientes;
