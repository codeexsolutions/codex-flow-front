import sysgrafix from "./sysgrafix.service";
import EnterpriseType from "../types/EnterpriseType";

const EnterpriseService = {
  getById: (id: string) => sysgrafix.get(`/empresas/cpf-cnpj/${id}`),
  update: (id: string, data: Partial<EnterpriseType>) => sysgrafix.patch(`/empresas/alterar/${id}`, data),
};

export default EnterpriseService;
