import useEnterprise from "@/features/empresa/store/enterprise.store";
import { MapPin, Building2, Phone, BadgeCheck } from "lucide-react";
import { formatDocument } from "@/shared/utils/format";
import { podeMostrarDocumento, rotuloDocumento } from "@/shared/utils/documento";
import { maskPhone } from "@/shared/validation/masks";

const HeaderInterprise = () => {
  const { enterprise } = useEnterprise();

  if (!enterprise) return null;

  const endereco = enterprise.endereco;
  const contato = enterprise.contato;

  /* CNPJ sempre sai; CPF só se a empresa tiver desligado a opção — que vem
     ligada de fábrica. Ver `shared/utils/documento`. */
  const documento = podeMostrarDocumento(enterprise.cpfCnpj, enterprise.ocultarCpfNota);

  return (
    <div className="flex items-start gap-5">
      {/*
        Logo — 32x32, sem moldura.

        A caixa com borda e fundo cinza enquadrava a marca como se fosse um
        avatar: numa nota impressa, esse retângulo aparece em volta da logo e
        denuncia a "caixinha do sistema". Sem borda, sem fundo e sem padding, a
        logo assenta direto no papel — e ganha o espaço que a moldura ocupava.

        Dois defeitos moravam nesta linha. O arquivo padrão era `logo.jpg`,
        que não existe em `public/` (o que existe é `logo.png`), e o caminho
        vinha SEM a barra inicial: em `/pdv/orcamentos` o browser procurava
        `/pdv/logo.jpg`. Ou seja, quem ainda não subiu logo via um ícone
        quebrado na própria nota que manda para o cliente.

        `object-contain`, e não `cover`: logo é marca, não foto de capa —
        `cover` cortava as bordas de qualquer logo que não fosse quadrada.
      */}
      <div className="flex h-32 w-32 shrink-0 items-center justify-center">
        <img
          src={enterprise.urlLogo || "/logo.png"}
          alt={enterprise.nomeFantasia ? `Logo de ${enterprise.nomeFantasia}` : "Logo da empresa"}
          className="h-full w-full object-contain"
          /* Logo de storage pode ter sido apagada por fora; o padrão evita o
             ícone de imagem quebrada dentro da nota. */
          onError={(ev) => {
            const img = ev.currentTarget;
            if (img.src.endsWith("/logo.png")) return;
            img.src = "/logo.png";
          }}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h1 className="m-0 text-2xl leading-none text-ink">{enterprise.nomeFantasia}</h1>
          <BadgeCheck size={20} className="shrink-0 text-success" />
        </div>

        <div className="flex flex-col gap-2">
          {endereco && (
            <div className="flex items-center gap-3 text-sm text-mist">
              <MapPin size={16} className="shrink-0 text-muted" />
              <span>
                {endereco.logradouro}, {endereco.numero}
                {endereco.complemento && ` - ${endereco.complemento}`}
              </span>
            </div>
          )}

          {endereco && (
            <div className="flex items-center gap-3 text-sm text-mist">
              <Building2 size={16} className="shrink-0 text-muted" />
              <span>
                {endereco.bairro} • {endereco.cidade}/{endereco.uf}
                {endereco.cep && ` • CEP ${endereco.cep}`}
              </span>
            </div>
          )}

          {(contato?.telefone || documento) && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-mist">
              <Phone size={16} className="shrink-0 text-muted" />
              {contato?.telefone && <span>{maskPhone(String(contato.telefone))}</span>}
              {/* O rótulo vem do documento, não cravado: a linha dizia "CNPJ"
                  sempre, e quem abriu a conta como pessoa física via o próprio
                  CPF rotulado errado em toda nota. */}
              {documento && <span className="text-muted">• {rotuloDocumento(enterprise.cpfCnpj)} {formatDocument(enterprise.cpfCnpj)}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeaderInterprise;
