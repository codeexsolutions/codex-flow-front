import { useEffect } from "react";
import { Users, FileText, Phone, Smartphone, MessageCircle, Mail, BadgeCheck, Loader2, Save, X } from "lucide-react";
import { useForm } from "react-hook-form";
import type { Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import CustomerType, { eStatus } from "../../../../types/ClientType";
import Field from "../../../../components/Input/Field";
import { Modal } from "../../../../components/Modal";
import { useAlert } from "../../../../components/Alert/Alert";
import { formatDocument, maskPhone } from "../../../../utils/format";
import { clienteSchema, ClienteFormInput, ClienteFormData } from "../Schema/cliente.schema";

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
          <span className="text-[11px] uppercase tracking-[0.12em] text-sky-300/50 font-normal">Identificação</span>
          <span className="h-px flex-1 bg-sky-400/10" />
        </div>

        <Field label="Nome" icon={<Users className="h-3.5 w-3.5" />} placeholder="Nome completo" error={errors.nome?.message} {...register("nome")} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="CPF / CNPJ" icon={<FileText className="h-3.5 w-3.5" />} placeholder="Somente números" inputMode="numeric" error={errors.cpfCnpj?.message} {...masked("cpfCnpj", formatDocument)} />

          <div className="flex flex-col">
            <label className="mb-1.5 block text-[10px] uppercase tracking-[0.12em] text-sky-200/50 font-normal">Status</label>
            <div className="flex items-center gap-2 rounded-xl border border-sky-400/10 bg-[#0b1428] px-3 transition-colors focus-within:border-sky-400/40 hover:border-sky-400/20">
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-sky-300/60" />
              <select {...register("status")} className="w-full flex-1 cursor-pointer bg-transparent py-2.5 text-[13px] text-sky-50 outline-none font-normal [&>option]:bg-[#0b1428]">
                <option value={eStatus.ATIVO}>Ativo</option>
                <option value={eStatus.INATIVO}>Inativo</option>
              </select>
            </div>
            <p className="mt-0.5 min-h-[13px]" />
          </div>
        </div>

        {/* Contato */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-[0.12em] text-sky-300/50 font-normal">Contato</span>
          <span className="h-px flex-1 bg-sky-400/10" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefone" icon={<Phone className="h-3.5 w-3.5" />} placeholder="(00) 0000-0000" inputMode="tel" error={errors.contato?.telefone?.message} {...masked("contato.telefone", maskPhone)} />
          <Field label="Celular" icon={<Smartphone className="h-3.5 w-3.5" />} placeholder="(00) 00000-0000" inputMode="tel" error={errors.contato?.celular?.message} {...masked("contato.celular", maskPhone)} />
          <Field label="WhatsApp" icon={<MessageCircle className="h-3.5 w-3.5" />} placeholder="(00) 00000-0000" inputMode="tel" error={errors.contato?.whatsapp?.message} {...masked("contato.whatsapp", maskPhone)} />
          <Field label="E-mail" icon={<Mail className="h-3.5 w-3.5" />} placeholder="email@exemplo.com" inputMode="email" error={errors.contato?.email?.message} {...register("contato.email")} />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-sky-400/5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-sky-400/10 bg-transparent px-4 py-2.5 text-[12px] text-sky-200/70 font-normal transition-all hover:bg-sky-400/5 hover:text-sky-100 hover:border-sky-400/20 disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" /> Cancelar
          </button>
          <button type="submit" disabled={saving} className="flex cursor-pointer items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-[12px] text-white font-normal shadow-lg shadow-sky-500/20 transition-all hover:bg-sky-400 hover:shadow-sky-400/30 active:scale-[0.98] disabled:opacity-60">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ClienteEditForm;
