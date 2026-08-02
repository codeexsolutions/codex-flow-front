import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2, User, Mail, Phone, Smartphone, MessageCircle, MapPin, Hash, FileText,
  Image as ImageIcon, ArrowLeft, ArrowRight, Loader2, Lock, Eye, EyeOff, Check, Sparkles,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { onlyDigits } from "@/shared/utils/format";
import { maskCep, maskCpfCnpj, maskPhone, UFS } from "@/shared/validation/masks";
import { isValidCpfCnpj } from "@/shared/validation/documento";
import { formatCurrencyFromCents } from "@/shared/utils/currency";

import AuthService from "@/features/auth/services/auth.service";
import useAuth from "@/features/auth/store/auth.store";
import AssinaturaService from "@/features/assinatura/services/assinatura.service";
import { CICLO_LABEL, type Plano } from "@/features/assinatura/types/assinatura.types";

const LANDING_ROUTE = "/";

/* ------------------------------------------------------------------ */
/* Schema Zod */
/* ------------------------------------------------------------------ */

const optionalUrl = z.string().url("URL inválida").or(z.literal("")).optional();

const cadastroSchema = z
  .object({
    planoCodigo: z.string().min(1, "Escolha um plano"),

    nomeFantasia: z.string().min(1, "Obrigatório"),
    nomeRepresentante: z.string().min(1, "Obrigatório"),
    cpfCnpj: z.string().min(1, "Obrigatório").refine(isValidCpfCnpj, "CPF/CNPJ inválido"),
    inscMunicipal: z.string().optional(),
    urlLogo: optionalUrl,
    urlImagem: optionalUrl,

    contato: z.object({
      email: z.string().min(1, "Obrigatório").email("Email inválido"),
      celular: z
        .string()
        .min(1, "Obrigatório")
        .refine((v) => onlyDigits(v).length === 11, "Celular incompleto"),
      telefone: z
        .string()
        .optional()
        .refine((v) => !v || onlyDigits(v).length >= 10, "Telefone incompleto"),
      whatsapp: z
        .string()
        .optional()
        .refine((v) => !v || onlyDigits(v).length === 11, "WhatsApp incompleto"),
    }),

    endereco: z.object({
      cep: z
        .string()
        .min(1, "Obrigatório")
        .refine((v) => onlyDigits(v).length === 8, "CEP incompleto"),
      logradouro: z.string().min(1, "Obrigatório"),
      numero: z.string().min(1, "Obrigatório"),
      complemento: z.string().optional(),
      bairro: z.string().min(1, "Obrigatório"),
      cidade: z.string().min(1, "Obrigatória"),
      uf: z.string().min(1, "UF"),
    }),

    senha: z.string().min(6, "Mínimo de 6 caracteres"),
    confirmarSenha: z.string().min(1, "Confirme a senha"),
    aceite: z.boolean().refine((v) => v === true, "É preciso aceitar para continuar"),
  })
  .refine((d) => d.senha === d.confirmarSenha, {
    message: "As senhas não conferem",
    path: ["confirmarSenha"],
  });

type CadastroFormInputs = z.infer<typeof cadastroSchema>;

/* ------------------------------------------------------------------ */
/* Etapas */
/* ------------------------------------------------------------------ */

const STEPS = ["Plano", "Empresa", "Contato", "Endereço", "Acesso"] as const;

const STEP_FIELDS: Record<number, string[]> = {
  0: ["planoCodigo"],
  1: ["nomeFantasia", "nomeRepresentante", "cpfCnpj", "inscMunicipal", "urlLogo", "urlImagem"],
  2: ["contato.email", "contato.celular", "contato.telefone", "contato.whatsapp"],
  3: ["endereco.cep", "endereco.logradouro", "endereco.numero", "endereco.complemento", "endereco.bairro", "endereco.cidade", "endereco.uf"],
  4: ["senha", "confirmarSenha", "aceite"],
};

/* ------------------------------------------------------------------ */
/* Componente */
/* ------------------------------------------------------------------ */

const CadastroEmpresaPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [planosLoading, setPlanosLoading] = useState(true);
  const [verSenha, setVerSenha] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<CadastroFormInputs>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: { endereco: { uf: "" }, planoCodigo: searchParams.get("plano") ?? "", aceite: false },
  });

  const planoCodigo = watch("planoCodigo");
  const planoEscolhido = useMemo(() => planos.find((p) => p.codigo === planoCodigo) ?? null, [planos, planoCodigo]);

  /* ------------------------- Planos ------------------------- */

  useEffect(() => {
    let ativo = true;

    AssinaturaService.listarPlanos()
      .then((lista) => {
        if (!ativo) return;

        setPlanos(lista);

        // Plano que veio da URL só vale se existir de fato; caso contrário
        // deixamos em branco para o cliente escolher com o preço na tela.
        const daUrl = searchParams.get("plano");
        const valido = lista.some((p) => p.codigo === daUrl);

        if (daUrl && !valido) setValue("planoCodigo", "");
        if (valido) setStep((s) => (s === 0 ? 1 : s));
      })
      .catch(() => ativo && toast.warn("Não foi possível carregar os planos."))
      .finally(() => ativo && setPlanosLoading(false));

    return () => {
      ativo = false;
    };
    // Só na montagem: o plano da URL é lido uma vez.
  }, []);

  /* ------------------------- ViaCEP ------------------------- */

  const buscarCep = async () => {
    const cep = onlyDigits(getValues("endereco.cep") ?? "");
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast.warn("CEP não encontrado");
        return;
      }
      setValue("endereco.logradouro", data.logradouro ?? "", { shouldValidate: true });
      setValue("endereco.bairro", data.bairro ?? "", { shouldValidate: true });
      setValue("endereco.cidade", data.localidade ?? "", { shouldValidate: true });
      setValue("endereco.uf", data.uf ?? "", { shouldValidate: true });
    } catch {
      toast.warn("Não foi possível buscar o CEP");
    } finally {
      setCepLoading(false);
    }
  };

  /* ------------------------- Navegação ------------------------- */

  const nextStep = async () => {
    const valid = await trigger(STEP_FIELDS[step] as never[]);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  /* ------------------------- Submit ------------------------- */

  const onSubmit = async (data: CadastroFormInputs) => {
    if (isLoading) return;
    setIsLoading(true);
    const toastId = toast.loading("Cadastrando empresa...");

    const cpfCnpj = onlyDigits(data.cpfCnpj);

    const payload = {
      nomeRepresentante: data.nomeRepresentante,
      nomeFantasia: data.nomeFantasia,
      cpfCnpj,
      inscMunicipal: data.inscMunicipal ?? "",
      urlLogo: data.urlLogo ?? "",
      urlImagem: data.urlImagem ?? "",
      planoCodigo: data.planoCodigo,
      senha: data.senha,
      contato: {
        email: data.contato.email,
        celular: onlyDigits(data.contato.celular),
        telefone: onlyDigits(data.contato.telefone ?? ""),
        whatsapp: onlyDigits(data.contato.whatsapp ?? ""),
      },
      endereco: {
        cep: onlyDigits(data.endereco.cep),
        logradouro: data.endereco.logradouro,
        numero: data.endereco.numero,
        complemento: data.endereco.complemento ?? "",
        bairro: data.endereco.bairro,
        cidade: data.endereco.cidade,
        uf: data.endereco.uf,
      },
    };

    try {
      await AssinaturaService.cadastrar(payload);

      toast.update(toastId, { render: "Cadastro realizado! Entrando...", type: "success", isLoading: false, autoClose: 1500 });

      // Login automático com as credenciais que o cliente acabou de definir.
      // Sem isso ele cairia na tela de login logo depois de se cadastrar.
      const login = await AuthService.login({
        cpfCnpjEmpresa: cpfCnpj,
        email: data.contato.email,
        senha: data.senha,
      });

      const auth = login?.data?.data?.[0];

      if (!auth?.accessToken) throw new Error("login-falhou");

      // `setAuth` direto (e não `login` da store): a empresa ainda está
      // inativa, então buscar os dados dela agora não traz nada de útil.
      useAuth.getState().setAuth(auth.accessToken, auth.refreshToken);

      navigate("/checkout", { replace: true });

    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const mensagem = err?.response?.data?.message ?? err?.message ?? "erro desconhecido";

      // O cadastro pode ter dado certo e só o login ter falhado — nesse caso
      // mandar para o login é melhor do que sugerir cadastrar de novo.
      if (mensagem === "login-falhou") {
        toast.update(toastId, {
          render: "Cadastro criado! Faça login para continuar.",
          type: "info",
          isLoading: false,
          autoClose: 3000,
        });

        navigate("/login", { replace: true });
        return;
      }

      toast.update(toastId, {
        render: `Erro ao cadastrar empresa: ${mensagem}`,
        type: "error",
        isLoading: false,
        autoClose: 4000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------------- Estilos compactos ------------------------- */

  const fieldBox = "flex min-w-0 items-center gap-2 px-3 rounded-lg bg-fg/[0.035] border border-fg/[0.08] transition-all duration-200 hover:border-fg/[0.14] focus-within:border-accent focus-within:bg-fg/[0.05] focus-within:ring-2 focus-within:ring-accent/15";
  const labelCls = "block text-[10px] uppercase tracking-[0.7px] text-faint mb-1";
  const inputCls = "cf-input w-full flex-1 min-w-0 bg-transparent outline-none py-2.5 text-[13px] sm:text-sm text-ink placeholder:text-faint";
  const errCls = "mt-0.5 min-h-[13px] text-[10px] leading-[13px] text-danger";

  /* registros com máscara */
  const regCpfCnpj = register("cpfCnpj");
  const regCep = register("endereco.cep");
  const regTelefone = register("contato.telefone");
  const regCelular = register("contato.celular");
  const regWhatsapp = register("contato.whatsapp");
  const regPlano = register("planoCodigo");

  /** Resumo mostrado na última etapa, antes de enviar. */
  const resumo = () => {
    const v = getValues();
    return [
      { label: "Empresa", valor: v.nomeFantasia },
      { label: "Representante", valor: v.nomeRepresentante },
      { label: "CPF/CNPJ", valor: v.cpfCnpj },
      { label: "E-mail de acesso", valor: v.contato?.email },
      { label: "Celular", valor: v.contato?.celular },
      {
        label: "Endereço",
        valor: v.endereco?.logradouro ? `${v.endereco.logradouro}, ${v.endereco.numero} — ${v.endereco.cidade}/${v.endereco.uf}` : "",
      },
    ].filter((linha) => linha.valor);
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-x-hidden bg-canvas px-3 py-6 sm:px-4">
      <ToastContainer position="top-right" theme="dark" />

      <style>{`
 .cf-input:-webkit-autofill,
 .cf-input:-webkit-autofill:hover,
 .cf-input:-webkit-autofill:focus,
 .cf-input:-webkit-autofill:active {
 -webkit-text-fill-color: rgb(var(--ink));
 caret-color: rgb(var(--ink));
 border-radius: 8px;
 -webkit-box-shadow: 0 0 0 1000px rgb(var(--surface)) inset;
 box-shadow: 0 0 0 1000px rgb(var(--surface)) inset;
 transition: background-color 9999999s ease-in-out 0s;
 }

 @keyframes cf-rise {
 from { opacity: 0; transform: translateY(10px); }
 to { opacity: 1; transform: translateY(0); }
 }
 @keyframes cf-halo {
 0%, 100% { opacity: .5; transform: translate(-50%, -50%) scale(1); }
 50% { opacity: .75; transform: translate(-50%, -50%) scale(1.06); }
 }
 .cf-rise { animation: cf-rise .5s cubic-bezier(.22,.61,.36,1) both; }
 .cf-rise-2 { animation: cf-rise .5s cubic-bezier(.22,.61,.36,1) .08s both; }
 .cf-halo { animation: cf-halo 5.5s ease-in-out infinite; }

 @media (prefers-reduced-motion: reduce) {
 .cf-rise, .cf-rise-2, .cf-halo { animation: none; }
 }
 `}</style>

      {/* Glows de fundo — seguem o accent e somem no modo leve */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" style={{ opacity: "var(--fx-aurora, 1)" }}>
        <div className="absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full bg-accent opacity-[0.18] blur-[130px]" />
        <div className="absolute -bottom-24 -right-24 h-[420px] w-[420px] rounded-full opacity-[0.16] blur-[130px]" style={{ background: "rgb(var(--aurora-2))" }} />
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-soft opacity-[0.1] blur-[110px]" />
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col sm:max-w-xl">
        {/* Marca compacta e horizontal */}
        <div className="cf-rise mb-3 flex items-center justify-center gap-3 sm:mb-4">
          <button
            type="button"
            onClick={() => navigate(LANDING_ROUTE)}
            className="group relative inline-flex items-center justify-center rounded-xl transition-transform duration-300 hover:scale-[1.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            aria-label="Ir para a página inicial do CodeEx Flow"
          >
            <span className="cf-halo pointer-events-none absolute left-1/2 top-1/2 h-[80px] w-[80px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent opacity-50 blur-[36px]" />
            <img src="/logo.png" alt="CodeEx Flow" width={48} height={48} className="relative h-10 w-10 rounded-xl shadow-[0_10px_30px_-8px_rgba(108,92,231,0.6)] sm:h-12 sm:w-12" />
          </button>

          <div className="flex flex-col leading-tight">
            <span className="text-base tracking-tight text-ink sm:text-lg">CodeEx Flow</span>
            <span className="text-[10px] uppercase tracking-[2px] text-faint">Cadastro de empresa</span>
          </div>
        </div>

        {/* Card */}
        <div className="cf-rise-2 relative rounded-2xl border border-fg/[0.07] bg-fg/[0.03] p-4 shadow-[0_25px_70px_-25px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-6">
          <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-accent-soft to-transparent opacity-70" />

          <div className="mb-0.5 flex items-baseline justify-between">
            <h1 className="text-base text-ink sm:text-lg">Cadastre sua empresa</h1>
            <span className="text-[11px] text-mist">
              {step + 1}/{STEPS.length}
            </span>
          </div>

          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[11px] text-mist">{STEPS[step]}</p>

            {/* O plano escolhido acompanha o cliente em todas as etapas */}
            {planoEscolhido && step > 0 && (
              <button
                type="button"
                onClick={() => setStep(0)}
                className="flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/[0.1] px-2.5 py-1 text-[10px] text-accent-soft transition hover:bg-accent/[0.18]"
              >
                <Sparkles size={11} />
                {planoEscolhido.nome} · {formatCurrencyFromCents(planoEscolhido.precoCentavos)}
                {CICLO_LABEL[planoEscolhido.ciclo]}
              </button>
            )}
          </div>

          {/* Indicador de etapas */}
          <div className="mb-3 flex gap-1.5 sm:mb-4">
            {STEPS.map((label, i) => (
              <div key={label} className="flex-1">
                <div className={`h-[3px] rounded-full transition-all duration-300 ${i <= step ? "bg-gradient-to-r from-accent-soft to-accent-strong" : "bg-fg/[0.08]"}`} />
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-1.5 sm:gap-2">
            {/* ---------------- Etapa 1: Plano ---------------- */}
            {step === 0 && (
              <>
                {planosLoading && (
                  <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-mist">
                    <Loader2 size={15} className="animate-spin text-accent" />
                    Carregando planos...
                  </div>
                )}

                {!planosLoading && planos.length === 0 && (
                  <p className="py-8 text-center text-[13px] text-faint">
                    Nenhum plano disponível agora. Fale com o suporte para liberar seu cadastro.
                  </p>
                )}

                <div className="flex flex-col gap-2">
                  {planos.map((plano) => {
                    const marcado = planoCodigo === plano.codigo;

                    return (
                      <label
                        key={plano.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-all duration-200 ${
                          marcado ? "border-accent bg-accent/[0.1] ring-2 ring-accent/15" : "border-fg/[0.08] bg-fg/[0.03] hover:border-fg/[0.16]"
                        }`}
                      >
                        <input type="radio" value={plano.codigo} {...regPlano} className="sr-only" />

                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${marcado ? "border-accent bg-accent text-white" : "border-fg/[0.2]"}`}>
                          {marcado && <Check size={12} />}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm text-ink">{plano.nome}</span>
                            {plano.destaque && <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.5px] text-accent-soft">Popular</span>}
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-mist">{plano.descricao}</span>
                        </span>

                        <span className="shrink-0 text-right">
                          <span className="block text-sm text-ink">{formatCurrencyFromCents(plano.precoCentavos)}</span>
                          <span className="block text-[10px] text-faint">{CICLO_LABEL[plano.ciclo]}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>

                <p className={errCls}>{errors.planoCodigo?.message}</p>

                <button type="button" onClick={() => navigate("/planos")} className="self-start text-[11px] text-accent transition-colors hover:text-accent-soft">
                  Comparar planos em detalhe
                </button>
              </>
            )}

            {/* ---------------- Etapa 2: Empresa ---------------- */}
            {step === 1 && (
              <>
                <div>
                  <label className={labelCls}>Nome fantasia</label>
                  <div className={fieldBox}>
                    <Building2 size={14} className="shrink-0 text-muted" />
                    <input {...register("nomeFantasia")} placeholder="Nome da sua empresa" className={inputCls} />
                  </div>
                  <p className={errCls}>{errors.nomeFantasia?.message}</p>
                </div>

                <div>
                  <label className={labelCls}>Representante</label>
                  <div className={fieldBox}>
                    <User size={14} className="shrink-0 text-muted" />
                    <input {...register("nomeRepresentante")} placeholder="Nome completo do responsável" className={inputCls} />
                  </div>
                  <p className={errCls}>{errors.nomeRepresentante?.message}</p>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <div>
                    <label className={labelCls}>CPF ou CNPJ</label>
                    <div className={fieldBox}>
                      <FileText size={14} className="shrink-0 text-muted" />
                      <input
                        {...regCpfCnpj}
                        onChange={(e) => {
                          e.target.value = maskCpfCnpj(e.target.value);
                          regCpfCnpj.onChange(e);
                        }}
                        inputMode="numeric"
                        placeholder="000.000.000-00"
                        className={inputCls}
                      />
                    </div>
                    <p className={errCls}>{errors.cpfCnpj?.message}</p>
                  </div>

                  <div>
                    <label className={labelCls}>Insc. municipal</label>
                    <div className={fieldBox}>
                      <Hash size={14} className="shrink-0 text-muted" />
                      <input {...register("inscMunicipal")} placeholder="Opcional" className={inputCls} />
                    </div>
                    <p className={errCls}>{errors.inscMunicipal?.message}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <div>
                    <label className={labelCls}>URL do logo</label>
                    <div className={fieldBox}>
                      <ImageIcon size={14} className="shrink-0 text-muted" />
                      <input {...register("urlLogo")} placeholder="Opcional" className={inputCls} />
                    </div>
                    <p className={errCls}>{errors.urlLogo?.message}</p>
                  </div>

                  <div>
                    <label className={labelCls}>URL da imagem</label>
                    <div className={fieldBox}>
                      <ImageIcon size={14} className="shrink-0 text-muted" />
                      <input {...register("urlImagem")} placeholder="Opcional" className={inputCls} />
                    </div>
                    <p className={errCls}>{errors.urlImagem?.message}</p>
                  </div>
                </div>
              </>
            )}

            {/* ---------------- Etapa 3: Contato ---------------- */}
            {step === 2 && (
              <>
                <div>
                  <label className={labelCls}>Email</label>
                  <div className={fieldBox}>
                    <Mail size={14} className="shrink-0 text-muted" />
                    <input {...register("contato.email")} type="email" placeholder="empresa@email.com" autoComplete="email" className={inputCls} />
                  </div>
                  {errors.contato?.email ? (
                    <p className={errCls}>{errors.contato.email.message}</p>
                  ) : (
                    <p className="mt-0.5 min-h-[13px] text-[10px] leading-[13px] text-faint">Este e-mail será seu login no sistema.</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <div>
                    <label className={labelCls}>Celular</label>
                    <div className={fieldBox}>
                      <Smartphone size={14} className="shrink-0 text-muted" />
                      <input
                        {...regCelular}
                        onChange={(e) => {
                          e.target.value = maskPhone(e.target.value);
                          regCelular.onChange(e);
                        }}
                        inputMode="numeric"
                        placeholder="(00) 00000-0000"
                        className={inputCls}
                      />
                    </div>
                    <p className={errCls}>{errors.contato?.celular?.message}</p>
                  </div>

                  <div>
                    <label className={labelCls}>Telefone</label>
                    <div className={fieldBox}>
                      <Phone size={14} className="shrink-0 text-muted" />
                      <input
                        {...regTelefone}
                        onChange={(e) => {
                          e.target.value = maskPhone(e.target.value);
                          regTelefone.onChange(e);
                        }}
                        inputMode="numeric"
                        placeholder="Opcional"
                        className={inputCls}
                      />
                    </div>
                    <p className={errCls}>{errors.contato?.telefone?.message}</p>
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className={`${labelCls} mb-0`}>WhatsApp</label>
                    <button
                      type="button"
                      onClick={() =>
                        setValue("contato.whatsapp", getValues("contato.celular") ?? "", {
                          shouldValidate: true,
                        })
                      }
                      className="text-[10px] text-accent transition-colors hover:text-accent-soft"
                    >
                      Usar mesmo do celular
                    </button>
                  </div>
                  <div className={fieldBox}>
                    <MessageCircle size={14} className="shrink-0 text-muted" />
                    <input
                      {...regWhatsapp}
                      onChange={(e) => {
                        e.target.value = maskPhone(e.target.value);
                        regWhatsapp.onChange(e);
                      }}
                      inputMode="numeric"
                      placeholder="(00) 00000-0000 (opcional)"
                      className={inputCls}
                    />
                  </div>
                  <p className={errCls}>{errors.contato?.whatsapp?.message}</p>
                </div>
              </>
            )}

            {/* ---------------- Etapa 4: Endereço ---------------- */}
            {step === 3 && (
              <>
                <div className="grid grid-cols-[1fr_90px] gap-x-3 gap-y-1.5">
                  <div>
                    <label className={labelCls}>CEP</label>
                    <div className={fieldBox}>
                      <MapPin size={14} className="shrink-0 text-muted" />
                      <input
                        {...regCep}
                        onChange={(e) => {
                          e.target.value = maskCep(e.target.value);
                          regCep.onChange(e);
                        }}
                        onBlur={(e) => {
                          regCep.onBlur(e);
                          buscarCep();
                        }}
                        inputMode="numeric"
                        placeholder="00000-000"
                        className={inputCls}
                      />
                      {cepLoading && <Loader2 size={14} className="shrink-0 animate-spin text-accent" />}
                    </div>
                    <p className={errCls}>{errors.endereco?.cep?.message}</p>
                  </div>

                  <div>
                    <label className={labelCls}>Número</label>
                    <div className={fieldBox}>
                      <Hash size={14} className="shrink-0 text-muted" />
                      <input {...register("endereco.numero")} placeholder="123" className={inputCls} />
                    </div>
                    <p className={errCls}>{errors.endereco?.numero?.message}</p>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Logradouro</label>
                  <div className={fieldBox}>
                    <MapPin size={14} className="shrink-0 text-muted" />
                    <input {...register("endereco.logradouro")} placeholder="Rua, avenida..." className={inputCls} />
                  </div>
                  <p className={errCls}>{errors.endereco?.logradouro?.message}</p>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <div>
                    <label className={labelCls}>Complemento</label>
                    <div className={fieldBox}>
                      <Hash size={14} className="shrink-0 text-muted" />
                      <input {...register("endereco.complemento")} placeholder="Opcional" className={inputCls} />
                    </div>
                    <p className={errCls}>{errors.endereco?.complemento?.message}</p>
                  </div>

                  <div>
                    <label className={labelCls}>Bairro</label>
                    <div className={fieldBox}>
                      <MapPin size={14} className="shrink-0 text-muted" />
                      <input {...register("endereco.bairro")} placeholder="Seu bairro" className={inputCls} />
                    </div>
                    <p className={errCls}>{errors.endereco?.bairro?.message}</p>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_90px] gap-x-3 gap-y-1.5">
                  <div>
                    <label className={labelCls}>Cidade</label>
                    <div className={fieldBox}>
                      <Building2 size={14} className="shrink-0 text-muted" />
                      <input {...register("endereco.cidade")} placeholder="Sua cidade" className={inputCls} />
                    </div>
                    <p className={errCls}>{errors.endereco?.cidade?.message}</p>
                  </div>

                  <div>
                    <label className={labelCls}>UF</label>
                    <div className={fieldBox}>
                      <select {...register("endereco.uf")} className={`${inputCls} cursor-pointer appearance-none [&>option]:bg-surface-raised`}>
                        <option value="">UF</option>
                        {UFS.map((uf) => (
                          <option key={uf} value={uf}>
                            {uf}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className={errCls}>{errors.endereco?.uf?.message}</p>
                  </div>
                </div>
              </>
            )}

            {/* ---------------- Etapa 5: Acesso e revisão ---------------- */}
            {step === 4 && (
              <>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <div>
                    <label className={labelCls}>Senha</label>
                    <div className={fieldBox}>
                      <Lock size={14} className="shrink-0 text-muted" />
                      <input {...register("senha")} type={verSenha ? "text" : "password"} placeholder="Mínimo 6 caracteres" autoComplete="new-password" className={inputCls} />
                      <button type="button" onClick={() => setVerSenha((v) => !v)} className="shrink-0 text-muted transition hover:text-ink" aria-label={verSenha ? "Ocultar senha" : "Mostrar senha"}>
                        {verSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <p className={errCls}>{errors.senha?.message}</p>
                  </div>

                  <div>
                    <label className={labelCls}>Confirmar senha</label>
                    <div className={fieldBox}>
                      <Lock size={14} className="shrink-0 text-muted" />
                      <input {...register("confirmarSenha")} type={verSenha ? "text" : "password"} placeholder="Repita a senha" autoComplete="new-password" className={inputCls} />
                    </div>
                    <p className={errCls}>{errors.confirmarSenha?.message}</p>
                  </div>
                </div>

                {/* Revisão — o cliente confere antes de enviar */}
                <div className="mt-1 rounded-xl border border-fg/[0.08] bg-fg/[0.02] p-3.5">
                  <p className={labelCls}>Confira seus dados</p>

                  <div className="flex flex-col divide-y divide-fg/[0.05]">
                    {planoEscolhido && (
                      <div className="flex items-center justify-between gap-3 py-1.5">
                        <span className="text-[12px] text-mist">Plano</span>
                        <span className="truncate text-[12px] text-ink">
                          {planoEscolhido.nome} — {formatCurrencyFromCents(planoEscolhido.precoCentavos)}
                          {CICLO_LABEL[planoEscolhido.ciclo]}
                        </span>
                      </div>
                    )}

                    {resumo().map((linha) => (
                      <div key={linha.label} className="flex items-center justify-between gap-3 py-1.5">
                        <span className="shrink-0 text-[12px] text-mist">{linha.label}</span>
                        <span className="min-w-0 truncate text-right text-[12px] text-ink">{linha.valor}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <label className="mt-1 flex cursor-pointer items-start gap-2 text-[11px] leading-relaxed text-mist">
                  <input type="checkbox" {...register("aceite")} className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[rgb(var(--accent))]" />
                  <span>
                    Concordo em pagar a assinatura via Pix e entendo que o acesso é liberado após a confirmação do
                    primeiro pagamento.
                  </span>
                </label>
                <p className={errCls}>{errors.aceite?.message}</p>
              </>
            )}

            {/* ---------------- Navegação entre etapas ---------------- */}
            <div className="mt-1 flex gap-2">
              {step > 0 && (
                <button type="button" onClick={prevStep} className="flex items-center justify-center gap-1.5 rounded-lg border border-fg/[0.08] bg-fg/[0.04] px-4 py-2.5 text-xs text-mist transition hover:border-fg/[0.14] hover:bg-fg/[0.07] sm:text-sm">
                  <ArrowLeft size={13} />
                  Voltar
                </button>
              )}

              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="group relative flex flex-1 items-center justify-center gap-1.5 overflow-hidden rounded-lg bg-gradient-to-r from-accent-soft via-accent to-accent-strong py-2.5 text-xs text-white shadow-[0_10px_25px_-8px_rgba(108,92,231,0.7)] transition-all duration-200 hover:brightness-110 hover:shadow-[0_14px_35px_-8px_rgba(59,110,245,0.65)] active:scale-[0.99] sm:text-sm"
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-fg/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative flex items-center gap-1.5">
                    Continuar
                    <ArrowRight size={13} />
                  </span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative flex-1 overflow-hidden rounded-lg bg-gradient-to-r from-accent-soft via-accent to-accent-strong py-2.5 text-xs text-white shadow-[0_10px_25px_-8px_rgba(108,92,231,0.7)] transition-all duration-200 hover:brightness-110 hover:shadow-[0_14px_35px_-8px_rgba(59,110,245,0.65)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 sm:text-sm"
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-fg/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative">{isLoading ? "Cadastrando..." : "Criar conta e ir para o pagamento"}</span>
                </button>
              )}
            </div>
          </form>

          <p className="mt-3 text-center text-[11px] text-faint">
            Já tem conta?{" "}
            <button type="button" onClick={() => navigate("/login")} className="text-accent transition-colors hover:text-accent-soft">
              Entrar
            </button>
          </p>
        </div>

        <p className="mt-2 text-center text-[10px] text-muted sm:mt-3">
          © {new Date().getFullYear()} CodeEx Flow ·{" "}
          <button type="button" onClick={() => navigate(LANDING_ROUTE)} className="text-accent transition-colors hover:text-accent-soft">
            Conheça o CodeEx Flow
          </button>
        </p>
      </div>
    </div>
  );
};

export default CadastroEmpresaPage;
