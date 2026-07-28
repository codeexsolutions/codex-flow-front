import useEnterprise from "../../store/enterprise.store";
import { MapPin, Building2, Phone, BadgeCheck } from "lucide-react";
import { formatDocument, formatNumber } from "../../utils/format";

const HeaderInterprise = () => {
  const { enterprise } = useEnterprise();

  if (!enterprise) return null;

  const endereco = enterprise.endereco;
  const contato = enterprise.contato;

  return (
    <div className="flex items-start gap-5">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <img src={enterprise.urlLogo || "logo.jpg"} alt="Logo" className="h-full w-full object-contain p-1" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h1 className="m-0 text-2xl font-bold leading-none text-[#e8e4ff]">{enterprise.nomeFantasia}</h1>

          <BadgeCheck size={20} className="shrink-0 text-[#5dcaa5]" />
        </div>

        <div className="flex flex-col gap-2">
          {endereco && (
            <div className="flex items-center gap-3 text-sm text-[#8a85b4]">
              <MapPin size={16} className="shrink-0 text-[#4e4a72]" />

              <span>
                {endereco.logradouro}, {endereco.numero}
                {endereco.complemento && ` - ${endereco.complemento}`}
              </span>
            </div>
          )}

          {endereco && (
            <div className="flex items-center gap-3 text-sm text-[#8a85b4]">
              <Building2 size={16} className="shrink-0 text-[#4e4a72]" />

              <span>
                {endereco.bairro} • {endereco.cidade}/{endereco.uf}
                {endereco.cep && ` • CEP ${endereco.cep}`}
              </span>
            </div>
          )}

          {(contato?.telefone || enterprise.cpfCnpj) && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-[#8a85b4]">
              <Phone size={16} className="shrink-0 text-[#4e4a72]" />

              {contato?.telefone && <span>{formatNumber(contato.telefone)}</span>}

              {enterprise.cpfCnpj && (
                <span className="text-[#4e4a72]">• CNPJ {formatDocument(enterprise.cpfCnpj)}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeaderInterprise;
