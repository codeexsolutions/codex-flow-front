import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, Eye, EyeOff, FileText, AlertCircle } from "lucide-react";

import AuthFormInputs, { authSchema } from "../Schema/auth.schema";
import { formatDocument } from "../../../../utils/format";

type AuthFormProps = {
  onSubmit: (data: AuthFormInputs) => Promise<void>;
  isLoading: boolean;
  loginError: boolean;
};

const AuthForm = ({ onSubmit, isLoading, loginError }: AuthFormProps) => {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<AuthFormInputs>({
    resolver: zodResolver(authSchema),
  });

  const regCpfCnpj = register("cpfCnpjEmpresa");

  // Classe base dos inputs — maiores e mais legíveis
  const inputBase =
    "w-full rounded-xl border bg-white/[0.04] py-3 pl-11 text-[15px] text-[#f4f2ff] outline-none transition-colors placeholder:text-[#6f6a93] focus:bg-white/[0.06]";
  const borderOk = "border-white/[0.1] focus:border-[#7c6ef5]";
  const borderErr = "border-[#f05050]/50 focus:border-[#f05050]";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {loginError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-[#f05050]/25 bg-[#f05050]/10 px-4 py-3">
          <AlertCircle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#f09595]" />
          <p className="text-[13px] leading-snug text-[#f0a5a5]">
            Dados de acesso incorretos. Confira e tente novamente.
          </p>
        </div>
      )}

      {/* CPF / CNPJ */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cpfCnpjEmpresa" className="text-[13px] font-medium text-[#c8c4e6]">
          CPF ou CNPJ da empresa
        </label>
        <div className="relative">
          <FileText className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8a86b0]" />
          <input
            id="cpfCnpjEmpresa"
            inputMode="numeric"
            placeholder="00.000.000/0000-00"
            aria-invalid={!!errors.cpfCnpjEmpresa}
            className={`${inputBase} pr-4 ${errors.cpfCnpjEmpresa ? borderErr : borderOk}`}
            {...regCpfCnpj}
            onChange={(e) => {
              const formatted = formatDocument(e.target.value);
              e.target.value = formatted;
              setValue("cpfCnpjEmpresa", formatted, { shouldValidate: true });
            }}
          />
        </div>
        {errors.cpfCnpjEmpresa?.message && (
          <p className="text-[12.5px] text-[#f0a5a5]">{errors.cpfCnpjEmpresa.message}</p>
        )}
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-[13px] font-medium text-[#c8c4e6]">
          Email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8a86b0]" />
          <input
            id="email"
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
            aria-invalid={!!errors.email}
            className={`${inputBase} pr-4 ${errors.email ? borderErr : borderOk}`}
            {...register("email")}
          />
        </div>
        {errors.email?.message && <p className="text-[12.5px] text-[#f0a5a5]">{errors.email.message}</p>}
      </div>

      {/* Senha */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="senha" className="text-[13px] font-medium text-[#c8c4e6]">
            Senha
          </label>
          <button
            type="button"
            className="text-[13px] font-medium text-[#a99ff0] transition-colors hover:text-[#c4baff]"
          >
            Esqueceu a senha?
          </button>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#8a86b0]" />
          <input
            id="senha"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            aria-invalid={!!errors.senha}
            className={`${inputBase} pr-11 ${errors.senha ? borderErr : borderOk}`}
            {...register("senha")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#8a86b0] transition-colors hover:text-[#c4baff]"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.senha?.message && <p className="text-[12.5px] text-[#f0a5a5]">{errors.senha.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="group relative mt-1 w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#7c5cff] via-[#6c5ce7] to-[#3b6ef5] py-3 text-[15px] font-semibold text-white shadow-[0_12px_30px_-10px_rgba(108,92,231,0.75)] transition-all duration-200 hover:shadow-[0_16px_40px_-10px_rgba(59,110,245,0.7)] hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        <span className="relative">{isLoading ? "Entrando..." : "Entrar"}</span>
      </button>
    </form>
  );
};

export default AuthForm;
