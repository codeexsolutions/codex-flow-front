import UserType from "../../types/UserType";

interface AuthFormInput {
  email: string;
  senha: string;
  cpfCnpjEmpresa: string;
}

export default interface useAuthProps {
  user: UserType | null;
  isLogged: boolean;
  login: (data: AuthFormInput) => Promise<void>;
  initialize: () => void;
  logout: () => void;
}
