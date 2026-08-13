import sysgrafix from "@/shared/api/sysgrafix";
import EnterpriseType from "@/shared/domain/empresa";

const EnterpriseService = {
  getById: (id: string) => sysgrafix.get(`/empresas/cpf-cnpj/${id}`),
  update: (id: string, data: Partial<EnterpriseType>) => sysgrafix.patch(`/empresas/alterar/${id}`, data),

  /**
   * Troca o documento — rota própria, e não um campo do formulário geral.
   *
   * O documento é a identidade da empresa: o servidor valida o formato, recusa
   * um já usado por outro cadastro e preserva o `codigo_empresa` (a chave de
   * tenant, que não pode se mover). Passar isso pelo `update` faria uma edição
   * de logo poder trocar o CNPJ sem querer, e sem nenhuma dessas verificações.
   */
  changeDocument: (id: string, cpfCnpj: string) => sysgrafix.patch(`/empresas/documento/${id}`, { cpfCnpj }),
};

export default EnterpriseService;
