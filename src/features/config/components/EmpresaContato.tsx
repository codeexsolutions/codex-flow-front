import { Mail, Smartphone, Phone, MessageCircle } from "lucide-react";
import type { UseFormRegister, FieldErrors } from "react-hook-form";
import Field from "@/shared/ui/inputs/Field";

type EmpresaContatoProps = {
  register: UseFormRegister<any>;
  errors: FieldErrors;
};

const phoneMasked = (register: UseFormRegister<any>, name: string) => {
  const reg = register(name);
  return {
    ...reg,
    onChange: (ev: React.ChangeEvent<HTMLInputElement>) => {
      ev.target.value = maskPhoneValue(ev.target.value);
      reg.onChange(ev);
    },
  };
};

function maskPhoneValue(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

const EmpresaContato = ({ register, errors }: EmpresaContatoProps) => (
  <div className="flex flex-col gap-4">
    <Field label="E-mail" icon={<Mail size={15} />} type="email" placeholder="empresa@email.com" error={errors.email?.message} {...register("email")} />
    <Field label="Celular" icon={<Smartphone size={15} />} placeholder="(00) 00000-0000" error={errors.celular?.message} {...phoneMasked(register, "celular")} />
    <Field label="Telefone" icon={<Phone size={15} />} placeholder="(00) 0000-0000" error={errors.telefone?.message} {...phoneMasked(register, "telefone")} />
    <Field label="WhatsApp" icon={<MessageCircle size={15} />} placeholder="(00) 00000-0000" error={errors.whatsapp?.message} {...phoneMasked(register, "whatsapp")} />
  </div>
);

export default EmpresaContato;
