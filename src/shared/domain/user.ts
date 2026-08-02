export default interface UserType {
  id: string;
  email: string;
  cargo: string;
  permissao: string;
  /** Dono da conta: gerencia funcionários e vê todas as vendas. */
  root?: boolean;
  codigoEmpresa: string;
  ativo: boolean;
  nome?: string;
  phone?: string;
  image?: string;
}
