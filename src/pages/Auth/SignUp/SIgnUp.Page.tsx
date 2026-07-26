import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, User, Mail, Phone, Smartphone, MessageCircle, MapPin, Hash, FileText, Image as ImageIcon, ArrowLeft, ArrowRight, Loader2, Copy, Check, QrCode } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ⚠️ Ajuste o path para onde você mantém o onlyDigits
import { onlyDigits } from "../../../utils/format";
import sysgrafix from "../../../services/sysgrafix.service";

const LANDING_ROUTE = "/";

export type enderecoEmpresaDto = {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
};

export type contatoEmpresaDto = {
  telefone: string;
  celular: string;
  whatsapp: string;
  email: string;
};

export type cadastroEmpresaDto = {
  nomeRepresentante: string;
  nomeFantasia: string;
  cpfCnpj: string;
  endereco: enderecoEmpresaDto;
  contato: contatoEmpresaDto;
  urlLogo: string;
  urlImagem: string;
  inscMunicipal: string;
};

type PixInfo = {
  valor: number;
  copiaECola: string;
  /** QR Code em base64 (sem o prefixo data:image) retornado pelo backend */
  qrCodeBase64: string;
};

type CadastroResponse = {
  primeiroAcesso: boolean;
  pix?: PixInfo;
};

/* ------------------------------------------------------------------ */
/* Máscaras                                                            */
/* ------------------------------------------------------------------ */

const maskCpfCnpj = (v: string) => {
  const d = onlyDigits(v).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

const maskCep = (v: string) =>
  onlyDigits(v)
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, "$1-$2");

const maskPhone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
};

/* ------------------------------------------------------------------ */
/* Validação CPF/CNPJ                                                  */
/* ------------------------------------------------------------------ */

const isValidCpf = (cpf: string) => {
  const d = onlyDigits(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  for (const len of [9, 10]) {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const check = ((sum * 10) % 11) % 10;
    if (check !== Number(d[len])) return false;
  }
  return true;
};

const isValidCnpj = (cnpj: string) => {
  const d = onlyDigits(cnpj);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + w * Number(d[i]), 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
};

const isValidCpfCnpj = (v?: string) => {
  const d = onlyDigits(v ?? "");
  if (d.length === 11) return isValidCpf(d);
  if (d.length === 14) return isValidCnpj(d);
  return false;
};

const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

/* ------------------------------------------------------------------ */
/* Schema Zod                                                          */
/* ------------------------------------------------------------------ */

const optionalUrl = z.string().url("URL inválida").or(z.literal("")).optional();

const cadastroSchema = z.object({
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
});

type CadastroFormInputs = z.infer<typeof cadastroSchema>;

const cadastrarEmpresa = async (payload: cadastroEmpresaDto): Promise<CadastroResponse> => {
  console.log(payload)
  const res = await sysgrafix.post("/empresas/cadastrar", payload);

  if (!res.status === 201) {
    throw new Error(`Erro ${res.status} ao cadastrar empresa`);
  }

  const data = res.data;
  return data as CadastroResponse;
};

/* ------------------------------------------------------------------ */
/* Etapas                                                              */
/* ------------------------------------------------------------------ */

const STEPS = ["Empresa", "Contato", "Endereço"] as const;

const STEP_FIELDS: Record<number, (keyof CadastroFormInputs | string)[]> = {
  0: ["nomeFantasia", "nomeRepresentante", "cpfCnpj", "inscMunicipal", "urlLogo", "urlImagem"],
  1: ["contato.email", "contato.celular", "contato.telefone", "contato.whatsapp"],
  2: ["endereco.cep", "endereco.logradouro", "endereco.numero", "endereco.complemento", "endereco.bairro", "endereco.cidade", "endereco.uf"],
};

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

const CadastroEmpresaPage = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [pixInfo, setPixInfo] = useState<PixInfo | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CadastroFormInputs>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: { endereco: { uf: "" } },
  });

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

    const payload: cadastroEmpresaDto = {
      nomeRepresentante: data.nomeRepresentante,
      nomeFantasia: data.nomeFantasia,
      cpfCnpj: onlyDigits(data.cpfCnpj),
      inscMunicipal: data.inscMunicipal ?? "",
      urlLogo: data.urlLogo ?? "",
      urlImagem: data.urlImagem ?? "",
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
      const response = await cadastrarEmpresa(payload);
      toast.update(toastId, {
        render: "Cadastro realizado!",
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });

      if (response.primeiroAcesso && response.pix) {
        setPixInfo(response.pix);
      } else {
        navigate("/");
      }
    } catch(error:any) {
      toast.update(toastId, {
        render: "Erro ao cadastrar empresa"+error.message,
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /* ------------------------- Pix ------------------------- */

  const copiarPix = async () => {
    if (!pixInfo) return;
    try {
      await navigator.clipboard.writeText(pixInfo.copiaECola);
      setCopied(true);
      toast.success("Código Pix copiado!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.warn("Não foi possível copiar. Copie manualmente.");
    }
  };

  /* ------------------------- Estilos compactos ------------------------- */

  const fieldBox = "flex min-w-0 items-center gap-2 px-3 rounded-lg bg-white/[0.035] border border-white/[0.08] transition-all duration-200 " + "hover:border-white/[0.14] focus-within:border-[#7c6ef5] focus-within:bg-white/[0.05] focus-within:ring-2 focus-within:ring-[#7c6ef5]/15";
  const labelCls = "block text-[10px] uppercase tracking-[0.7px] text-[#6b6790] mb-1";
  const inputCls = "cf-input w-full flex-1 min-w-0 bg-transparent outline-none py-2.5 text-[13px] sm:text-sm text-[#e8e4ff] placeholder:text-[#6f6a93]";
  const errCls = "mt-0.5 min-h-[13px] text-[10px] leading-[13px] text-[#f09595]";

  /* registros com máscara */
  const regCpfCnpj = register("cpfCnpj");
  const regCep = register("endereco.cep");
  const regTelefone = register("contato.telefone");
  const regCelular = register("contato.celular");
  const regWhatsapp = register("contato.whatsapp");

  return (
    <div className="cf-page relative h-[100dvh] w-full flex items-center justify-center px-3 py-3 sm:px-4 sm:py-5 bg-[#0b0913] overflow-hidden">
      <ToastContainer position="top-right" theme="dark" />

      <style>{`
        .cf-input:-webkit-autofill,
        .cf-input:-webkit-autofill:hover,
        .cf-input:-webkit-autofill:focus,
        .cf-input:-webkit-autofill:active {
          -webkit-text-fill-color: #e8e4ff;
          caret-color: #e8e4ff;
          border-radius: 8px;
          -webkit-box-shadow: 0 0 0 1000px #16131f inset;
          box-shadow: 0 0 0 1000px #16131f inset;
          transition: background-color 9999999s ease-in-out 0s;
        }

        @keyframes cf-rise {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cf-halo {
          0%, 100% { opacity: .5; transform: translate(-50%, -50%) scale(1); }
          50%      { opacity: .75; transform: translate(-50%, -50%) scale(1.06); }
        }
        .cf-rise   { animation: cf-rise .5s cubic-bezier(.22,.61,.36,1) both; }
        .cf-rise-2 { animation: cf-rise .5s cubic-bezier(.22,.61,.36,1) .08s both; }
        .cf-halo   { animation: cf-halo 5.5s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .cf-rise, .cf-rise-2, .cf-halo { animation: none; }
        }
      `}</style>

      {/* Glows de fundo */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full bg-[#8b5cf6] opacity-[0.15] blur-[130px]" />
        <div className="absolute -bottom-24 -right-24 w-[420px] h-[420px] rounded-full bg-[#3b6ef5] opacity-[0.15] blur-[130px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-[#6c5ce7] opacity-[0.09] blur-[110px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm sm:max-w-lg flex flex-col max-h-full">
        {/* Marca compacta e horizontal */}
        <div className="cf-rise flex items-center justify-center gap-3 mb-3 sm:mb-4">
          <button
            type="button"
            onClick={() => navigate(LANDING_ROUTE)}
            className="group relative inline-flex items-center justify-center transition-transform duration-300 hover:scale-[1.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7c6ef5]/60 rounded-xl"
            aria-label="Ir para a página inicial do Codex Flow"
          >
            <span className="cf-halo pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80px] h-[80px] rounded-full bg-[#7c5cff] opacity-50 blur-[36px]" />
            <img src="/logo.png" alt="Codex Flow" width={48} height={48} className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl shadow-[0_10px_30px_-8px_rgba(108,92,231,0.6)]" />
          </button>

          <div className="flex flex-col leading-tight">
            <span className="text-base sm:text-lg font-medium tracking-tight text-[#f0effe]">Codex Flow</span>
            <span className="text-[10px] uppercase tracking-[2px] text-[#6b6790]">Cadastro de empresa</span>
          </div>
        </div>

        {/* Card */}
        <div className="cf-rise-2 relative rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 sm:p-6 backdrop-blur-xl shadow-[0_25px_70px_-25px_rgba(0,0,0,0.8)]">
          <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#9b6bff] to-transparent opacity-70" />

          <div className="flex items-baseline justify-between mb-0.5">
            <h1 className="text-base sm:text-lg font-medium text-[#f0effe]">Cadastre sua empresa</h1>
            <span className="text-[11px] text-[#7a769e]">
              {step + 1}/{STEPS.length}
            </span>
          </div>
          <p className="text-[11px] text-[#7a769e] mb-3">{STEPS[step]}</p>

          {/* Indicador de etapas */}
          <div className="flex gap-1.5 mb-3 sm:mb-4">
            {STEPS.map((label, i) => (
              <div key={label} className="flex-1">
                <div className={`h-[3px] rounded-full transition-all duration-300 ${i <= step ? "bg-gradient-to-r from-[#7c5cff] to-[#3b6ef5]" : "bg-white/[0.08]"}`} />
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-1.5 sm:gap-2">
            {/* ---------------- Etapa 1: Empresa ---------------- */}
            {step === 0 && (
              <>
                <div>
                  <label className={labelCls}>Nome fantasia</label>
                  <div className={fieldBox}>
                    <Building2 size={14} className="shrink-0 text-[#5e5a82]" />
                    <input {...register("nomeFantasia")} placeholder="Nome da sua empresa" className={inputCls} />
                  </div>
                  <p className={errCls}>{errors.nomeFantasia?.message}</p>
                </div>

                <div>
                  <label className={labelCls}>Representante</label>
                  <div className={fieldBox}>
                    <User size={14} className="shrink-0 text-[#5e5a82]" />
                    <input {...register("nomeRepresentante")} placeholder="Nome completo do responsável" className={inputCls} />
                  </div>
                  <p className={errCls}>{errors.nomeRepresentante?.message}</p>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <div>
                    <label className={labelCls}>CPF ou CNPJ</label>
                    <div className={fieldBox}>
                      <FileText size={14} className="shrink-0 text-[#5e5a82]" />
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
                      <Hash size={14} className="shrink-0 text-[#5e5a82]" />
                      <input {...register("inscMunicipal")} placeholder="Opcional" className={inputCls} />
                    </div>
                    <p className={errCls}>{errors.inscMunicipal?.message}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <div>
                    <label className={labelCls}>URL do logo</label>
                    <div className={fieldBox}>
                      <ImageIcon size={14} className="shrink-0 text-[#5e5a82]" />
                      <input {...register("urlLogo")} placeholder="Opcional" className={inputCls} />
                    </div>
                    <p className={errCls}>{errors.urlLogo?.message}</p>
                  </div>

                  <div>
                    <label className={labelCls}>URL da imagem</label>
                    <div className={fieldBox}>
                      <ImageIcon size={14} className="shrink-0 text-[#5e5a82]" />
                      <input {...register("urlImagem")} placeholder="Opcional" className={inputCls} />
                    </div>
                    <p className={errCls}>{errors.urlImagem?.message}</p>
                  </div>
                </div>
              </>
            )}

            {/* ---------------- Etapa 2: Contato ---------------- */}
            {step === 1 && (
              <>
                <div>
                  <label className={labelCls}>Email</label>
                  <div className={fieldBox}>
                    <Mail size={14} className="shrink-0 text-[#5e5a82]" />
                    <input {...register("contato.email")} type="email" placeholder="empresa@email.com" autoComplete="email" className={inputCls} />
                  </div>
                  <p className={errCls}>{errors.contato?.email?.message}</p>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <div>
                    <label className={labelCls}>Celular</label>
                    <div className={fieldBox}>
                      <Smartphone size={14} className="shrink-0 text-[#5e5a82]" />
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
                      <Phone size={14} className="shrink-0 text-[#5e5a82]" />
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
                  <div className="flex items-center justify-between mb-1">
                    <label className={`${labelCls} mb-0`}>WhatsApp</label>
                    <button
                      type="button"
                      onClick={() =>
                        setValue("contato.whatsapp", getValues("contato.celular") ?? "", {
                          shouldValidate: true,
                        })
                      }
                      className="text-[10px] text-[#8b7bf0] transition-colors hover:text-[#a99ff0]"
                    >
                      Usar mesmo do celular
                    </button>
                  </div>
                  <div className={fieldBox}>
                    <MessageCircle size={14} className="shrink-0 text-[#5e5a82]" />
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

            {/* ---------------- Etapa 3: Endereço ---------------- */}
            {step === 2 && (
              <>
                <div className="grid grid-cols-[1fr_90px] gap-x-3 gap-y-1.5">
                  <div>
                    <label className={labelCls}>CEP</label>
                    <div className={fieldBox}>
                      <MapPin size={14} className="shrink-0 text-[#5e5a82]" />
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
                      {cepLoading && <Loader2 size={14} className="shrink-0 animate-spin text-[#8b7bf0]" />}
                    </div>
                    <p className={errCls}>{errors.endereco?.cep?.message}</p>
                  </div>

                  <div>
                    <label className={labelCls}>Número</label>
                    <div className={fieldBox}>
                      <Hash size={14} className="shrink-0 text-[#5e5a82]" />
                      <input {...register("endereco.numero")} placeholder="123" className={inputCls} />
                    </div>
                    <p className={errCls}>{errors.endereco?.numero?.message}</p>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Logradouro</label>
                  <div className={fieldBox}>
                    <MapPin size={14} className="shrink-0 text-[#5e5a82]" />
                    <input {...register("endereco.logradouro")} placeholder="Rua, avenida..." className={inputCls} />
                  </div>
                  <p className={errCls}>{errors.endereco?.logradouro?.message}</p>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  <div>
                    <label className={labelCls}>Complemento</label>
                    <div className={fieldBox}>
                      <Hash size={14} className="shrink-0 text-[#5e5a82]" />
                      <input {...register("endereco.complemento")} placeholder="Opcional" className={inputCls} />
                    </div>
                    <p className={errCls}>{errors.endereco?.complemento?.message}</p>
                  </div>

                  <div>
                    <label className={labelCls}>Bairro</label>
                    <div className={fieldBox}>
                      <MapPin size={14} className="shrink-0 text-[#5e5a82]" />
                      <input {...register("endereco.bairro")} placeholder="Seu bairro" className={inputCls} />
                    </div>
                    <p className={errCls}>{errors.endereco?.bairro?.message}</p>
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_90px] gap-x-3 gap-y-1.5">
                  <div>
                    <label className={labelCls}>Cidade</label>
                    <div className={fieldBox}>
                      <Building2 size={14} className="shrink-0 text-[#5e5a82]" />
                      <input {...register("endereco.cidade")} placeholder="Sua cidade" className={inputCls} />
                    </div>
                    <p className={errCls}>{errors.endereco?.cidade?.message}</p>
                  </div>

                  <div>
                    <label className={labelCls}>UF</label>
                    <div className={fieldBox}>
                      <select {...register("endereco.uf")} className={`${inputCls} appearance-none cursor-pointer [&>option]:bg-[#1a1828]`}>
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

            {/* ---------------- Navegação entre etapas ---------------- */}
            <div className="mt-1 flex gap-2">
              {step > 0 && (
                <button type="button" onClick={prevStep} className="flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs sm:text-sm text-[#a8a3cf] transition hover:bg-white/[0.07] hover:border-white/[0.14]">
                  <ArrowLeft size={13} />
                  Voltar
                </button>
              )}

              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="group relative flex flex-1 items-center justify-center gap-1.5 overflow-hidden rounded-lg bg-gradient-to-r from-[#7c5cff] via-[#6c5ce7] to-[#3b6ef5] py-2.5 text-xs sm:text-sm font-medium text-white shadow-[0_10px_25px_-8px_rgba(108,92,231,0.7)] transition-all duration-200 hover:shadow-[0_14px_35px_-8px_rgba(59,110,245,0.65)] hover:brightness-110 active:scale-[0.99]"
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative flex items-center gap-1.5">
                    Continuar
                    <ArrowRight size={13} />
                  </span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative flex-1 overflow-hidden rounded-lg bg-gradient-to-r from-[#7c5cff] via-[#6c5ce7] to-[#3b6ef5] py-2.5 text-xs sm:text-sm font-medium text-white shadow-[0_10px_25px_-8px_rgba(108,92,231,0.7)] transition-all duration-200 hover:shadow-[0_14px_35px_-8px_rgba(59,110,245,0.65)] hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative">{isLoading ? "Cadastrando..." : "Cadastrar empresa"}</span>
                </button>
              )}
            </div>
          </form>

          <p className="mt-3 text-center text-[11px] text-[#6b6790]">
            Já tem conta?{" "}
            <button type="button" onClick={() => navigate("/login")} className="text-[#8b7bf0] transition-colors hover:text-[#a99ff0]">
              Entrar
            </button>
          </p>
        </div>

        <p className="mt-2 sm:mt-3 text-center text-[10px] text-[#5e5a82]">
          © {new Date().getFullYear()} Codex Flow ·{" "}
          <button type="button" onClick={() => navigate(LANDING_ROUTE)} className="text-[#8b7bf0] transition-colors hover:text-[#a99ff0]">
            Conheça o Codex Flow
          </button>
        </p>
      </div>

      {/* ---------------- Modal do Pix (primeiro acesso) - Compacto ---------------- */}
      {pixInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm overflow-hidden">
          <div className="cf-rise relative w-full max-w-xs sm:max-w-sm overflow-hidden rounded-2xl border border-white/[0.07] bg-[#16141f] p-5 sm:p-6 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)]">
            <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#9b6bff] to-transparent opacity-70" />

            <div className="mb-3 flex flex-col items-center gap-1.5 text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#32BCAD]/15">
                <QrCode size={16} className="text-[#32BCAD]" />
              </div>
              <h2 className="text-base text-[#f0effe]">Pagamento via Pix</h2>
              <p className="text-[11px] leading-[1.4] text-[#7a769e]">Primeiro acesso: finalize o pagamento para ativar sua conta.</p>
            </div>

            <div className="mb-3 text-center">
              <span className="text-[10px] uppercase tracking-[0.6px] text-[#5e5a82]">Valor</span>
              <p className="text-xl text-[#f0effe]">
                {pixInfo.valor.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </p>
            </div>

            <div className="mx-auto mb-3 flex h-36 w-36 sm:h-40 sm:w-40 items-center justify-center rounded-lg bg-white p-2">
              {pixInfo.qrCodeBase64 ? <img src={`data:image/png;base64,${pixInfo.qrCodeBase64}`} alt="QR Code Pix" className="h-full w-full" /> : <QrCode size={100} className="text-[#0f0e18]" />}
            </div>

            <div className="mb-3">
              <span className={labelCls}>Pix copia e cola</span>
              <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2">
                <p className="min-w-0 flex-1 truncate text-[11px] text-[#a8a3cf]">{pixInfo.copiaECola}</p>
                <button type="button" onClick={copiarPix} className="flex shrink-0 items-center gap-1 rounded bg-[#6c5ce7]/15 px-2 py-1 text-[11px] text-[#9b8ff5] transition hover:bg-[#6c5ce7]/25">
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? "OK" : "Copiar"}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setPixInfo(null);
                navigate("/");
              }}
              className="group relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-[#7c5cff] via-[#6c5ce7] to-[#3b6ef5] py-2.5 text-sm font-medium text-white shadow-[0_10px_25px_-8px_rgba(108,92,231,0.7)] transition-all duration-200 hover:shadow-[0_14px_35px_-8px_rgba(59,110,245,0.65)] hover:brightness-110 active:scale-[0.99]"
            >
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
              <span className="relative">Já realizei o pagamento</span>
            </button>
            <button type="button" onClick={() => setPixInfo(null)} className="mt-2 w-full text-center text-[11px] text-[#5e5a82] transition-colors hover:text-[#8b7bf0]">
              Pagar depois
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CadastroEmpresaPage;
