import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";

import useAuth from "@/features/auth/store/auth.store";
import AssinaturaService from "@/features/assinatura/services/assinatura.service";
import { API_ORIGEM } from "@/shared/api/apiUrl";

/**
 * Escuta a liberação da empresa e destrava o cliente sozinho.
 *
 * O problema que isto resolve: quando o dono confirma o pagamento, a empresa
 * é ativada no banco — mas o cliente continua com um token assinado com
 * `ativo: false` e ficaria preso no checkout até a sessão expirar. Não adianta
 * só recarregar a página: o token é o mesmo.
 *
 * Então, ao receber o aviso, pedimos um token novo (`/assinatura/revalidar`) e
 * regravamos a sessão — aí o roteador já deixa entrar no sistema.
 *
 * O socket é o caminho normal. O `focus` é a rede de proteção para o caso de o
 * socket cair (aba dormindo, wi-fi trocando, proxy sem websocket).
 */
export function useLiberacaoEmpresa(aoLiberar: (dados: { planoNome?: string | null }) => void) {
  const { user, setAuth } = useAuth();

  const codigoEmpresa = user?.codigoEmpresa;
  const inativo = Boolean(user) && !user?.ativo;

  useEffect(() => {
    // Só faz sentido para quem está esperando liberação.
    if (!inativo || !codigoEmpresa) return;

    let vivo = true;

    /** Pede o token novo; só avisa a tela se a empresa realmente foi liberada. */
    const revalidar = async () => {
      if (!vivo) return;

      try {
        const { accessToken, ativo } = await AssinaturaService.revalidar();

        if (!vivo || !ativo) return;

        setAuth(accessToken);
        aoLiberar({});
      } catch {
        /* Silencioso: é uma verificação de fundo, não uma ação do usuário. */
      }
    };

    // A API monta o socket na raiz do servidor, não no prefixo /v1.
    const origem = API_ORIGEM;

    let socket: Socket | null = null;

    try {
      socket = io(origem, {
        auth: { token: localStorage.getItem("token") },
        transports: ["websocket", "polling"],
        reconnectionDelay: 2000,
      });

      socket.on("empresa:liberada", revalidar);
    } catch {
      /* Sem socket, o `focus` abaixo continua cobrindo. */
    }

    window.addEventListener("focus", revalidar);

    return () => {
      vivo = false;
      window.removeEventListener("focus", revalidar);
      socket?.off("empresa:liberada", revalidar);
      socket?.disconnect();
    };
  }, [inativo, codigoEmpresa, setAuth, aoLiberar]);
}
