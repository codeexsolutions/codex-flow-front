import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "@/features/auth/store/auth.store";

import AuthForm from "@/features/auth/components/AuthForm";
import AuthFormInputs from "@/features/auth/schema/auth.schema";
import { onlyDigits } from "@/shared/utils/format";

const LANDING_ROUTE = "/page";

const AuthPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState(false);

  const onSubmit = async (data: AuthFormInputs) => {
    if (isLoading) return;

    setLoginError(false);
    setIsLoading(true);

    try {
      await login({
        email: data.email,
        senha: data.senha,
        cpfCnpjEmpresa: onlyDigits(data.cpfCnpjEmpresa),
      });
    } catch {
      setLoginError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-canvas px-3 py-3 sm:px-4 sm:py-5">
      {/* Glows de fundo — seguem o accent e somem no modo leve */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" style={{ opacity: "var(--fx-aurora, 1)" }}>
        <div className="absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-accent opacity-[0.18] blur-[130px]" />
        <div className="absolute -bottom-24 -right-24 h-[420px] w-[420px] rounded-full opacity-[0.16] blur-[130px]" style={{ background: "rgb(var(--aurora-2))" }} />
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-soft opacity-[0.1] blur-[110px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm sm:max-w-md flex flex-col max-h-full">
        {/* Marca */}
        <div className="cf-rise flex items-center justify-center gap-3 mb-3 sm:mb-4">
          <button type="button" onClick={() => navigate(LANDING_ROUTE)} className="group relative inline-flex items-center justify-center transition-transform duration-300 hover:scale-[1.04]" aria-label="Ir para a página inicial do Codex Flow">
            <span className="pointer-events-none absolute left-1/2 top-1/2 h-[80px] w-[80px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent blur-[36px]" style={{ opacity: "calc(0.5 * var(--fx-glow, 1))" }} />
            <img src="/logo.png" alt="Codex Flow" width={48} height={48} className="relative h-10 w-10 rounded-xl shadow-glow sm:h-12 sm:w-12" />
          </button>
          <div className="flex flex-col leading-tight">
            <span className="text-base tracking-tight text-ink sm:text-lg">Codex Flow</span>
            <span className="text-[10px] uppercase tracking-[2px] text-faint">Painel da empresa</span>
          </div>
        </div>

        {/* Card */}
        <div className="glass-strong glass-sheen elev-3 relative rounded-2xl p-4 sm:p-6">
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
        </div>

        <p className="mt-2 text-center text-[10px] text-muted sm:mt-3">
          © {new Date().getFullYear()} Codex Flow ·{" "}
          <button type="button" onClick={() => navigate(LANDING_ROUTE)} className="text-accent transition-colors hover:text-accent-soft">
            Conheça o Codex Flow
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
