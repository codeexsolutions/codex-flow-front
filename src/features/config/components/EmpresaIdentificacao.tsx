import { Building2, User, FileText, Hash, Image as ImageIcon } from "lucide-react";
import type { UseFormRegister, FieldErrors } from "react-hook-form";
import Field from "@/shared/ui/inputs/Field";
import { fieldError } from "@/shared/validation/fieldError";
import type { EmpresaInput } from "@/features/config/schema/company.schema";

type EmpresaIdentificacaoProps = {
  register: UseFormRegister<EmpresaInput>;
  errors: FieldErrors<EmpresaInput>;
};

const EmpresaIdentificacao = ({ register, errors }: EmpresaIdentificacaoProps) => (
  <div className="flex flex-col gap-4">
    <Field label="Nome fantasia" icon={<Building2 size={15} />} placeholder="Nome da empresa" error={fieldError(errors.nomeFantasia)} {...register("nomeFantasia")} />
    <Field label="Representante" icon={<User size={15} />} placeholder="Nome do responsável" error={fieldError(errors.nomeRepresentante)} {...register("nomeRepresentante")} />
    <Field label="CPF ou CNPJ" icon={<FileText size={15} />} hint="Não editável" disabled readOnly {...register("cpfCnpj")} />
    <Field label="Inscrição municipal" icon={<Hash size={15} />} placeholder="Opcional" error={fieldError(errors.inscMunicipal)} {...register("inscMunicipal")} />
    <Field label="URL do logo" icon={<ImageIcon size={15} />} placeholder="https://..." error={fieldError(errors.urlLogo)} {...register("urlLogo")} />
    <Field label="URL da imagem" icon={<ImageIcon size={15} />} placeholder="https://..." error={fieldError(errors.urlImagem)} {...register("urlImagem")} />
  </div>
);

export default EmpresaIdentificacao;
