import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  User,
  FileText,
  Hash,
  Image as ImageIcon,
  MessageCircle,
  Mail,
  Smartphone,
  Phone,
  MapPin,
} from "lucide-react";

import useEnterprise from "../../../../store/enterprise.store";
import Field from "../../../../components/Input/Field";
import { useAlert } from "../../../../components/Alert/Alert";
import { onlyDigits, maskCep, formatDocument } from "../../../../utils/format";

import { SettingsCard, SaveRow, SelectField, useSaver, UFS } from "../../ui";
import { empresaSchema, EmpresaData } from "../../schema/company.schema";

type EnterpriseLike = {
  id?: string;
  nomeFantasia?: string;
  name?: string;
  nomeRepresentante?: string;
  cpfCnpj?: string;
  inscMunicipal?: string;
  urlLogo?: string;
  urlImagem?: string;
  contato?: { email?: string; celular?: string | number; telefone?: string | number; whatsapp?: string | number };
  endereco?: {
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
  };
};

// máscara de telefone (string -> string)
const maskPhone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (!d) return "";
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (d.length <= 2) return `(${ddd}`;
  if (d.length <= 6) return `(${ddd}) ${rest}`;
  if (d.length <= 10) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
};

const SubHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="mb-3 flex items-center gap-2 border-b border-white/[0.06] pb-2">
    <span className="text-[#9b8ff5]">{icon}</span>
    <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#8a86b0]">{title}</span>
  </div>
);

const EmpresaForm = () => {
  const { enterprise, updateEnterprise } = useEnterprise();
  const ent = (enterprise ?? {}) as EnterpriseLike;
  const alert = useAlert();
  const saver = useSaver();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<EmpresaData>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      nomeFantasia: ent.nomeFantasia ?? ent.name ?? "",
      nomeRepresentante: ent.nomeRepresentante ?? "",
      cpfCnpj: formatDocument(ent.cpfCnpj ?? ""),
      inscMunicipal: ent.inscMunicipal ?? "",
      urlLogo: ent.urlLogo ?? "",
      urlImagem: ent.urlImagem ?? "",
      email: ent.contato?.email ?? "",
      celular: maskPhone(String(ent.contato?.celular ?? "")),
      telefone: maskPhone(String(ent.contato?.telefone ?? "")),
      whatsapp: maskPhone(String(ent.contato?.whatsapp ?? "")),
      cep: maskCep(ent.endereco?.cep ?? ""),
      logradouro: ent.endereco?.logradouro ?? "",
      numero: ent.endereco?.numero ?? "",
      complemento: ent.endereco?.complemento ?? "",
      bairro: ent.endereco?.bairro ?? "",
      cidade: ent.endereco?.cidade ?? "",
      uf: ent.endereco?.uf ?? "",
    },
  });

  const phoneMasked = (name: "celular" | "telefone" | "whatsapp") => {
    const reg = register(name);
    return {
      ...reg,
      onChange: (ev: React.ChangeEvent<HTMLInputElement>) => {
        ev.target.value = maskPhone(ev.target.value);
        reg.onChange(ev);
      },
    };
  };

  const regCep = register("cep");

  const buscarCep = async () => {
    const cep = onlyDigits(getValues("cep"));
    if (cep.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) return;
      if (data.logradouro) setValue("logradouro", data.logradouro);
      if (data.bairro) setValue("bairro", data.bairro);
      if (data.localidade) setValue("cidade", data.localidade);
      if (data.uf) setValue("uf", data.uf);
    } catch {
      /* silencioso */
    }
  };

  const onValid = async (data: EmpresaData) => {
    if (!ent.id) return;
    try {
      await updateEnterprise(ent.id, {
        nomeFantasia: data.nomeFantasia,
        nomeRepresentante: data.nomeRepresentante,
        cpfCnpj: onlyDigits(data.cpfCnpj),
        inscMunicipal: data.inscMunicipal,
        urlLogo: data.urlLogo,
        urlImagem: data.urlImagem,
        contato: {
          email: data.email,
          celular: onlyDigits(data.celular),
          telefone: Number(onlyDigits(data.telefone)),
          whatsapp: onlyDigits(data.whatsapp),
        },
        endereco: {
          cep: onlyDigits(data.cep),
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          cidade: data.cidade,
          uf: data.uf,
        },
      });
      await saver.save();
      alert.success("Empresa atualizada", "Os dados foram salvos com sucesso.");
    } catch {
      alert.error("Erro ao salvar", "Não foi possível salvar os dados da empresa.");
    }
  };

  const onInvalid = () => alert.error("Campos inválidos", "Revise os campos destacados e tente novamente.");

  return (
    <SettingsCard
      icon={<Building2 className="h-4 w-4" />}
      title="Dados da empresa"
      desc="Identificação, contato e endereço."
      footer={<SaveRow {...saver} onSave={handleSubmit(onValid, onInvalid)} savedLabel="Empresa atualizada" />}
    >
      <div className="flex flex-col gap-6">
        {/* Empresa */}
        <section>
          <SubHeader icon={<Building2 size={14} />} title="Empresa" />
          <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2 xl:grid-cols-3">
            <Field
              label="Nome fantasia"
              icon={<Building2 size={15} />}
              placeholder="Nome da empresa"
              error={errors.nomeFantasia?.message}
              {...register("nomeFantasia")}
            />
            <Field
              label="Representante"
              icon={<User size={15} />}
              placeholder="Nome do responsável"
              error={errors.nomeRepresentante?.message}
              {...register("nomeRepresentante")}
            />
            <Field
              label="CPF ou CNPJ"
              icon={<FileText size={15} />}
              hint="Não editável"
              disabled
              readOnly
              {...register("cpfCnpj")}
            />
            <Field
              label="Inscrição municipal"
              icon={<Hash size={15} />}
              placeholder="Opcional"
              error={errors.inscMunicipal?.message}
              {...register("inscMunicipal")}
            />
            <Field
              label="URL do logo"
              icon={<ImageIcon size={15} />}
              placeholder="https://..."
              error={errors.urlLogo?.message}
              {...register("urlLogo")}
            />
            <Field
              label="URL da imagem"
              icon={<ImageIcon size={15} />}
              placeholder="https://..."
              error={errors.urlImagem?.message}
              {...register("urlImagem")}
            />
          </div>
        </section>

        {/* Contato */}
        <section>
          <SubHeader icon={<MessageCircle size={14} />} title="Contato" />
          <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2 xl:grid-cols-4">
            <Field
              label="E-mail"
              icon={<Mail size={15} />}
              type="email"
              placeholder="empresa@email.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Field
              label="Celular"
              icon={<Smartphone size={15} />}
              placeholder="(00) 00000-0000"
              error={errors.celular?.message}
              {...phoneMasked("celular")}
            />
            <Field
              label="Telefone"
              icon={<Phone size={15} />}
              placeholder="(00) 0000-0000"
              error={errors.telefone?.message}
              {...phoneMasked("telefone")}
            />
            <Field
              label="WhatsApp"
              icon={<MessageCircle size={15} />}
              placeholder="(00) 00000-0000"
              error={errors.whatsapp?.message}
              {...phoneMasked("whatsapp")}
            />
          </div>
        </section>

        {/* Endereço */}
        <section>
          <SubHeader icon={<MapPin size={14} />} title="Endereço" />
          <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-2 xl:grid-cols-3">
            <Field
              label="CEP"
              icon={<MapPin size={15} />}
              placeholder="00000-000"
              error={errors.cep?.message}
              {...regCep}
              onChange={(ev: React.ChangeEvent<HTMLInputElement>) => {
                ev.target.value = maskCep(ev.target.value);
                regCep.onChange(ev);
              }}
              onBlur={(ev: React.FocusEvent<HTMLInputElement>) => {
                regCep.onBlur(ev);
                buscarCep();
              }}
            />
            <Field
              label="Número"
              icon={<Hash size={15} />}
              placeholder="123"
              error={errors.numero?.message}
              {...register("numero")}
            />
            <Controller
              control={control}
              name="uf"
              render={({ field }) => (
                <SelectField label="UF" icon={<MapPin size={15} />} value={field.value} onChange={field.onChange}>
                  <option value="">—</option>
                  {UFS.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </SelectField>
              )}
            />
            <div className="sm:col-span-2 xl:col-span-3">
              <Field
                label="Logradouro"
                icon={<MapPin size={15} />}
                placeholder="Rua, avenida..."
                error={errors.logradouro?.message}
                {...register("logradouro")}
              />
            </div>
            <Field
              label="Bairro"
              icon={<MapPin size={15} />}
              placeholder="Bairro"
              error={errors.bairro?.message}
              {...register("bairro")}
            />
            <Field
              label="Complemento"
              icon={<Hash size={15} />}
              placeholder="Opcional"
              error={errors.complemento?.message}
              {...register("complemento")}
            />
            <Field
              label="Cidade"
              icon={<Building2 size={15} />}
              placeholder="Cidade"
              error={errors.cidade?.message}
              {...register("cidade")}
            />
          </div>
        </section>
      </div>
    </SettingsCard>
  );
};

export default EmpresaForm;
