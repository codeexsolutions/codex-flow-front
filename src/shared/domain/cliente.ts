export enum eStatus {
  ATIVO = "ATIVO",
  INATIVO = "INATIVO",
}

export type ContactType = {
  telefone?: string;
  celular?: string;
  whatsapp?: string;
  email?: string;
};

type ClientType = {
  id?: string;
  nome: string;
  cpfCnpj: string;
  status: eStatus;
  contato?: ContactType;
  created_at?: Date;
};

export default ClientType;
