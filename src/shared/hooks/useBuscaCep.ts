import { useState } from "react";
import { onlyDigits } from "@/shared/utils/format";

export type EnderecoCep = {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export function useBuscaCep() {
  const [buscando, setBuscando] = useState(false);

  const buscar = async (cepBruto: string): Promise<EnderecoCep | null> => {
    const cep = onlyDigits(cepBruto);
    if (cep.length !== 8) return null;

    setBuscando(true);

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();

      if (data?.erro) return null;

      return {
        logradouro: data.logradouro ?? "",
        bairro: data.bairro ?? "",
        cidade: data.localidade ?? "",
        uf: data.uf ?? "",
      };
    } catch {
      return null;
    } finally {
      setBuscando(false);
    }
  };

  return { buscar, buscando };
}
