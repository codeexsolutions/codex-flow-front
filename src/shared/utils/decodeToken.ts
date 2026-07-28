import { jwtDecode } from "jwt-decode";

export type TokenPayload = {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  permissao: string;
  codigoEmpresa: string;
  ativo: boolean;
  iat: number;
  exp: number;
};

export const decodeToken = (token: string): TokenPayload => {
  return jwtDecode<TokenPayload>(token);
};

export const isTokenExpired = (token: string): boolean => {
  const { exp } = decodeToken(token);

  return exp * 1000 <= Date.now();
};
