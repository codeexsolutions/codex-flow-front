import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ShoppingCart, Package, Wallet, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useAuth from "@/features/auth/store/auth.store";

import AuthForm from "@/features/auth/components/AuthForm";
import AuthFormInputs from "@/features/auth/schema/auth.schema";
import { onlyDigits } from "@/shared/utils/format";
import useTransicao from "@/shared/session/transicao.store";
import RedeAnimada from "@/features/landing/components/RedeAnimada";

const LANDING_ROUTE = "/page";

/** Três coisas concretas, não adjetivos. Aparecem só no painel do desktop. */
const DESTAQUES = [
  { icone: ShoppingCart, titulo: "PDV de balcão", texto: "Lança a venda, recebe em partes e emite a nota." },
  { icone: Package, titulo: "Estoque que avisa", texto: "O que está acabando aparece antes de faltar." },
  { icone: Wallet, titulo: "Dinheiro no lugar", texto: "Notas a receber e caixa do dia na mesma tela." },
  { icone: WifiOff, titulo: "Wi-Fi caiu, e daí", texto: "O sistema continua abrindo com os últimos dados." },
];

const AuthPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState(false);

  /* O overlay mora acima do roteador (`CamadaTransicao`); aqui só disparamos.
     `consumindo` serve para o card se desfazer junto. */
  const [consumindo, setConsumindo] = useState(false);
  const tocarTransicao = useTransicao((s) => s.tocar);

  const onSubmit = async (data: AuthFormInputs) => {
    if (isLoading) return;

    setLoginError(false);
    setIsLoading(true);

    try {
      await login(
        {
          email: data.email,
          senha: data.senha,
          cpfCnpjEmpresa: onlyDigits(data.cpfCnpjEmpresa),
        },
        // Toca a animação e segura o login aqui até ela acabar.
        (nome) => {
          setConsumindo(true);
          return tocarTransicao("entrada", nome);
        },
      );
    } catch {
      setLoginError(true);
      setConsumindo(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    /* No desktop o cartão sozinho boiava num monitor inteiro. Vira duas colunas:
       à esquerda a marca com a mesma rede animada da página inicial — quem entra
       reconhece de onde veio; à direita o formulário. Abaixo de `lg` nada muda. */
    <div className="vitrine relative h-[100dvh] w-full overflow-hidden bg-canvas lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-fg/[0.07] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <RedeAnimada className="absolute inset-0" />

        <div className="relative flex items-center gap-3">
          <img src="/logo.png" alt="" width={40} height={40} className="h-10 w-10 rounded-xl shadow-glow" />
          <span className="text-[17px] tracking-tight text-ink">CodeEx Flow</span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-[34px] leading-[1.1] tracking-tight text-ink">
            Sua loja inteira
            <br />
            <span className="text-accent-soft">num lugar só.</span>
          </h2>

          <ul className="mt-8 flex flex-col gap-4">
            {DESTAQUES.map(({ icone: Icone, titulo, texto }) => (
              <li key={titulo} className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/[0.12] text-accent-soft ring-1 ring-inset ring-accent/20">
                  <Icone size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] text-ink">{titulo}</span>
                  <span className="block text-[12.5px] leading-relaxed text-mist">{texto}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11.5px] text-faint">
          © {new Date().getFullYear()} CodeEx Flow · CodEx Solutions
        </p>
      </aside>

    <div className="relative flex h-full w-full items-center justify-center overflow-hidden px-3 py-3 sm:px-4 sm:py-5">
      {/* Glows de fundo — seguem o accent e somem no modo leve */}
      {/* `absolute`, não `fixed`: preso à coluna do formulário. Fixo na viewport
          ele passaria por cima da rede animada do painel da esquerda. */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" style={{ opacity: "var(--fx-aurora, 1)" }}>
        <div className="absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-accent opacity-[0.18] blur-[130px]" />
        <div className="absolute -bottom-24 -right-24 h-[420px] w-[420px] rounded-full opacity-[0.16] blur-[130px]" style={{ background: "rgb(var(--aurora-2))" }} />
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-soft opacity-[0.1] blur-[110px]" />
      </div>

      <motion.div
        className="relative z-10 flex max-h-full w-full max-w-sm flex-col sm:max-w-md"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
      >
        {/* Marca */}
        <motion.div
          className="mb-3 flex items-center justify-center gap-3 sm:mb-4"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <button type="button" onClick={() => navigate(LANDING_ROUTE)} className="group relative inline-flex items-center justify-center transition-transform duration-300 hover:scale-[1.04]" aria-label="Ir para a página inicial do CodeEx Flow">
            <span className="pointer-events-none absolute left-1/2 top-1/2 h-[80px] w-[80px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent blur-[36px]" style={{ opacity: "calc(0.5 * var(--fx-glow, 1))" }} />
            <img src="/logo.png" alt="CodeEx Flow" width={48} height={48} className="relative h-10 w-10 rounded-xl shadow-glow sm:h-12 sm:w-12" />
          </button>
          <div className="flex flex-col leading-tight">
            <span className="text-base tracking-tight text-ink sm:text-lg">CodeEx Flow</span>
            <span className="text-[10px] uppercase tracking-[2px] text-faint">Painel da empresa</span>
          </div>
        </motion.div>

        {/* Card — ao entrar, ele é "consumido": encolhe, desfoca e some. */}
        <motion.div
          className="glass-strong glass-sheen elev-3 relative rounded-2xl p-4 sm:p-6"
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={consumindo ? { opacity: 0, scale: 0.94, filter: "blur(10px)", y: -12 } : { opacity: 1, scale: 1, filter: "blur(0px)", y: 0 }}
          transition={{ duration: consumindo ? 0.55 : 0.6, delay: consumindo ? 0 : 0.12, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-accent-soft to-transparent opacity-70" />

          <h1 className="mb-0.5 text-base text-ink sm:text-lg">Entrar</h1>
          <p className="mb-3 text-[11px] text-mist sm:mb-4">Acesse sua conta para continuar</p>

          <AuthForm onSubmit={onSubmit} isLoading={isLoading} loginError={loginError} />

          <p className="mt-3 text-center text-[11px] text-faint">
            Ainda não tem conta?{" "}
            <button type="button" onClick={() => navigate("/cadastro")} className="text-accent transition-colors hover:text-accent-soft">
              Cadastre sua empresa
            </button>
          </p>
        </motion.div>

        {/* No celular "conhecer o site" era um link de 10px espremido no rodapé —
            invisível justamente para quem ainda não é cliente. Vira botão. */}
        <motion.button
          type="button"
          onClick={() => navigate(LANDING_ROUTE)}
          className="focus-ring mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-fg/[0.1] text-[13.5px] text-mist transition-colors active:bg-fg/[0.05] sm:hidden"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.28 }}
        >
          <Sparkles size={15} className="text-accent-soft" />
          Conhecer o CodeEx Flow
        </motion.button>

        <motion.p
          className="mt-3 hidden text-center text-[10px] text-muted sm:block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          © {new Date().getFullYear()} CodeEx Flow ·{" "}
          <button type="button" onClick={() => navigate(LANDING_ROUTE)} className="text-accent transition-colors hover:text-accent-soft">
            Conheça o CodeEx Flow
          </button>
        </motion.p>

        <p className="mt-3 text-center text-[10px] text-muted sm:hidden">© {new Date().getFullYear()} CodeEx Flow</p>
      </motion.div>

      </div>
    </div>
  );
};

export default AuthPage;
