import { Building2, User, FileText, Hash, Image as ImageIcon } from "lucide-react";
import type { UseFormRegister, FieldErrors } from "react-hook-form";
import Field from "@/shared/ui/inputs/Field";

type EmpresaIdentificacaoProps = {
  register: UseFormRegister<any>;
  errors: FieldErrors;
};

const EmpresaIdentificacao = ({ register, errors }: EmpresaIdentificacaoProps) => (
  <div className="flex flex-col gap-4">
    <Field label="Nome fantasia" icon={<Building2 size={15} />} placeholder="Nome da empresa" error={errors.nomeFantasia?.message} {...register("nomeFantasia")} />
    <Field label="Representante" icon={<User size={15} />} placeholder="Nome do responsável" error={errors.nomeRepresentante?.message} {...register("nomeRepresentante")} />
    <Field label="CPF ou CNPJ" icon={<FileText size={15} />} hint="Não editável" disabled readOnly {...register("cpfCnpj")} />
    <Field label="Inscrição municipal" icon={<Hash size={15} />} placeholder="Opcional" error={errors.inscMunicipal?.message} {...register("inscMunicipal")} />
    <Field label="URL do logo" icon={<ImageIcon size={15} />} placeholder="https://..." error={errors.urlLogo?.message} {...register("urlLogo")} />
    <Field label="URL da imagem" icon={<ImageIcon size={15} />} placeholder="https://..." error={errors.urlImagem?.message} {...register("urlImagem")} />
  </div>
);

export default EmpresaIdentificacao;
