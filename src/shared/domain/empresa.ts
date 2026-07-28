interface EnterpriseType {
  id: string;
  codigoEmpresa: string;
  nomeRepresentante: string;
  nomeFantasia: string;
  cpfCnpj: string;
  inscMunicipal?: string;
  urlLogo?: string;
  urlImagem?: string;
  ativo: boolean;
  endereco?: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  contato?: {
    telefone?: string;
    celular?: string;
    whatsapp?: string;
    email?: string;
  };
}

/**
 * Recorte tolerante da empresa para telas que só exibem identificação.
 * Antes era redeclarado localmente em 4 arquivos distintos.
 */
export type EnterpriseLike = {
  nomeFantasia?: string;
  name?: string;
  cpfCnpj?: string;
  urlLogo?: string;
};

/**
 * O `codigoEmpresa` do token carrega 2 dígitos de sufixo que não fazem parte
 * do identificador usado pela API de empresas.
 */
const CODIGO_EMPRESA_SUFFIX_LENGTH = 2;

export const toCodigoEmpresaBase = (codigoEmpresa: string): string => codigoEmpresa.slice(0, -CODIGO_EMPRESA_SUFFIX_LENGTH);

export default EnterpriseType;
