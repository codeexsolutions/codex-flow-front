import sysgrafix from "@/shared/api/sysgrafix";
import type { MinhaAssinatura, Plano, RetornoCadastro } from "../types/assinatura.types";

/** A API responde sempre no formato { statusCode, message, data: [...] }. */
type RetornoPadrao<T> = { statusCode: number; message: string; data: T[] };

const AssinaturaService = {
  /** Público — não exige token. */
  listarPlanos: async (): Promise<Plano[]> => {
    const res = await sysgrafix.get<RetornoPadrao<Plano>>("/assinatura/planos");
    return res.data?.data ?? [];
  },

  minha: async (): Promise<MinhaAssinatura> => {
    const res = await sysgrafix.get<RetornoPadrao<MinhaAssinatura>>("/assinatura/minha");
    const assinatura = res.data?.data?.[0];

    if (!assinatura) throw new Error(res.data?.message || "Não foi possível carregar sua assinatura.");

    return assinatura;
  },

  /** Token novo com o status atual da empresa — é o que destrava o checkout. */
  revalidar: async (): Promise<{ accessToken: string; ativo: boolean }> => {
    const res = await sysgrafix.post<RetornoPadrao<{ accessToken: string; ativo: boolean }>>("/assinatura/revalidar", {});
    const dados = res.data?.data?.[0];

    if (!dados?.accessToken) throw new Error(res.data?.message || "Não foi possível revalidar a sessão.");

    return dados;
  },

  trocarPlano: async (planoCodigo: string): Promise<MinhaAssinatura> => {
    const res = await sysgrafix.post<RetornoPadrao<MinhaAssinatura>>("/assinatura/plano", { planoCodigo });
    const assinatura = res.data?.data?.[0];

    if (!assinatura) throw new Error(res.data?.message || "Não foi possível trocar o plano.");

    return assinatura;
  },

  /** Marca a fatura como "aguardando confirmação" na fila do painel do dono. */
  enviarComprovante: async (faturaId: string): Promise<MinhaAssinatura> => {
    const res = await sysgrafix.post<RetornoPadrao<MinhaAssinatura>>(`/assinatura/faturas/${faturaId}/comprovante`, {});
    const assinatura = res.data?.data?.[0];

    if (!assinatura) throw new Error(res.data?.message || "Não foi possível registrar o comprovante.");

    return assinatura;
  },

  cadastrar: async (payload: unknown): Promise<RetornoCadastro> => {
    const res = await sysgrafix.post<RetornoPadrao<RetornoCadastro>>("/empresas/cadastrar", payload);
    const cadastro = res.data?.data?.[0];

    if (res.status !== 201 || !cadastro) {
      throw new Error(res.data?.message || "Não foi possível concluir o cadastro.");
    }

    return cadastro;
  },
};

export default AssinaturaService;
