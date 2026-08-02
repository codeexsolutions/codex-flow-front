import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus, Search, AlertTriangle, ChevronLeft, ChevronRight, PieChart, RotateCw } from "lucide-react";
import CustomerService from "@/features/clientes/services/client.service";
import useClienteStore from "@/features/clientes/store/cliente.store";
import { eStatus, type ContactType } from "@/shared/domain/cliente";
import ClienteForm from "@/features/clientes/components/ClienteForm";
import ClientesMobile, { type ClienteItem } from "@/features/clientes/components/ClientesMobile";
import { useIsMobile } from "@/shared/hooks/useIsMobile";
import type { ClienteFormData } from "@/features/clientes/schema/cliente.schema";
import ClientesGrowthChart from "@/features/clientes/components/ClientesGrowthChart";
import { useAlert } from "@/shared/ui/Alert";
import { extractErrorMessage, getErrorTitle } from "@/shared/utils/errorHandler";
import { formatDocument, formatNumber, getInitials, onlyDigits, toPercent } from "@/shared/utils/format";
import { formatDate, toDate } from "@/shared/utils/date";
import { ClienteStatusBadge as StatusBadge } from "@/shared/ui/StatusBadge";
import { SkeletonTableRows, SkeletonIdentityCell } from "@/shared/ui/skeleton";
import { useAutoPageSize, ROW_HEIGHT } from "@/shared/hooks/useAutoPageSize";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { PageScreen } from "@/shared/ui/PageShell";

type Filtro = "todos" | "ativo" | "inativo";
const FILTROS: { value: Filtro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "ativo", label: "Ativos" },
  { value: "inativo", label: "Inativos" },
];

const COLS = "grid-cols-[1fr_150px_120px_120px]";
/** Soma das colunas fixas + folga para a coluna flexível: abaixo disso a tabela rola. */
const TABLE_MIN_WIDTH = 640;

function contactDigits(contato?: ContactType) {
  if (!contato) return "";
  return onlyDigits(`${contato.telefone ?? ""}${contato.celular ?? ""}${contato.whatsapp ?? ""}`);
}

const SkeletonRows = ({ count }: { count: number }) => (
  <SkeletonTableRows count={count} cols={COLS} rowHeight={ROW_HEIGHT}>
    <SkeletonIdentityCell />
    <div className="h-3 w-24 rounded bg-fg/[0.05]" />
    <div className="h-5 w-16 rounded-full bg-fg/[0.05]" />
    <div className="ml-auto h-3 w-16 rounded bg-fg/[0.05]" />
  </SkeletonTableRows>
);

const Clientes = () => {
  const navigate = useNavigate();
  const mobile = useIsMobile();
  const alert = useAlert();

  // Estado dos clientes vive no store — assim PDV, Dashboard e Relatórios
  // enxergam a mesma lista e uma criação aqui reflete em todos.
  const customers = useClienteStore((s) => s.clientes);
  const loading = useClienteStore((s) => s.loading);
  const error = useClienteStore((s) => s.error);
  const fetchClientes = useClienteStore((s) => s.fetchClientes);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const { bodyRef, perPage } = useAutoPageSize<HTMLDivElement>();

  const load = async () => {
    await fetchClientes(true);
  };

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

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
      const d = toDate(c.created_at);
      return !!d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
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
    } catch (err) {
      alert.error(getErrorTitle(err), extractErrorMessage(err, "Não foi possível cadastrar o cliente."));
    } finally {
      setSaving(false);
    }
  };

  const hasFilters = Boolean(search) || filtro !== "todos";

  if (mobile) {
    const itens: ClienteItem[] = filtered.map((c) => ({
      id: String(c.id ?? ""),
      nome: c.nome,
      cpfCnpj: c.cpfCnpj,
      telefone: c.contato?.telefone ? String(c.contato.telefone) : undefined,
      whatsapp: c.contato?.whatsapp ? String(c.contato.whatsapp) : undefined,
      ativo: c.status === eStatus.ATIVO,
    }));

    return (
      <div className="h-full w-full overflow-y-auto text-ink">
        <ClientesMobile
          clientes={itens}
          total={customers.length}
          ativos={customers.filter((c) => c.status === eStatus.ATIVO).length}
          busca={search}
          onBusca={setSearch}
          filtro={filtro}
          onFiltro={setFiltro}
          carregando={loading}
          onAbrir={(c) => navigate(`/clientes/${c.id}`)}
          onNovo={() => setShowCreate(true)}
        />

        {showCreate && <ClienteForm saving={saving} onClose={() => setShowCreate(false)} onSubmit={handleCreate} />}
      </div>
    );
  }

  return (
    <PageScreen title="Clientes" subtitle="Cadastre, organize e acompanhe sua base de clientes" icon={<Users />}>
        {error && (
          <div className="flex shrink-0 items-center justify-between gap-2.5 rounded-xl border border-danger/40 bg-danger/15 px-4 py-3 text-[13px] text-danger">
            <span className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </span>
            <button onClick={load} className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-danger/30 px-2.5 py-1 text-[12px] text-danger transition-colors hover:bg-danger/10">
              <RotateCw className="h-3.5 w-3.5" /> Tentar novamente
            </button>
          </div>
        )}

        {/* Grid principal: tabela + lateral, ambos esticados até o fim */}
        <section className="flex min-h-0 flex-1 flex-col gap-3">
          {/* Card da tabela — altura fixa da viewport */}
          <div className="flex min-h-[260px] min-w-0 flex-1 flex-col overflow-hidden card glass-sheen rounded-lg">
            {/* Toolbar do card */}
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-fg/[0.06] px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/[0.15]">
                  <Users className="h-4 w-4 text-accent-soft" />
                </div>
                <div>
                  <h2 className="text-[13px] text-ink">Todos os clientes</h2>
                  <p className="text-[11px] text-faint">
                    {formatNumber(filtered.length)} {filtered.length === 1 ? "resultado" : "resultados"}
                  </p>
                </div>
              </div>

              <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-fg/[0.08] bg-fg/[0.04] px-3 transition-colors focus-within:border-accent/60 focus-within:bg-fg/[0.06] sm:max-w-xs">
                  <Search className="h-4 w-4 text-muted" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, documento, e-mail…" aria-label="Buscar clientes" className="flex-1 bg-transparent py-2 text-[13px] text-ink outline-none placeholder:text-faint" />
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-fg/[0.07] bg-fg/[0.03] p-1">
                  {FILTROS.map((opt) => (
                    <button key={opt.value} onClick={() => setFiltro(opt.value)} aria-pressed={filtro === opt.value} className={`cursor-pointer rounded-lg px-3 py-1.5 text-[12px] transition-colors ${filtro === opt.value ? "bg-accent text-white shadow-glow" : "text-mist hover:text-ink"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="focus-ring inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-br from-accent-soft to-accent px-3 py-2 text-[12.5px] text-white shadow-glow transition-all hover:brightness-110 active:scale-[0.98]"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Novo cliente
                </button>
              </div>
            </div>

            {/* Colunas + linhas rolam juntas na horizontal quando a tela é estreita. */}
            <div className="flex min-h-0 flex-1 flex-col overflow-x-auto">
              <div className="flex min-h-0 flex-1 flex-col" style={{ minWidth: TABLE_MIN_WIDTH }}>
                {/* Cabeçalho de colunas */}
                <div className={`grid shrink-0 ${COLS} border-b border-fg/[0.06] bg-fg/[0.02] px-5 py-2.5 text-[10px] uppercase tracking-[0.12em] text-muted`}>
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
                      <div className="flex max-w-xs flex-col items-center gap-3 text-center text-faint">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-fg/[0.06] bg-fg/[0.03]">
                          <Users className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-[13px] text-mist">Nenhum cliente encontrado</p>
                          <p className="mt-0.5 text-[11px]">{hasFilters ? "Ajuste a busca ou os filtros." : "Comece cadastrando seu primeiro cliente."}</p>
                        </div>
                        {!hasFilters && (
                          <button onClick={() => setShowCreate(true)} className="mt-1 cursor-pointer rounded-xl bg-accent px-3.5 py-2 text-[12px] text-white transition-colors hover:bg-accent">
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
                          className={`group relative grid w-full ${COLS} items-center border-b border-fg/[0.04] px-5 text-left transition-colors before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:rounded-r before:bg-accent before:opacity-0 before:transition-opacity hover:bg-fg/[0.03] hover:before:opacity-100`}
                          style={{ height: ROW_HEIGHT }}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-gradient-to-br from-accent/25 to-accent-soft/10 text-[11px] text-accent-soft">{getInitials(c.nome)}</div>
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate text-[13px] text-ink">{c.nome}</span>
                              {c.contato?.email && <span className="truncate text-[11px] text-faint">{c.contato.email}</span>}
                            </div>
                          </div>
                          <span className="text-[12px] tabular-nums text-mist">{formatDocument(c.cpfCnpj)}</span>
                          <span>
                            <StatusBadge status={c.status} />
                          </span>
                          <span className="text-right text-[12px] tabular-nums text-mist">{formatDate(c.created_at)}</span>
                        </button>
                      ))}

                      {/* Linhas vazias pra preencher o espaço quando a página não enche */}
                      {Array.from({ length: emptySlots }).map((_, i) => (
                        <div key={`empty-${i}`} aria-hidden className="border-b border-fg/[0.04]" style={{ height: ROW_HEIGHT }} />
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Rodapé / paginação */}
            <div className="flex shrink-0 items-center justify-between border-t border-fg/[0.06] bg-fg/[0.02] px-5 py-3 text-[11px] text-faint">
              <p>
                {formatNumber(filtered.length)} {filtered.length === 1 ? "cliente" : "clientes"}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex cursor-pointer items-center gap-1 rounded-lg border border-fg/[0.08] bg-fg/[0.04] px-2.5 py-1.5 text-mist transition-colors hover:bg-fg/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                </button>
                <span className="px-1 tabular-nums">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="flex cursor-pointer items-center gap-1 rounded-lg border border-fg/[0.08] bg-fg/[0.04] px-2.5 py-1.5 text-mist transition-colors hover:bg-fg/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Próxima <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Lateral: gráfico + composição */}
          <aside className="grid shrink-0 grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="flex min-h-[280px] flex-1 flex-col [&>*]:h-full">
              <ClientesGrowthChart customers={customers} />
            </div>

            {/* Composição da base */}
            <div className="card glass-sheen rounded-lg p-4">
              <div className="mb-3.5 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/[0.15]">
                  <PieChart className="h-4 w-4 text-accent-soft" />
                </div>
                <h2 className="text-[13px] text-ink">Composição da base</h2>
              </div>

              <div className="flex h-2.5 overflow-hidden rounded-full bg-fg/[0.05]">
                <div className="bg-gradient-to-r from-success to-success transition-all" style={{ width: `${pctAtivos}%` }} />
                <div className="flex-1 bg-fg/[0.08]" />
              </div>

              <div className="mt-3.5 flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  <span className="text-mist">Ativos</span>
                  <span className="text-ink tabular-nums">{formatNumber(stats.ativos)}</span>
                  <span className="text-faint tabular-nums">({pctAtivos}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-faint" />
                  <span className="text-mist">Inativos</span>
                  <span className="text-ink tabular-nums">{formatNumber(stats.inativos)}</span>
                </div>
              </div>
            </div>
          </aside>
        </section>
      

      {showCreate && <ClienteForm saving={saving} onClose={() => setShowCreate(false)} onSubmit={handleCreate} />}
    </PageScreen>
  );
};

export default Clientes;
