import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LifeBuoy, MessageCircle, Mail, ChevronDown, ShieldCheck, Building2, Store, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageScreen } from "@/shared/ui/PageShell";
import { useContatoSuporte, linkWhatsapp } from "@/shared/suporte/useContatoSuporte";
import { useAlert } from "@/shared/ui/Alert";
import useAuth from "@/features/auth/store/auth.store";
import sysgrafix from "@/shared/api/sysgrafix";
import RedeAnimada from "@/features/landing/components/RedeAnimada";

/**
 * Ajuda e suporte.
 *
 * Sanfona em vez de tudo aberto. A versão anterior despejava quatro seções de
 * uma vez e obrigava a rolar para achar o telefone — que é o que 90% das
 * pessoas vem buscar. Fechado, cabe tudo numa tela; quem quer detalhe abre.
 *
 * A animação é a mesma da entrada do sistema e do 404: opacidade e um
 * deslocamento curto, com mola suave. Sem escala — escala em bloco de texto
 * borra a letra enquanto anima.
 */

type Secao = { id: string; icone: LucideIcon; titulo: string; resumo: string };

const SECOES: Secao[] = [
  { id: "produto", icone: Store, titulo: "O que é o CodeEx Flow", resumo: "Para que serve e para quem" },
  { id: "privacidade", icone: ShieldCheck, titulo: "Privacidade dos seus dados", resumo: "O que fazemos e o que não fazemos" },
  { id: "empresa", icone: Building2, titulo: "Quem mantém o sistema", resumo: "CodEx Solutions" },
];

const AjudaPage = () => {
  const { whatsapp, email } = useContatoSuporte();
  const reduzir = useReducedMotion();
  const alerta = useAlert();

  const { user } = useAuth();
  const ehMaster = Boolean(user?.root);

  /* Uma por vez: duas abertas voltariam ao problema de rolar para achar. */
  const [aberta, setAberta] = useState<string | null>(null);
  const [baixando, setBaixando] = useState(false);

  const entra = (atraso: number) =>
    reduzir ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: atraso, duration: 0.45, ease: [0.22, 0.61, 0.36, 1] as const } };

  const baixarDados = async () => {
    setBaixando(true);

    try {
      const r = await sysgrafix.get("/exportacao", { responseType: "blob" });

      const url = URL.createObjectURL(r.data as Blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `codeex-flow-dados-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();

      URL.revokeObjectURL(url);
      alerta.success("Cópia gerada!", "O arquivo foi baixado.");
    } catch {
      alerta.error("Não foi possível exportar", "Tente de novo em instantes.");
    } finally {
      setBaixando(false);
    }
  };

  return (
    <PageScreen icon={<LifeBuoy className="h-5 w-5" />} title="Ajuda e suporte" subtitle="Fale com a gente e entenda o sistema">
      {/*
       * A mesma rede da tela de entrada, agora como fundo.
       *
       * `absolute` e não `fixed`: presa ao conteúdo da página, senão cobriria
       * a sidebar e o cabeçalho. E `-z-10` para o texto continuar clicável.
       *
       * Opacidade baixa de propósito: aqui a rede é textura de fundo, não
       * assunto. Na entrada ela pode aparecer porque não há o que ler por cima;
       * numa tela de leitura, forte demais ela briga com o texto.
       */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-[0.18]">
        <RedeAnimada className="absolute inset-0" />
      </div>

      {/* ---------- Marca e contato, na mesma faixa ----------
           Empilhados, a marca ocupava uma tela inteira de altura sem dizer
           nada de novo — o nome do sistema já está no menu. Lado a lado, a
           faixa preenche a largura e o contato sobe para o primeiro olhar. */}
      <motion.div className="grid shrink-0 items-center gap-3 lg:grid-cols-[auto_1fr]" {...entra(0)}>
        {/* A marca é a peça da tela: ela ancora tudo o que vem depois. Cartão
            largo com o nome em corpo grande, não uma etiqueta discreta. */}
        <div className="flex items-center gap-5 rounded-2xl border border-fg/[0.07] bg-fg/[0.02] px-7 py-7">
          <motion.img
            src="/logo.png"
            alt="CodeEx Flow"
            width={80}
            height={80}
            className="h-[68px] w-[68px] shrink-0 rounded-2xl shadow-glow"
            animate={reduzir ? {} : { y: [0, -5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="min-w-0">
            <p className="font-display text-[30px] leading-none tracking-tight text-ink">
              CodeEx <span className="text-accent-soft">Flow</span>
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-mist">Gestão para quem vende no balcão</p>
            <p className="mt-0.5 text-[11.5px] text-faint">Segunda a sexta, 8h às 18h</p>
          </div>
        </div>

        <div className="grid h-full gap-3 sm:grid-cols-2">
        {whatsapp && (
          <a
            href={linkWhatsapp(whatsapp, "Olá! Preciso de ajuda com o CodeEx Flow.")}
            target="_blank"
            rel="noopener noreferrer"
            className="card glass-sheen flex items-center gap-3 p-4 transition-transform hover:-translate-y-0.5"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
              <MessageCircle size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] text-ink">WhatsApp</span>
              <span className="block truncate text-[12.5px] text-accent">{whatsapp}</span>
            </span>
          </a>
        )}

        {email && (
          <a href={`mailto:${email}`} className="card glass-sheen flex items-center gap-3 p-4 transition-transform hover:-translate-y-0.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/[0.14] text-accent-soft">
              <Mail size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] text-ink">E-mail</span>
              <span className="block truncate text-[12.5px] text-accent">{email}</span>
            </span>
          </a>
        )}
        </div>
      </motion.div>

      {/* ---------- Seções ---------- */}
      <motion.div className="flex shrink-0 flex-col gap-2" {...entra(0.1)}>
        {SECOES.map(({ id, icone: Icone, titulo, resumo }) => {
          const on = aberta === id;

          return (
            <div key={id} className="overflow-hidden rounded-2xl border border-fg/[0.07] bg-fg/[0.02]">
              <button
                type="button"
                onClick={() => setAberta(on ? null : id)}
                aria-expanded={on}
                className="focus-ring flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-fg/[0.03]"
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors ${on ? "bg-accent/[0.16] text-accent-soft" : "bg-fg/[0.05] text-mist"}`}>
                  <Icone size={16} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] text-ink">{titulo}</span>
                  <span className="block truncate text-[11.5px] text-faint">{resumo}</span>
                </span>

                <motion.span animate={{ rotate: on ? 180 : 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="shrink-0 text-muted">
                  <ChevronDown size={16} />
                </motion.span>
              </button>

              {/* `height: auto` animado dá a sensação de abrir. `AnimatePresence`
                  garante que fechar também seja suave — abrir bonito e fechar
                  seco fica pior do que não animar. */}
              <AnimatePresence initial={false}>
                {on && (
                  <motion.div
                    initial={reduzir ? false : { height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={reduzir ? { opacity: 0 } : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-fg/[0.06] px-4 py-4 text-[12.5px] leading-relaxed text-mist">
                      {id === "produto" && (
                        <div className="flex flex-col gap-3">
                          <p>
                            O Flow é um sistema de gestão para <span className="text-ink">quem vende no balcão</span>: loja de roupa, papelaria, gráfica, assistência, distribuidora. Reúne num lugar só o que hoje costuma estar espalhado entre caderno, planilha e WhatsApp.
                          </p>

                          <p>
                            Você <span className="text-ink">abre a nota, lança os produtos e recebe</span> — inclusive em partes, com o saldo pendente sempre à vista. O estoque baixa sozinho, o cliente fica no cadastro com histórico, e o dinheiro aparece no financeiro sem você digitar de novo.
                          </p>

                          <p>
                            <span className="text-ink">Para quem tem equipe:</span> cada funcionário entra com login próprio e vê só o que é dele. O dono acompanha quem vendeu o quê e recebe aviso do que a equipe faz.
                          </p>

                          <p>
                            Funciona no computador e no celular — instala como aplicativo — e <span className="text-ink">continua abrindo quando a internet da loja cai</span>.
                          </p>
                        </div>
                      )}

                      {id === "privacidade" && (
                        <div className="flex flex-col gap-3">
                          <p>
                            <span className="text-ink">Os dados são seus.</span> Cadastros, vendas e financeiro pertencem à sua empresa. Não vendemos, não cedemos e não usamos para publicidade.
                          </p>

                          <p>
                            <span className="text-ink">Cada loja vê só a própria loja.</span> Nenhuma consulta atravessa de uma empresa para outra. Senhas ficam cifradas — não podem ser lidas nem por nós.
                          </p>

                          <p>
                            <span className="text-ink">Só entramos quando você chama.</span> A nossa equipe acessa seus dados apenas em atendimento de suporte, e apenas no necessário para resolver.
                          </p>

                          <p>Você pode pedir uma cópia ou a exclusão dos seus dados quando quiser, conforme a LGPD.</p>

                          {/* Link, não botão. Exportar a base é coisa rara — uma
                              vez por ano, se tanto. Como botão destacado, competia
                              com o texto e sugeria uma ação corriqueira que não é. */}
                          {ehMaster && (
                            <p className="text-[11.5px] text-faint">
                              Quer uma cópia agora?{" "}
                              <button
                                type="button"
                                onClick={baixarDados}
                                disabled={baixando}
                                className="focus-ring inline-flex items-center gap-1 rounded text-accent underline decoration-accent/30 underline-offset-2 transition-colors hover:text-accent-soft disabled:opacity-50"
                              >
                                {baixando && <Loader2 size={11} className="animate-spin" />}
                                {baixando ? "gerando…" : "clique aqui"}
                              </button>
                              .
                            </p>
                          )}
                        </div>
                      )}

                      {id === "empresa" && (
                        <div className="flex flex-col gap-3">
                          {/* Grade em vez de lista: os quatro dados são curtos e
                              lado a lado ocupam a largura que a seção já tem —
                              empilhados, sobrava metade da linha em branco. */}
                          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-fg/[0.06] lg:grid-cols-4">
                            {[
                              ["Empresa", "CodEx Solutions"],
                              ["Produto", "CodeEx Flow"],
                              ["WhatsApp", whatsapp || "—"],
                              ["E-mail", email || "—"],
                            ].map(([rotulo, valor]) => (
                              <div key={rotulo} className="min-w-0 bg-surface px-3.5 py-3">
                                <dt className="text-[10px] uppercase tracking-[0.1em] text-faint">{rotulo}</dt>
                                <dd className="mt-1 truncate text-[13px] text-ink" title={valor}>
                                  {valor}
                                </dd>
                              </div>
                            ))}
                          </dl>

                          <p className="text-[11.5px] leading-relaxed text-faint">
                            © {new Date().getFullYear()} CodEx Solutions — o CodeEx Flow é licenciado por assinatura, e o uso segue os termos aceitos no cadastro.
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </motion.div>
    </PageScreen>
  );
};

export default AjudaPage;
