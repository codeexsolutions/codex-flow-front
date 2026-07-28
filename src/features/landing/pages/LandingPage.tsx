import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Briefcase,
  Check,
  ChevronDown,
  Clock,
  LayoutDashboard,
  LogIn,
  Package,
  Plus,
  QrCode,
  Receipt,
  Search,
  ShoppingCart,
  Store,
  User,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const AUDIENCE = [
  {
    icon: Store,
    title: "MEI",
    text: "Microempreendedores que precisam de controle profissional de clientes, produtos e vendas sem complicação.",
  },
  {
    icon: User,
    title: "Pessoas físicas",
    text: "Autônomos e prestadores de serviço que querem emitir notas de venda e passar mais profissionalismo.",
  },
  {
    icon: Briefcase,
    title: "Pequenos negócios",
    text: "Quem está crescendo e precisa de funcionários, ponto e relatórios sem pagar por um ERP gigante.",
  },
] as const;

const FEATURES = [
  {
    icon: Users,
    title: "Cadastro de clientes",
    text: "Todos os seus clientes organizados, com histórico de compras e dados de contato sempre à mão.",
  },
  {
    icon: Package,
    title: "Cadastro de produtos",
    text: "Monte seu catálogo com preços e descrições e reaproveite em cada nova venda.",
  },
  {
    icon: ShoppingCart,
    title: "Registro de vendas",
    text: "Registre cada venda em segundos e acompanhe o que entrou no caixa dia a dia.",
  },
  {
    icon: Receipt,
    title: "Notas de venda",
    text: "Gere notas de venda com a cara do seu negócio para enviar aos clientes e manter tudo documentado.",
  },
] as const;

const PLANS = [
  {
    name: "Essencial",
    price: "31,90",
    desc: "Para quem está começando a organizar as vendas.",
    features: [
      "Cadastro de clientes",
      "Cadastro de produtos",
      "Registro de vendas",
      "Emissão de notas de venda",
      "Painel de acompanhamento",
    ],
    highlight: false,
  },
  {
    name: "Profissional",
    price: "56,90",
    desc: "Para quem já tem equipe e precisa de mais controle.",
    features: [
      "Tudo do Essencial",
      "Tabela de funcionários",
      "Integração com batida de ponto",
      "Relatórios financeiros detalhados",
    ],
    highlight: true,
    tag: "Mais popular",
  },
  {
    name: "Premium",
    price: "89,90",
    desc: "Automação e atendimento para crescer sem contratar.",
    features: [
      "Tudo do Profissional",
      "Chatbot configurável para atendimento",
      "Relatórios financeiros completos",
      "Suporte prioritário",
    ],
    highlight: false,
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Cadastre sua empresa",
    text: "Preencha os dados em três etapas simples: empresa, contato e endereço.",
  },
  {
    step: "2",
    title: "Ative com Pix",
    text: "Finalize o pagamento do primeiro acesso pelo QR Code e sua conta é liberada.",
  },
  {
    step: "3",
    title: "Entre e use",
    text: "Faça login com o CPF ou CNPJ da empresa e comece a organizar seu negócio.",
  },
] as const;

const FAQ = [
  {
    q: "O Codex Flow emite nota fiscal?",
    a: "Não. O Codex Flow gera notas de venda para você enviar aos seus clientes e manter o controle das suas operações, mas não emite documentos fiscais como NF-e ou NFS-e.",
  },
  {
    q: "Para quem é o Codex Flow?",
    a: "Para MEI, autônomos e pessoas físicas que precisam de uma gestão profissional de clientes, produtos, vendas e notas — sem a complexidade e o custo de um ERP tradicional.",
  },
  {
    q: "Como funciona o pagamento?",
    a: "Os planos começam em R$ 31,90. No primeiro acesso, a ativação da conta é feita rapidamente via Pix, com QR Code ou copia e cola.",
  },
  {
    q: "O que muda entre os planos?",
    a: "O Essencial cobre clientes, produtos, vendas e notas. O Profissional adiciona tabela de funcionários, integração com batida de ponto e relatórios financeiros detalhados. O Premium soma o chatbot configurável e relatórios completos.",
  },
] as const;

/* Telas mostradas na galeria "Veja por dentro". `src` aponta para o print real. */
const SCREENS = [
  {
    key: "pdv",
    nav: "PDV",
    title: "Ponto de Venda",
    subtitle: "Inicie vendas e acompanhe o dia",
    tabLabel: "Ponto de venda",
    tabDesc: "Registre vendas e acompanhe o caixa em tempo real.",
    src: "/screenshots/pdv.png",
    icon: ShoppingCart,
  },
  {
    key: "estoque",
    nav: "Estoque",
    title: "Estoque",
    subtitle: "Seu catálogo e níveis de estoque",
    tabLabel: "Estoque",
    tabDesc: "Produtos, preços e quantidades sempre organizados.",
    src: "/screenshots/estoque.png",
    icon: Package,
  },
  {
    key: "clientes",
    nav: "Clientes",
    title: "Clientes",
    subtitle: "Sua base com histórico de compras",
    tabLabel: "Clientes",
    tabDesc: "Cada cliente com contato e histórico à mão.",
    src: "/screenshots/clientes.png",
    icon: Users,
  },
  {
    key: "vendas",
    nav: "Vendas",
    title: "Vendas e notas",
    subtitle: "Todas as vendas e notas geradas",
    tabLabel: "Vendas e notas",
    tabDesc: "Histórico completo com notas prontas para enviar.",
    src: "/screenshots/vendas.png",
    icon: Receipt,
  },
] as const;

/* Navegação lateral do mock — espelha o app real. */
const NAV = [
  { group: "Operação", items: [{ icon: ShoppingCart, label: "PDV" }] },
  {
    group: "Gerenciamento",
    items: [
      { icon: Package, label: "Estoque" },
      { icon: Users, label: "Clientes" },
      { icon: Briefcase, label: "Funcionários", soon: true },
    ],
  },
  {
    group: "Financeiro",
    items: [
      { icon: Receipt, label: "Vendas" },
      { icon: BarChart3, label: "Relatórios" },
    ],
  },
  { group: "Ferramentas", items: [{ icon: Bot, label: "Chatbot", soon: true }] },
] as const;

/* ----------------------- Efeitos de scroll ------------------------ */

/** Revela o conteúdo com fade + slide quando entra na tela. */
const Reveal = ({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`cf-reveal ${visible ? "cf-visible" : ""} ${className}`}
    >
      {children}
    </div>
  );
};

/* ------------------------------ Logo ------------------------------ */

/**
 * Marca do Codex Flow. Usa /logo.png; se o arquivo não existir, cai num
 * quadrado gradiente com o glifo de "fluxo" (igual ao ícone do app).
 */
const LogoMark = ({ size = 32, className = "" }: { size?: number; className?: string }) => {
  const [broken, setBroken] = useState(false);
  const radius = Math.round(size * 0.28);

  if (broken) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-br from-[#6c5ce7] to-[#9b8ff5] shadow-[0_6px_18px_-6px_rgba(108,92,231,0.8)] ${className}`}
        style={{ width: size, height: size, borderRadius: radius }}
        aria-label="Codex Flow"
      >
        <svg
          width={size * 0.55}
          height={size * 0.55}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth={2.4}
          strokeLinecap="round"
        >
          <path d="M4 8h11M4 16h11" />
          <path d="M19 5v14" opacity={0.85} />
        </svg>
      </span>
    );
  }

  return (
    <img
      src="/logo.png"
      alt="Codex Flow"
      width={size}
      height={size}
      onError={() => setBroken(true)}
      className={`shrink-0 object-contain ${className}`}
      style={{ width: size, height: size, borderRadius: radius }}
    />
  );
};

/* -------------------------- Moldura + prints ----------------------- */

/** "Janela" de navegador com favicon (logo) e URL — moldura dos prints. */
const BrowserFrame = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div
    className={`overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14121f] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.85)] ${className}`}
  >
    <div className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
      <div className="flex gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#f05050]/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#f0c050]/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#32BCAD]/50" />
      </div>
      <div className="flex flex-1 items-center gap-2 rounded-md border border-white/[0.05] bg-black/20 px-2.5 py-1">
        <LogoMark size={13} />
        <span className="truncate text-[11px] text-[#5e5a82]">app.codexflow.com.br</span>
      </div>
    </div>
    {children}
  </div>
);

/**
 * Print de uma tela: tenta carregar a imagem real (`src`); enquanto ela não
 * existir em /public, renderiza `children` (o mock fiel) como fallback.
 */
const Screenshot = ({ src, alt, children }: { src: string; alt: string; children: ReactNode }) => {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <>{children}</>
  ) : (
    <img src={src} alt={alt} onError={() => setFailed(true)} className="block w-full" />
  );
};

/* ------------------------- Mock do app real ------------------------ */

/** Casca do painel (sidebar + topo), espelhando o produto para os prints. */
const AppShellMock = ({
  active,
  title,
  subtitle,
  children,
}: {
  active: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) => (
  <div className="flex h-[360px] text-left sm:h-[420px]">
    {/* Sidebar */}
    <aside className="hidden w-44 shrink-0 flex-col border-r border-white/[0.05] bg-black/20 p-3 sm:flex">
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-white/[0.03] px-2 py-2">
        <LogoMark size={26} />
        <div className="leading-tight">
          <p className="text-[11px] text-[#e8e4ff]">Codex Flow</p>
          <p className="text-[9px] text-[#5e5a82]">Sua Empresa</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-hidden">
        {NAV.map(({ group, items }) => (
          <div key={group}>
            <p className="mb-1 px-2 text-[8px] uppercase tracking-[1px] text-[#4a4770]">{group}</p>
            {items.map(({ icon: Icon, label, ...rest }) => {
              const isActive = label === active;
              return (
                <div
                  key={label}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${
                    isActive ? "bg-[#6c5ce7]/20 text-[#b3a8ff]" : "text-[#5e5a82]"
                  }`}
                >
                  <Icon size={12} />
                  <span className="truncate">{label}</span>
                  {"soon" in rest && (
                    <span className="ml-auto rounded bg-white/[0.05] px-1 text-[7px] text-[#4a4770]">EM BREVE</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 border-t border-white/[0.05] pt-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6c5ce7]/25 text-[9px] text-[#b3a8ff]">
          U
        </span>
        <div className="leading-tight">
          <p className="text-[10px] text-[#e8e4ff]">Usuário</p>
          <p className="text-[8px] text-[#32BCAD]">Conectado</p>
        </div>
      </div>
    </aside>

    {/* Main */}
    <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[#f0effe]">{title}</p>
          <p className="text-[11px] text-[#7a769e]">{subtitle}</p>
        </div>
        <span className="hidden rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[10px] text-[#a8a3cf] sm:block">
          Seg, 06 de Julho
        </span>
      </div>
      {children}
    </div>
  </div>
);

/* Conteúdo de cada tela dentro da casca */

const Stat = ({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "green" | "amber";
}) => (
  <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-2.5">
    <p className="truncate text-[8px] uppercase tracking-[0.6px] text-[#5e5a82]">{label}</p>
    <p
      className={`mt-1 text-sm ${
        tone === "green" ? "text-[#32BCAD]" : tone === "amber" ? "text-[#f0c050]" : "text-[#f0effe]"
      }`}
    >
      {value}
    </p>
  </div>
);

const PdvScreen = () => (
  <>
    <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Stat label="Faturamento" value="R$ 4.280" tone="green" />
      <Stat label="Recebido" value="R$ 3.150" tone="green" />
      <Stat label="Pendente" value="R$ 1.130" tone="amber" />
      <Stat label="Vendas" value="18" />
    </div>
    <div className="mb-3 flex items-center gap-2">
      <span className="flex items-center gap-1 rounded-md bg-gradient-to-br from-[#6c5ce7] to-[#9b8ff5] px-2.5 py-1.5 text-[11px] text-white">
        <Plus size={11} /> Nova venda
      </span>
      <span className="flex flex-1 items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-[#5e5a82]">
        <Search size={11} /> Buscar venda por cliente...
      </span>
    </div>
    <div className="flex flex-1 flex-col rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] text-[#e8e4ff]">Vendas de hoje</p>
        <span className="text-[9px] text-[#5e5a82]">18 vendas</span>
      </div>
      {[
        { c: "Ana Souza", v: "R$ 240,00", s: "Pago" },
        { c: "Carlos Lima", v: "R$ 89,90", s: "Pago" },
        { c: "Julia Reis", v: "R$ 1.130,00", s: "Pendente" },
      ].map(({ c, v, s }) => (
        <div key={c} className="flex items-center justify-between border-b border-white/[0.04] py-1.5 last:border-0">
          <span className="text-[11px] text-[#a8a3cf]">{c}</span>
          <span className="flex items-center gap-2">
            <span className="text-[11px] text-[#e8e4ff]">{v}</span>
            <span className={`text-[9px] ${s === "Pago" ? "text-[#32BCAD]" : "text-[#f0c050]"}`}>{s}</span>
          </span>
        </div>
      ))}
    </div>
  </>
);

const EstoqueScreen = () => (
  <div className="flex flex-1 flex-col rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
    <div className="mb-2 grid grid-cols-[1fr_auto_auto] gap-3 border-b border-white/[0.06] pb-2 text-[8px] uppercase tracking-[0.6px] text-[#5e5a82]">
      <span>Produto</span>
      <span>Preço</span>
      <span>Estoque</span>
    </div>
    {[
      { n: "Camiseta básica", p: "R$ 49,90", q: "34" },
      { n: "Caneca personalizada", p: "R$ 29,90", q: "12" },
      { n: "Kit presente", p: "R$ 119,00", q: "6" },
      { n: "Adesivo pack", p: "R$ 9,90", q: "2" },
    ].map(({ n, p, q }) => (
      <div
        key={n}
        className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-white/[0.04] py-2 last:border-0"
      >
        <span className="flex items-center gap-2 text-[11px] text-[#a8a3cf]">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#6c5ce7]/15 text-[#9b8ff5]">
            <Package size={11} />
          </span>
          {n}
        </span>
        <span className="text-[11px] text-[#e8e4ff]">{p}</span>
        <span className={`text-[11px] ${Number(q) <= 5 ? "text-[#f0c050]" : "text-[#7a769e]"}`}>{q} un</span>
      </div>
    ))}
  </div>
);

const ClientesScreen = () => (
  <div className="flex flex-1 flex-col gap-2">
    {[
      { n: "Ana Souza", t: "(85) 9 8••• 1234", c: "12 compras" },
      { n: "Carlos Lima", t: "(85) 9 8••• 5678", c: "8 compras" },
      { n: "Julia Reis", t: "(85) 9 9••• 9012", c: "23 compras" },
      { n: "Pedro Alves", t: "(85) 9 9••• 3456", c: "4 compras" },
    ].map(({ n, t, c }) => (
      <div
        key={n}
        className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6c5ce7]/20 text-[10px] text-[#b3a8ff]">
            {n
              .split(" ")
              .map((x) => x[0])
              .join("")}
          </span>
          <div>
            <p className="text-[11px] text-[#e8e4ff]">{n}</p>
            <p className="text-[9px] text-[#5e5a82]">{t}</p>
          </div>
        </div>
        <span className="text-[10px] text-[#9b8ff5]">{c}</span>
      </div>
    ))}
  </div>
);

const VendasScreen = () => (
  <div className="flex flex-1 flex-col rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
    <div className="mb-2 flex items-center justify-between">
      <p className="text-[11px] text-[#e8e4ff]">Últimas vendas</p>
      <span className="rounded bg-white/[0.05] px-2 py-0.5 text-[9px] text-[#a8a3cf]">Nota gerada</span>
    </div>
    {[
      { id: "#0042", c: "Ana Souza", v: "R$ 240,00", s: "Pago" },
      { id: "#0041", c: "Julia Reis", v: "R$ 1.130,00", s: "Pendente" },
      { id: "#0040", c: "Carlos Lima", v: "R$ 89,90", s: "Pago" },
      { id: "#0039", c: "Pedro Alves", v: "R$ 59,00", s: "Pago" },
    ].map(({ id, c, v, s }) => (
      <div key={id} className="flex items-center justify-between border-b border-white/[0.04] py-2 last:border-0">
        <span className="flex items-center gap-2 text-[11px] text-[#a8a3cf]">
          <span className="text-[9px] text-[#5e5a82]">{id}</span> {c}
        </span>
        <span className="flex items-center gap-2.5">
          <span className="text-[11px] text-[#e8e4ff]">{v}</span>
          <span
            className={`rounded px-1.5 py-0.5 text-[9px] ${s === "Pago" ? "bg-[#32BCAD]/10 text-[#32BCAD]" : "bg-[#f0c050]/10 text-[#f0c050]"}`}
          >
            {s}
          </span>
        </span>
      </div>
    ))}
  </div>
);

const SCREEN_CONTENT: Record<string, ReactNode> = {
  pdv: <PdvScreen />,
  estoque: <EstoqueScreen />,
  clientes: <ClientesScreen />,
  vendas: <VendasScreen />,
};

/* --------------------- Cabeçalho de seção (à esquerda) ------------- */

const eyebrowCls =
  "inline-flex items-center gap-2 rounded-full border border-[#7c6ef5]/25 bg-[#6c5ce7]/10 px-3 py-1.5 text-[11px] uppercase tracking-[1px] text-[#9b8ff5]";

const SectionHead = ({
  eyebrow,
  title,
  sub,
  className = "",
}: {
  eyebrow: string;
  title: ReactNode;
  sub?: string;
  className?: string;
}) => (
  <div className={`max-w-2xl ${className}`}>
    <span className={eyebrowCls}>
      <LogoMark size={13} />
      {eyebrow}
    </span>
    <h2 className="mt-4 text-2xl leading-tight text-[#f0effe] sm:text-[34px]">{title}</h2>
    {sub && <p className="mt-3 text-sm leading-relaxed text-[#7a769e]">{sub}</p>}
  </div>
);

/* ---------------------------- Componente --------------------------- */

const LandingPage = () => {
  const navigate = useNavigate();

  const [scrolled, setScrolled] = useState(false);
  const [activeScreen, setActiveScreen] = useState<(typeof SCREENS)[number]["key"]>("pdv");
  const progressRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  const current = SCREENS.find((s) => s.key === activeScreen)!;

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 24);
        const max = document.documentElement.scrollHeight - window.innerHeight;
        if (progressRef.current) progressRef.current.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
        if (glowRef.current) glowRef.current.style.transform = `translate(-50%, ${y * 0.18}px)`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const cardCls =
    "rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl transition-all duration-300 " +
    "hover:-translate-y-1 hover:border-[#7c6ef5]/30 hover:bg-white/[0.05]";
  const primaryBtn =
    "flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#6c5ce7] to-[#9b8ff5] " +
    "px-6 py-3.5 text-sm sm:text-[15px] text-white shadow-[0_10px_30px_-10px_rgba(108,92,231,0.65)] " +
    "transition hover:brightness-110 hover:shadow-[0_14px_36px_-10px_rgba(108,92,231,0.85)] active:scale-[0.99]";
  const ghostBtn =
    "flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] " +
    "px-6 py-3.5 text-sm sm:text-[15px] text-[#a8a3cf] transition hover:bg-white/[0.07] hover:text-[#e8e4ff]";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0f0e18] antialiased">
      <style>{`
        .cf-reveal { opacity: 0; transform: translateY(28px); transition: opacity .7s ease, transform .7s cubic-bezier(.22,1,.36,1); }
        .cf-visible { opacity: 1; transform: none; }
        @keyframes cfFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .cf-float { animation: cfFloat 7s ease-in-out infinite; }
        @keyframes cfPulse { 0%, 100% { opacity: .2; } 50% { opacity: .32; } }
        .cf-pulse { animation: cfPulse 8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .cf-reveal { opacity: 1; transform: none; transition: none; }
          .cf-float, .cf-pulse { animation: none; }
        }
      `}</style>

      {/* Barra de progresso do scroll */}
      <div className="fixed inset-x-0 top-0 z-50 h-[3px] bg-white/[0.04]">
        <div ref={progressRef} className="h-full origin-left scale-x-0 bg-gradient-to-r from-[#6c5ce7] to-[#9b8ff5]" />
      </div>

      {/* ---------------- Fundo decorativo ---------------- */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(124,110,245,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(124,110,245,0.05) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          maskImage: "radial-gradient(ellipse 90% 55% at 75% 0%, black 20%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 55% at 75% 0%, black 20%, transparent 72%)",
        }}
      />
      <div
        ref={glowRef}
        style={{ transform: "translateX(-50%)" }}
        className="cf-pulse pointer-events-none absolute -top-44 left-[72%] h-[520px] w-[520px] rounded-full bg-[#6c5ce7] opacity-20 blur-[140px]"
      />
      <div className="pointer-events-none absolute left-[-160px] top-[38%] h-[400px] w-[400px] rounded-full bg-[#9b8ff5] opacity-[0.07] blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-200px] right-[-140px] h-[380px] w-[380px] rounded-full bg-[#6c5ce7] opacity-10 blur-[120px]" />

      {/* ---------------- Header fixo ---------------- */}
      <header
        className={`fixed inset-x-0 top-[3px] z-40 transition-all duration-300 ${
          scrolled ? "border-b border-white/[0.06] bg-[#0f0e18]/85 backdrop-blur-xl" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <button type="button" onClick={() => navigate("/")} className="flex items-center gap-2.5">
            <LogoMark size={30} />
            <span className="text-base tracking-tight text-[#f0effe] sm:text-lg">Codex Flow</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="hidden items-center gap-1.5 text-sm text-[#a8a3cf] transition hover:text-[#e8e4ff] sm:flex"
            >
              <LogIn size={15} />
              Entrar
            </button>
            <button
              type="button"
              onClick={() => navigate("/cadastro")}
              className="rounded-xl bg-gradient-to-br from-[#6c5ce7] to-[#9b8ff5] px-4 py-2 text-sm text-white transition hover:brightness-110"
            >
              Cadastrar empresa
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6">
        {/* ---------------- Hero (assimétrico) ---------------- */}
        <section className="grid grid-cols-1 items-center gap-12 pb-16 pt-28 sm:pb-24 sm:pt-36 lg:grid-cols-[1.02fr_0.98fr] lg:gap-8">
          {/* Coluna de texto — alinhada à esquerda */}
          <div className="text-left">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#7c6ef5]/25 bg-[#6c5ce7]/10 px-3.5 py-1.5 text-xs tracking-[0.4px] text-[#9b8ff5]">
                <LogoMark size={15} />
                Um produto CodEx Solutions
              </span>
            </Reveal>

            <Reveal delay={100}>
              <h1 className="mt-5 text-4xl leading-[1.1] text-[#f0effe] sm:text-[52px] sm:leading-[1.08]">
                Gestão profissional para o seu{" "}
                <span className="bg-gradient-to-r from-[#8f80f2] to-[#b3a8ff] bg-clip-text text-transparent">MEI</span>,
                sem complicação
              </h1>
            </Reveal>

            <Reveal delay={200}>
              <p className="mt-5 max-w-lg text-sm leading-relaxed text-[#7a769e] sm:text-base">
                O Codex Flow foi feito para MEI e pessoas físicas que precisam de notas de venda e de uma gestão
                profissional de clientes, produtos e vendas — a partir de R$ 31,90.
              </p>
            </Reveal>

            <Reveal delay={300}>
              <div className="mt-9 flex w-full max-w-md flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => navigate("/cadastro")} className={`${primaryBtn} flex-1`}>
                  Começar agora
                  <ArrowRight size={16} />
                </button>
                <button type="button" onClick={() => navigate("/login")} className={`${ghostBtn} flex-1`}>
                  Já tenho conta
                </button>
              </div>
            </Reveal>

            <Reveal delay={400}>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#5e5a82]">
                <span className="flex items-center gap-1.5">
                  <QrCode size={13} className="text-[#32BCAD]" /> Ativação via Pix
                </span>
                <span className="flex items-center gap-1.5">
                  <Check size={13} className="text-[#9b8ff5]" /> Conta ativa no mesmo dia
                </span>
                <span className="flex items-center gap-1.5">
                  <Check size={13} className="text-[#9b8ff5]" /> Sem contrato de fidelidade
                </span>
              </div>
            </Reveal>
          </div>

          {/* Coluna do print — deslocada para a direita */}
          <Reveal delay={250} className="lg:pl-4">
            <BrowserFrame className="cf-float">
              <Screenshot src="/screenshots/pdv.png" alt="Painel de PDV do Codex Flow">
                <AppShellMock active="PDV" title="Ponto de Venda" subtitle="Inicie vendas e acompanhe o dia">
                  <PdvScreen />
                </AppShellMock>
              </Screenshot>
            </BrowserFrame>
          </Reveal>
        </section>

        {/* ---------------- Para quem é ---------------- */}
        <section className="pb-20 sm:pb-28">
          <Reveal>
            <SectionHead
              eyebrow="Para quem é"
              title="Feito para quem trabalha por conta própria"
              sub="Nada de ERP gigante e caro: o Codex Flow entrega só o que o seu negócio realmente usa."
              className="mb-12"
            />
          </Reveal>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {AUDIENCE.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 100}>
                <div className={`${cardCls} h-full px-7 py-8`}>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#6c5ce7]/15">
                    <Icon size={18} className="text-[#9b8ff5]" />
                  </div>
                  <h3 className="mb-1.5 text-[15px] text-[#f0effe]">{title}</h3>
                  <p className="text-sm leading-relaxed text-[#7a769e]">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------------- Veja por dentro (galeria de telas) ---------------- */}
        <section className="pb-20 sm:pb-28">
          <Reveal>
            <SectionHead
              eyebrow="Veja por dentro"
              title="Cada tela do jeito que você vai usar"
              sub="Escolha uma área ao lado e veja como o Codex Flow organiza o seu dia a dia."
              className="mb-10"
            />
          </Reveal>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr] lg:items-start">
            {/* Abas verticais à esquerda */}
            <Reveal className="flex flex-col gap-2.5">
              {SCREENS.map(({ key, icon: Icon, tabLabel, tabDesc }) => {
                const isActive = key === activeScreen;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveScreen(key)}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-all ${
                      isActive
                        ? "border-[#7c6ef5]/50 bg-[#6c5ce7]/[0.1]"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isActive ? "bg-[#6c5ce7]/25 text-[#b3a8ff]" : "bg-white/[0.04] text-[#7a769e]"
                      }`}
                    >
                      <Icon size={15} />
                    </span>
                    <span>
                      <span className={`block text-sm ${isActive ? "text-[#f0effe]" : "text-[#a8a3cf]"}`}>
                        {tabLabel}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-[#5e5a82]">{tabDesc}</span>
                    </span>
                  </button>
                );
              })}
            </Reveal>

            {/* Print da tela ativa */}
            <Reveal delay={100}>
              <BrowserFrame>
                <Screenshot src={current.src} alt={`Tela de ${current.tabLabel} do Codex Flow`}>
                  <AppShellMock active={current.nav} title={current.title} subtitle={current.subtitle}>
                    {SCREEN_CONTENT[current.key]}
                  </AppShellMock>
                </Screenshot>
              </BrowserFrame>
            </Reveal>
          </div>
        </section>

        {/* ---------------- Funcionalidades essenciais ---------------- */}
        <section className="pb-20 sm:pb-28">
          <Reveal>
            <SectionHead
              eyebrow="O essencial, bem feito"
              title="Clientes, produtos, vendas e notas"
              sub="O coração do Codex Flow são as quatro coisas que todo negócio precisa controlar todos os dias."
              className="mb-12"
            />
          </Reveal>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <Reveal key={title} delay={i * 90}>
                <div className={`${cardCls} flex h-full items-start gap-4 px-7 py-7`}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6c5ce7]/15">
                    <Icon size={18} className="text-[#9b8ff5]" />
                  </div>
                  <div>
                    <h3 className="mb-1.5 text-[15px] text-[#f0effe]">{title}</h3>
                    <p className="text-sm leading-relaxed text-[#7a769e]">{text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200}>
            <p className="mt-6 max-w-2xl text-xs leading-relaxed text-[#5e5a82]">
              * O Codex Flow não emite documentos fiscais (NF-e / NFS-e). As notas geradas são notas de venda para
              controle e envio aos seus clientes.
            </p>
          </Reveal>
        </section>

        {/* ---------------- Showcase: funcionários e ponto ---------------- */}
        <section className="pb-20 sm:pb-28">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <SectionHead
                eyebrow="Plano Profissional"
                title="Sua equipe e o ponto, integrados"
                sub="A partir do plano Profissional, o Codex Flow ganha a tabela de funcionários e a integração com sistema de batida de ponto — além de relatórios financeiros bem mais detalhados."
              />
              <ul className="mt-6 flex flex-col gap-3">
                {["Tabela de funcionários", "Integração com batida de ponto", "Relatórios financeiros detalhados"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-[#a8a3cf]">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6c5ce7]/20">
                        <Check size={12} className="text-[#9b8ff5]" />
                      </span>
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </Reveal>

            {/* Print da tela de funcionários/ponto — coloque /screenshots/funcionarios.png */}
            <Reveal delay={150}>
              <BrowserFrame>
                <Screenshot src="/screenshots/funcionarios.png" alt="Tela de funcionários e ponto do Codex Flow">
                  <div className="flex flex-col gap-2.5 p-5">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs text-[#a8a3cf]">Funcionários</p>
                      <span className="flex items-center gap-1 rounded-full bg-[#32BCAD]/10 px-2 py-0.5 text-[10px] text-[#32BCAD]">
                        <Clock size={10} />
                        Ponto ativo
                      </span>
                    </div>
                    {[
                      { nome: "Ana Souza", cargo: "Vendas", status: "08:02" },
                      { nome: "Carlos Lima", cargo: "Estoque", status: "07:58" },
                      { nome: "Julia Reis", cargo: "Atendimento", status: "08:11" },
                      { nome: "Pedro Alves", cargo: "Entregas", status: "—" },
                    ].map(({ nome, cargo, status }) => (
                      <div
                        key={nome}
                        className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6c5ce7]/20 text-[10px] text-[#b3a8ff]">
                            {nome
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </span>
                          <div>
                            <p className="text-xs text-[#e8e4ff]">{nome}</p>
                            <p className="text-[10px] text-[#5e5a82]">{cargo}</p>
                          </div>
                        </div>
                        <span className={`text-[11px] ${status === "—" ? "text-[#5e5a82]" : "text-[#32BCAD]"}`}>
                          {status}
                        </span>
                      </div>
                    ))}
                  </div>
                </Screenshot>
              </BrowserFrame>
            </Reveal>
          </div>
        </section>

        {/* ---------------- Showcase: chatbot ---------------- */}
        <section className="pb-20 sm:pb-28">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            {/* Print do chatbot — coloque /screenshots/chatbot.png */}
            <Reveal className="order-2 lg:order-1">
              <BrowserFrame>
                <Screenshot src="/screenshots/chatbot.png" alt="Tela do chatbot do Codex Flow">
                  <div className="flex flex-col gap-3 p-5">
                    <div className="flex items-center gap-2 border-b border-white/[0.05] pb-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#6c5ce7]/20">
                        <Bot size={14} className="text-[#9b8ff5]" />
                      </span>
                      <p className="text-xs text-[#a8a3cf]">Assistente do seu negócio</p>
                    </div>
                    <div className="max-w-[80%] self-start rounded-2xl rounded-tl-sm bg-white/[0.05] px-3.5 py-2.5 text-xs leading-relaxed text-[#a8a3cf]">
                      Olá! Quer ver o horário de funcionamento ou acompanhar seu pedido?
                    </div>
                    <div className="max-w-[80%] self-end rounded-2xl rounded-tr-sm bg-[#6c5ce7]/30 px-3.5 py-2.5 text-xs leading-relaxed text-[#e8e4ff]">
                      Quero acompanhar meu pedido
                    </div>
                    <div className="max-w-[80%] self-start rounded-2xl rounded-tl-sm bg-white/[0.05] px-3.5 py-2.5 text-xs leading-relaxed text-[#a8a3cf]">
                      Claro! Me informa o número da sua nota de venda 😉
                    </div>
                  </div>
                </Screenshot>
              </BrowserFrame>
            </Reveal>

            <Reveal delay={150} className="order-1 lg:order-2">
              <SectionHead
                eyebrow="Plano Premium"
                title="Um chatbot com a cara do seu negócio"
                sub="No plano Premium, você configura um chatbot do seu jeito: respostas, tom de voz e fluxos de atendimento — para responder clientes mesmo quando você não está na frente da tela."
              />
              <ul className="mt-6 flex flex-col gap-3">
                {[
                  "Chatbot totalmente configurável",
                  "Atendimento fora do horário comercial",
                  "Relatórios financeiros completos",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-[#a8a3cf]">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6c5ce7]/20">
                      <Check size={12} className="text-[#9b8ff5]" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* ---------------- Planos ---------------- */}
        <section id="planos" className="pb-20 sm:pb-28">
          <Reveal>
            <SectionHead
              eyebrow="Planos"
              title="Um plano para cada momento do seu negócio"
              sub="Comece pelo Essencial e evolua quando a sua operação pedir mais."
              className="mb-12"
            />
          </Reveal>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:items-stretch">
            {PLANS.map(({ name, price, desc, features, highlight, ...rest }, i) => (
              <Reveal key={name} delay={i * 120} className="h-full">
                <div
                  className={`relative flex h-full flex-col rounded-2xl px-7 py-8 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 ${
                    highlight
                      ? "border border-[#7c6ef5]/50 bg-[#6c5ce7]/[0.08] shadow-[0_20px_60px_-20px_rgba(108,92,231,0.45)]"
                      : "border border-white/[0.07] bg-white/[0.03] hover:border-[#7c6ef5]/30"
                  }`}
                >
                  {"tag" in rest && (
                    <span className="absolute -top-3 left-7 whitespace-nowrap rounded-full bg-gradient-to-r from-[#6c5ce7] to-[#9b8ff5] px-3.5 py-1 text-[11px] text-white">
                      {rest.tag}
                    </span>
                  )}

                  <h3 className="mb-1 text-[15px] text-[#f0effe]">{name}</h3>
                  <p className="mb-5 text-xs leading-relaxed text-[#7a769e]">{desc}</p>

                  <div className="mb-6 flex items-baseline gap-1">
                    <span className="text-sm text-[#7a769e]">R$</span>
                    <span className="text-3xl text-[#f0effe]">{price}</span>
                    <span className="text-xs text-[#5e5a82]">/mês</span>
                  </div>

                  <ul className="mb-8 flex flex-1 flex-col gap-3">
                    {features.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-[#a8a3cf]">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#6c5ce7]/20">
                          <Check size={12} className="text-[#9b8ff5]" />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => navigate("/cadastro")}
                    className={highlight ? primaryBtn : ghostBtn}
                  >
                    Escolher {name}
                  </button>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ---------------- Como funciona ---------------- */}
        <section className="pb-20 sm:pb-28">
          <Reveal>
            <SectionHead
              eyebrow="Como funciona"
              title="Do cadastro ao primeiro login em três passos"
              sub="Sem contrato complicado e sem espera: sua conta ativa no mesmo dia."
              className="mb-12"
            />
          </Reveal>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {HOW_IT_WORKS.map(({ step, title, text }, i) => (
              <Reveal key={step} delay={i * 120}>
                <div className={`${cardCls} h-full px-7 py-8`}>
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#6c5ce7] to-[#9b8ff5] text-sm text-white">
                    {step}
                  </div>
                  <h3 className="mb-1.5 text-[15px] text-[#f0effe]">{title}</h3>
                  <p className="text-sm leading-relaxed text-[#7a769e]">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={200}>
            <p className="mt-8 flex items-center gap-2 text-xs text-[#5e5a82]">
              <QrCode size={13} className="text-[#32BCAD]" />
              Ativação do primeiro acesso via Pix, com QR Code ou copia e cola.
            </p>
          </Reveal>
        </section>

        {/* ---------------- FAQ ---------------- */}
        <section className="pb-20 sm:pb-28">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <Reveal>
              <SectionHead
                eyebrow="Dúvidas frequentes"
                title="Perguntas que sempre chegam"
                sub="Se a sua não estiver aqui, fale com a gente pelo cadastro."
              />
            </Reveal>

            <Reveal delay={100} className="flex flex-col gap-3">
              {FAQ.map(({ q, a }) => (
                <details
                  key={q}
                  className="group rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-xl open:border-[#7c6ef5]/30"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-sm text-[#e8e4ff] [&::-webkit-details-marker]:hidden">
                    {q}
                    <ChevronDown
                      size={16}
                      className="shrink-0 text-[#5e5a82] transition-transform duration-300 group-open:rotate-180"
                    />
                  </summary>
                  <p className="px-6 pb-5 text-sm leading-relaxed text-[#7a769e]">{a}</p>
                </details>
              ))}
            </Reveal>
          </div>
        </section>

        {/* ---------------- CTA final ---------------- */}
        <section className="pb-20 sm:pb-28">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-[#7c6ef5]/25 bg-white/[0.03] px-8 py-12 backdrop-blur-xl sm:px-12 sm:py-14">
              <div className="pointer-events-none absolute -right-20 -top-24 h-[300px] w-[420px] rounded-full bg-[#6c5ce7] opacity-20 blur-[110px]" />
              <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_auto]">
                <div>
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6c5ce7]/15">
                    <LayoutDashboard size={22} className="text-[#9b8ff5]" />
                  </div>
                  <h2 className="max-w-xl text-2xl text-[#f0effe] sm:text-[32px] sm:leading-tight">
                    Seu negócio merece uma gestão profissional
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-[#7a769e]">
                    Cadastre sua empresa em poucos minutos, ative com Pix e comece hoje a partir de R$ 31,90.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:flex-col">
                  <button
                    type="button"
                    onClick={() => navigate("/cadastro")}
                    className={`${primaryBtn} whitespace-nowrap`}
                  >
                    Cadastrar minha empresa
                    <ArrowRight size={16} />
                  </button>
                  <button type="button" onClick={() => navigate("/login")} className={ghostBtn}>
                    Entrar
                  </button>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      {/* ---------------- Footer ---------------- */}
      <footer className="relative z-10 border-t border-white/[0.06]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs text-[#5e5a82] sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5">
            <LogoMark size={26} />
            <span>
              © {new Date().getFullYear()} Codex Flow · Desenvolvido pela{" "}
              <span className="text-[#9b8ff5]">CodEx Solutions</span>
            </span>
          </div>
          <div className="flex items-center gap-5">
            <button type="button" onClick={() => navigate("/login")} className="transition hover:text-[#a8a3cf]">
              Entrar
            </button>
            <button type="button" onClick={() => navigate("/cadastro")} className="transition hover:text-[#a8a3cf]">
              Cadastrar empresa
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
