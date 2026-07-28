import { useEffect } from "react";
import { Users, FileText, Phone, Smartphone, MessageCircle, Mail, BadgeCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import type { Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import CustomerType, { eStatus } from "@/shared/domain/cliente";
import Field from "@/shared/ui/inputs/Field";
import { FormActions } from "@/shared/ui/form/FormKit";
import { Modal } from "@/shared/ui/Modal";
import { useAlert } from "@/shared/ui/Alert";
import { formatDocument } from "@/shared/utils/format";
import { maskPhone } from "@/shared/validation/masks";
import { clienteSchema, ClienteFormInput, ClienteFormData } from "@/features/clientes/schema/cliente.schema";

const toDefaults = (c: CustomerType): ClienteFormInput => ({
  nome: c.nome ?? "",
  cpfCnpj: formatDocument(c.cpfCnpj ?? ""),
  status: c.status ?? eStatus.ATIVO,
  contato: {
    telefone: maskPhone(String(c.contato?.telefone ?? "")),
    celular: maskPhone(String(c.contato?.celular ?? "")),
    whatsapp: maskPhone(String(c.contato?.whatsapp ?? "")),
    email: c.contato?.email ?? "",
  },
});

interface Props {
  open: boolean;
  client: CustomerType;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (data: ClienteFormData) => void | Promise<void>;
}

const ClienteEditForm = ({ open, client, saving = false, onClose, onSubmit }: Props) => {
  const alert = useAlert();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClienteFormInput, unknown, ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: toDefaults(client),
  });

  useEffect(() => {
    if (open) reset(toDefaults(client));
  }, [open, client]);

  const masked = (name: Path<ClienteFormInput>, mask: (v: string) => string) => {
    const reg = register(name);
    return {
      ...reg,
      onChange: (ev: React.ChangeEvent<HTMLInputElement>) => {
        ev.target.value = mask(ev.target.value);
        reg.onChange(ev);
      },
    };
  };

  const onInvalid = () => alert.error("Campos inválidos", "Revise os campos destacados e tente novamente.");

  return (
    <Modal open={open} onClose={onClose} title="Editar cliente" subtitle="Atualize os dados e salve" size="lg">
      <form onSubmit={handleSubmit((data) => onSubmit(data), onInvalid)} className="flex flex-col gap-5">
        {/* Identificação */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-[0.12em] text-faint">Identificação</span>
          <span className="h-px flex-1 bg-fg/[0.08]" />
        </div>

        <Field label="Nome" icon={<Users className="h-3.5 w-3.5" />} placeholder="Nome completo" error={errors.nome?.message} {...register("nome")} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="CPF / CNPJ" icon={<FileText className="h-3.5 w-3.5" />} placeholder="Somente números" inputMode="numeric" error={errors.cpfCnpj?.message} {...masked("cpfCnpj", formatDocument)} />

          <div className="flex flex-col">
            <label className="mb-1.5 block text-[10px] uppercase tracking-[0.12em] text-faint">Status</label>
            <div className="flex items-center gap-2 rounded-xl border border-fg/[0.1] bg-surface-raised px-3 transition-colors focus-within:border-accent/50 hover:border-fg/[0.16]">
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-accent-soft" />
              <select {...register("status")} className="w-full flex-1 cursor-pointer bg-transparent py-2.5 text-[13px] text-ink outline-none [&>option]:bg-surface-raised">
                <option value={eStatus.ATIVO}>Ativo</option>
                <option value={eStatus.INATIVO}>Inativo</option>
              </select>
            </div>
            <p className="mt-0.5 min-h-[13px]" />
          </div>
        </div>

        {/* Contato */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-[0.12em] text-faint">Contato</span>
          <span className="h-px flex-1 bg-fg/[0.08]" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefone" icon={<Phone className="h-3.5 w-3.5" />} placeholder="(00) 0000-0000" inputMode="tel" error={errors.contato?.telefone?.message} {...masked("contato.telefone", maskPhone)} />
          <Field label="Celular" icon={<Smartphone className="h-3.5 w-3.5" />} placeholder="(00) 00000-0000" inputMode="tel" error={errors.contato?.celular?.message} {...masked("contato.celular", maskPhone)} />
          <Field label="WhatsApp" icon={<MessageCircle className="h-3.5 w-3.5" />} placeholder="(00) 00000-0000" inputMode="tel" error={errors.contato?.whatsapp?.message} {...masked("contato.whatsapp", maskPhone)} />
          <Field label="E-mail" icon={<Mail className="h-3.5 w-3.5" />} placeholder="email@exemplo.com" inputMode="email" error={errors.contato?.email?.message} {...register("contato.email")} />
        </div>

        <FormActions onCancel={onClose} saving={saving} submitText="Salvar alterações" />
      </form>
    </Modal>
  );
};

export default ClienteEditForm;
