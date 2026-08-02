import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Package, Users, BarChart3, Wallet, FileText, ArrowRight, Check, Zap, ShieldCheck, Smartphone } from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════
   Efeitos
   ══════════════════════════════════════════════════════════════════════ */

/** Malha de pontos + halos: a "textura de tecnologia" do fundo. */
const GridTecnologico = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ opacity: "var(--fx-aurora, 1)" }}>
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, rgb(var(--fg) / 0.16) 1px, transparent 0)",
        backgroundSize: "38px 38px",
        maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)",
      }}
    />
    <div className="absolute -left-32 -top-32 h-[520px] w-[520px] rounded-full bg-accent opacity-[0.18] blur-[150px]" />
    <div className="absolute -right-32 top-20 h-[460px] w-[460px] rounded-full opacity-[0.14] blur-[150px]" style={{ background: "rgb(var(--aurora-2))" }} />
  </div>
);

/** Revela o bloco ao entrar na viewport. */
const Reveal = ({ children, delay = 0 }: { children: ReactNode; delay?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisivel(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`transition-all duration-700 ease-out ${visivel ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
      {children}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   Conteúdo
   ══════════════════════════════════════════════════════════════════════ */

const RECURSOS = [
  { icon: <ShoppingCart size={18} />, titulo: "PDV ágil", desc: "Abra a nota, escolha o cliente e feche a venda sem sair da tela." },
  { icon: <Package size={18} />, titulo: "Estoque vivo", desc: "Quantidade, custo e alerta de reposição atualizados a cada venda." },
  { icon: <Users size={18} />, titulo: "Clientes", desc: "Histórico de compras, contatos e situação de cada cliente." },
  { icon: <Wallet size={18} />, titulo: "Financeiro", desc: "Parcelas a receber e fluxo de caixa no mesmo lugar." },
  { icon: <BarChart3 size={18} />, titulo: "Dashboard", desc: "Faturado, recebido e a receber assim que você entra." },
  { icon: <FileText size={18} />, titulo: "Relatórios em A4", desc: "Escolha o período, confira a prévia e imprima direto." },
];

const DIFERENCIAIS = [
  { icon: <Zap size={15} />, texto: "Interface que responde na hora" },
  { icon: <ShieldCheck size={15} />, texto: "Seus dados isolados por empresa" },
  { icon: <Smartphone size={15} />, texto: "Funciona no computador e no celular" },
];

/** Mock da interface — mostra o produto sem depender de screenshot. */
const AppMock = () => (
  <div className="glass-strong elev-3 relative overflow-hidden rounded-xl">
    <div className="flex items-center gap-1.5 border-b border-fg/[0.07] px-3 py-2">
      <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
      <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
      <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
      <span className="ml-2 text-[10px] text-faint">app.codexflow</span>
    </div>

    <div className="flex">
      <div className="hidden w-32 shrink-0 flex-col gap-1.5 border-r border-fg/[0.07] p-2.5 sm:flex">
        {["Dashboard", "PDV", "Estoque", "Clientes", "Vendas"].map((m, i) => (
          <div key={m} className={`flex items-center gap-1.5 rounded px-2 py-1.5 text-[10px] ${i === 0 ? "bg-accent/20 text-accent-soft" : "text-faint"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${i === 0 ? "bg-accent" : "bg-fg/20"}`} />
            {m}
          </div>
        ))}
      </div>

      <div className="min-w-0 flex-1 p-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: "Faturado", v: "R$ 18.240", c: "text-accent-soft" },
            { l: "Recebido", v: "R$ 12.900", c: "text-success" },
            { l: "A receber", v: "R$ 5.340", c: "text-warning" },
          ].map((k) => (
            <div key={k.l} className="rounded border border-fg/[0.07] bg-fg/[0.03] p-2">
              <p className="text-[8.5px] text-faint">{k.l}</p>
              <p className={`nums mt-0.5 text-[12px] ${k.c}`}>{k.v}</p>
            </div>
          ))}
        </div>

        <div className="mt-2.5 flex h-20 items-end gap-1 rounded border border-fg/[0.07] bg-fg/[0.02] p-2">
          {[38, 52, 44, 68, 58, 82, 74, 92, 66, 88, 78, 96].map((h, i) => (
            <div key={i} className="flex-1 rounded-sm bg-gradient-to-t from-accent/30 to-accent-soft" style={{ height: `${h}%` }} />
          ))}
        </div>

        <div className="mt-2.5 flex flex-col gap-1.5">
          {[70, 55, 62].map((w, i) => (
            <div key={i} className="flex items-center gap-2 rounded border border-fg/[0.06] bg-fg/[0.02] px-2 py-1.5">
              <span className="h-4 w-4 shrink-0 rounded bg-accent/25" />
              <span className="h-1.5 rounded-full bg-fg/[0.12]" style={{ width: `${w}%` }} />
              <span className="ml-auto h-1.5 w-8 rounded-full bg-success/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════════
   Página
   ══════════════════════════════════════════════════════════════════════ */

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-canvas text-ink">
      <GridTecnologico />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="" width={34} height={34} className="rounded-lg" />
          <span className="text-[15px] tracking-tight">CodeEx Flow</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/login")} className="focus-ring cursor-pointer rounded-lg px-3.5 py-2 text-[13px] text-mist transition-colors hover:text-ink">
            Entrar
          </button>
          <button onClick={() => navigate("/planos")} className="focus-ring cursor-pointer rounded-lg bg-gradient-to-br from-accent-soft to-accent px-4 py-2 text-[13px] text-white shadow-glow transition-all hover:brightness-110 active:scale-[0.98]">
            Criar conta
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-16 pt-10 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <Reveal>
              <span className="glass-subtle inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11.5px] text-mist">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                </span>
                Gestão completa para o seu negócio
              </span>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="mt-5 text-[34px] leading-[1.1] tracking-tight sm:text-[44px]">
                Do balcão ao <span className="text-gradient">relatório</span>,<br className="hidden sm:block" /> num sistema só.
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-mist">Venda, controle o estoque, acompanhe clientes e feche o caixa sem trocar de ferramenta. O CodeEx Flow conecta tudo e mostra o resultado em tempo real.</p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button onClick={() => navigate("/planos")} className="focus-ring group inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-br from-accent-soft to-accent px-5 py-3 text-[14px] text-white shadow-glow transition-all hover:brightness-110 active:scale-[0.98]">
                  Cadastrar minha empresa
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </button>
                <button onClick={() => navigate("/login")} className="glass-subtle focus-ring inline-flex cursor-pointer items-center gap-2 rounded-lg px-5 py-3 text-[14px] text-mist transition-colors hover:text-ink">
                  Já tenho conta
                </button>
              </div>
            </Reveal>

            <Reveal delay={320}>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
                {DIFERENCIAIS.map((d) => (
                  <span key={d.texto} className="inline-flex items-center gap-1.5 text-[12px] text-faint">
                    <span className="text-accent-soft">{d.icon}</span>
                    {d.texto}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>

          <Reveal delay={200}>
            <AppMock />
          </Reveal>
        </div>
      </section>

      {/* Recursos */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-16">
        <Reveal>
          <div className="mb-9 text-center">
            <h2 className="text-[26px] tracking-tight sm:text-[30px]">Tudo o que a operação precisa</h2>
            <p className="mx-auto mt-2.5 max-w-md text-[14px] text-mist">Cada módulo conversa com o outro — uma venda já baixa o estoque e aparece no caixa.</p>
          </div>
        </Reveal>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {RECURSOS.map((r, i) => (
            <Reveal key={r.titulo} delay={i * 60}>
              <article className="card-interactive glass-sheen group h-full p-5">
                <span className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/[0.14] text-accent-soft ring-1 ring-inset ring-accent/20 transition-transform group-hover:scale-105">{r.icon}</span>
                <h3 className="text-[15px] text-ink">{r.titulo}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-mist">{r.desc}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-16">
        <Reveal>
          <div className="mb-9 text-center">
            <h2 className="text-[26px] tracking-tight sm:text-[30px]">Comece em três passos</h2>
          </div>
        </Reveal>

        <div className="grid gap-3 md:grid-cols-3">
          {[
            { n: "01", t: "Cadastre a empresa", d: "Informe os dados e receba seu acesso." },
            { n: "02", t: "Suba produtos e clientes", d: "Monte sua base em poucos minutos." },
            { n: "03", t: "Venda e acompanhe", d: "Abra o PDV e veja o resultado no dashboard." },
          ].map((p, i) => (
            <Reveal key={p.n} delay={i * 90}>
              <div className="card glass-sheen relative h-full overflow-hidden p-5">
                <span className="absolute -right-2 -top-3 text-[62px] leading-none text-fg/[0.05]">{p.n}</span>
                <h3 className="relative text-[15px] text-ink">{p.t}</h3>
                <p className="relative mt-1.5 text-[13px] leading-relaxed text-mist">{p.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Chamada final */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-20">
        <Reveal>
          <div className="glass-strong glass-sheen elev-3 relative overflow-hidden rounded-xl px-6 py-12 text-center">
            <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 100% at 50% 0%, rgb(var(--accent) / 0.22), transparent 70%)", opacity: "var(--fx-glow, 1)" }} />

            <h2 className="relative text-[26px] tracking-tight sm:text-[32px]">Pronto para organizar sua operação?</h2>
            <p className="relative mx-auto mt-3 max-w-lg text-[14px] leading-relaxed text-mist">Crie a conta da sua empresa e comece a usar hoje mesmo. Sem instalação, direto no navegador.</p>

            <div className="relative mt-7 flex flex-wrap items-center justify-center gap-3">
              <button onClick={() => navigate("/planos")} className="focus-ring group inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-br from-accent-soft to-accent px-6 py-3 text-[14px] text-white shadow-glow transition-all hover:brightness-110 active:scale-[0.98]">
                Criar conta
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>

            <div className="relative mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-faint">
              {["Sem instalação", "Acesso imediato", "Suporte da equipe"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <Check size={13} className="text-success" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="relative z-10 border-t border-fg/[0.07]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-[12px] text-faint">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="" width={20} height={20} className="rounded" />
            <span>© {new Date().getFullYear()} CodeEx Flow</span>
          </div>
          <span>Desenvolvido por CodEx Solutions</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
