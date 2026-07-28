export default interface UserType {
  id: string;
  email: string;
  cargo: string;
  permissao: string;
  codigoEmpresa: string;
  ativo: boolean;
  nome?: string;
  phone?: string;
  image?: string;
}
