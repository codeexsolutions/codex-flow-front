import { forwardRef, useId } from "react";
import { X, Users, Loader2, Phone, Smartphone, MessageCircle, Mail, Info, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

import { eStatus } from "../../../../types/ClientType";
import { useAlert } from "../../../../components/Alert/Alert";
import { clienteSchema, ClienteFormInput, ClienteFormData } from "../Schema/cliente.schema";

const TIP_ID = "cliente-form-tip";
const tipStyle: React.CSSProperties = {
  backgroundColor: "#1a1733",
  color: "#ece9ff",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: "8px",
  fontSize: "12px",
  padding: "6px 10px",
  maxWidth: 240,
  zIndex: 60,
};

/* ─── Field: agora com forwardRef (correção do bug) ─────────────── */

type FieldProps = {
  label: string;
  icon?: React.ReactNode;
  hint?: string;
  error?: string;
  optional?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>;

const Field = forwardRef<HTMLInputElement, FieldProps>(({ label, icon, hint, error, optional, ...props }, ref) => {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-[11px] uppercase tracking-wide text-[#4e4a72]">
          {label}
          {optional && <span className="ml-1 normal-case text-[#3f3b60]">(opcional)</span>}
        </label>
        {hint && (
          <span
            data-tooltip-id={TIP_ID}
            data-tooltip-content={hint}
            className="cursor-help text-[#4e4a72] transition-colors hover:text-[#9b8ff5]"
            aria-label={`Ajuda: ${label}`}
          >
            <Info className="h-3 w-3" />
          </span>
        )}
      </div>

      <div
        className={`flex items-center gap-2 rounded-lg border bg-white/[0.05] px-3 transition-colors focus-within:border-[#7c6ef5] ${
          error ? "border-[#a22d2d]/60" : "border-white/[0.08]"
        }`}
      >
        {icon && <span className="text-[#4e4a72]">{icon}</span>}
        <input
          id={id}
          {...props}
          ref={ref}
          aria-invalid={!!error}
          className="flex-1 bg-transparent py-2.5 text-[13px] text-[#e8e4ff] outline-none placeholder:text-[#6f6a93]"
        />
        {error && (
          <span
            data-tooltip-id={TIP_ID}
            data-tooltip-content={error}
            className="cursor-help text-[#f09595]"
            aria-label={`Erro: ${error}`}
          >
            <AlertCircle className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </div>
  );
});
Field.displayName = "Field";

interface ClienteFormProps {
  saving?: boolean;
  onClose: () => void;
  onSubmit: (data: ClienteFormData) => void | Promise<void>;
}

const ClienteForm = ({ saving = false, onClose, onSubmit }: ClienteFormProps) => {
  const alert = useAlert();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClienteFormInput, unknown, ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nome: "",
      cpfCnpj: "",
      status: eStatus.ATIVO,
      contato: { telefone: "", celular: "", whatsapp: "", email: "" },
    },
  });

  const onInvalid = () => alert.error("Campos inválidos", "Revise os campos destacados e tente novamente.");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => !saving && onClose()}
    >
      {/* Tooltip único para todo o formulário */}
      <Tooltip id={TIP_ID} place="top" style={tipStyle} />

      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-xl border border-white/[0.1] bg-[#15132a]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div>
            <h2 className="text-[13px] text-[#e8e4ff]">Novo cliente</h2>
            <p className="text-[11px] text-[#4e4a72]">Preencha os dados para cadastrar</p>
          </div>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            className="cursor-pointer rounded-lg p-1.5 text-[#4e4a72] transition-colors hover:bg-white/[0.06] hover:text-[#e8e4ff]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit((data) => onSubmit(data), onInvalid)}
          className="flex flex-col gap-4 overflow-y-auto p-5"
        >
          <Field
            label="Nome"
            placeholder="Nome completo"
            icon={<Users className="h-3.5 w-3.5" />}
            hint="Nome completo como aparece no documento."
            error={errors.nome?.message}
            {...register("nome")}
          />

          <Field
            label="CPF / CNPJ"
            placeholder="Somente números"
            inputMode="numeric"
            hint="Aceita CPF (11 dígitos) ou CNPJ (14 dígitos). A máscara é aplicada automaticamente."
            error={errors.cpfCnpj?.message}
            {...register("cpfCnpj")}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase tracking-wide text-[#4e4a72]">Status</label>
            <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.05] px-3 transition-colors focus-within:border-[#7c6ef5]">
              <select
                {...register("status")}
                className="flex-1 cursor-pointer bg-transparent py-2.5 text-[13px] text-[#e8e4ff] outline-none [&>option]:bg-[#15132a]"
              >
                <option value={eStatus.ATIVO}>Ativo</option>
                <option value={eStatus.INATIVO}>Inativo</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <span className="text-[11px] uppercase tracking-wide text-[#4e4a72]">Contato</span>
            <span className="h-px flex-1 bg-white/[0.06]" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Telefone"
              placeholder="(00) 0000-0000"
              inputMode="tel"
              optional
              icon={<Phone className="h-3.5 w-3.5" />}
              hint="Telefone fixo com DDD."
              error={errors.contato?.telefone?.message}
              {...register("contato.telefone")}
            />
            <Field
              label="Celular"
              placeholder="(00) 00000-0000"
              inputMode="tel"
              optional
              icon={<Smartphone className="h-3.5 w-3.5" />}
              hint="Celular com DDD."
              error={errors.contato?.celular?.message}
              {...register("contato.celular")}
            />
            <Field
              label="WhatsApp"
              placeholder="(00) 00000-0000"
              inputMode="tel"
              optional
              icon={<MessageCircle className="h-3.5 w-3.5" />}
              hint="Número usado no WhatsApp (com DDD)."
              error={errors.contato?.whatsapp?.message}
              {...register("contato.whatsapp")}
            />
            <Field
              label="E-mail"
              placeholder="email@exemplo.com"
              inputMode="email"
              optional
              icon={<Mail className="h-3.5 w-3.5" />}
              hint="Usado para envio de notas e comunicações."
              error={errors.contato?.email?.message}
              {...register("contato.email")}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="cursor-pointer rounded-lg border border-white/[0.08] bg-white/[0.05] px-4 py-2.5 text-[12px] text-[#8a85b4] transition-colors hover:bg-white/[0.09] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-br from-[#7c6ef5] to-[#a78bfa] px-4 py-2.5 text-[12px] text-white transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? "Salvando…" : "Criar cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClienteForm;
