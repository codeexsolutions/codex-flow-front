import { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../../store/auth.store";

import AuthForm from "../components/Form/Auth.form";
import AuthFormInputs from "../components/Schema/auth.schema";
import { onlyDigits } from "../../../utils/format";

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
    } catch (err) {
      setLoginError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="cf-page relative h-[100dvh] w-full flex items-center justify-center px-3 py-3 sm:px-4 sm:py-5 bg-[#0b0913] overflow-hidden">
      {/* Glows de fundo */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-[#8b5cf6] opacity-[0.15] blur-[130px]" />
        <div className="absolute -bottom-24 -right-24 w-[420px] h-[420px] rounded-full bg-[#3b6ef5] opacity-[0.15] blur-[130px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-[#6c5ce7] opacity-[0.09] blur-[110px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm sm:max-w-md flex flex-col max-h-full">
        {/* Marca */}
        <div className="cf-rise flex items-center justify-center gap-3 mb-3 sm:mb-4">
          <button
            type="button"
            onClick={() => navigate(LANDING_ROUTE)}
            className="group relative inline-flex items-center justify-center transition-transform duration-300 hover:scale-[1.04]"
            aria-label="Ir para a página inicial do Codex Flow"
          >
            <span className="cf-halo pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80px] h-[80px] rounded-full bg-[#7c5cff] opacity-50 blur-[36px]" />
            <img
              src="/logo.png"
              alt="Codex Flow"
              width={48}
              height={48}
              className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl shadow-[0_10px_30px_-8px_rgba(108,92,231,0.6)]"
            />
          </button>
          <div className="flex flex-col leading-tight">
            <span className="text-base sm:text-lg font-medium tracking-tight text-[#f0effe]">Codex Flow</span>
            <span className="text-[10px] uppercase tracking-[2px] text-[#6b6790]">Painel da empresa</span>
          </div>
        </div>

        {/* Card */}
        <div className="cf-rise-2 relative rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 sm:p-6 backdrop-blur-xl shadow-[0_25px_70px_-25px_rgba(0,0,0,0.8)]">
          <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#9b6bff] to-transparent opacity-70" />

          <h1 className="text-base sm:text-lg font-medium text-[#f0effe] mb-0.5">Entrar</h1>
          <p className="text-[11px] text-[#7a769e] mb-3 sm:mb-4">Acesse sua conta para continuar</p>

          <AuthForm onSubmit={onSubmit} isLoading={isLoading} loginError={loginError} />

          <p className="mt-3 text-center text-[11px] text-[#6b6790]">
            Ainda não tem conta?{" "}
            <button
              type="button"
              onClick={() => navigate("/cadastro")}
              className="text-[#8b7bf0] transition-colors hover:text-[#a99ff0]"
            >
              Cadastre sua empresa
            </button>
          </p>
        </div>

        <p className="mt-2 sm:mt-3 text-center text-[10px] text-[#5e5a82]">
          © {new Date().getFullYear()} Codex Flow ·{" "}
          <button
            type="button"
            onClick={() => navigate(LANDING_ROUTE)}
            className="text-[#8b7bf0] transition-colors hover:text-[#a99ff0]"
          >
            Conheça o Codex Flow
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
