import sysgrafix from "@/shared/api/sysgrafix";
import type { FaturaType } from "@/shared/domain/fatura";

const FaturaService = {
  listar: () => sysgrafix.get("/faturas"),
  pagar: (id: string) => sysgrafix.post(`/faturas/pagar/${id}`, {}),
};

export type FaturaApiResponse = {
  data?: {
    data?: FaturaType[];
  };
};

export default FaturaService;
