import { create } from "zustand";

import AuthService, { type UsuarioSessao } from "@/features/auth/services/auth.service";
import AuthFormInputs from "@/features/auth/schema/auth.schema";
import useAuthProps from "@/features/auth/types/auth.types";
import { alert } from "@/shared/ui/Alert"; // ajuste o caminho se necessário
import useEnterprise from "@/features/empresa/store/enterprise.store";
import { toCodigoEmpresaBase } from "@/shared/domain/empresa";
import useTransicao from "@/shared/session/transicao.store";
import { resetarLojas } from "@/shared/session/resetarLojas";

/*
 * A sessão NÃO mora mais aqui em token: o JWT vive num cookie httpOnly, que o
 * navegador envia sozinho e o JS não lê. A store guarda só o usuário
 * (devolvido pela API) e o estado de navegação.
 */

const deSessaoParaUsuario = (sessao: UsuarioSessao) => ({
  id: sessao.id,
  nome: sessao.nome ?? undefined,
  email: sessao.email,
  cargo: sessao.cargo,
  permissao: sessao.permissao ?? "",
  root: Boolean(sessao.root),
  codigoEmpresa: sessao.codigoEmpresa,
  ativo: sessao.ativo,
});

type AuthStore = useAuthProps & {
  loading: boolean;
  initialize: () => void;
  setAuth: (usuario: UsuarioSessao) => void;
  clearAuth: () => void;
  atualizarAtivo: (ativo: boolean) => void;
};

const useAuth = create<AuthStore>((set, get) => ({
  user: null,

  isLogged: false,

  loading: true,

  setAuth(usuario: UsuarioSessao) {
    set({
      user: deSessaoParaUsuario(usuario),
      isLogged: true,
      loading: false,
    });
  },

  clearAuth() {
    // Avisa a API para apagar os cookies httpOnly. Melhor esforço: se a rede
    // falhar, o cookie expira sozinho em 12h — o logout local não pode travar.
    AuthService.logout().catch(() => {});

    // Zera clientes, produtos, vendas, financeiro e empresa: sem isso os dados
    // de quem saiu ficariam visíveis para quem entrar em seguida.
    resetarLojas();

    set({
      user: null,
      isLogged: false,
      loading: false,
    });
  },

  async login(data: AuthFormInputs, aoAutenticar) {
    try {
      const usuario = await AuthService.login(data);

      /*
       * O cookie já está setado quando o login responde, então a busca da
       * empresa já sai autorizada — em paralelo com a animação. A sessão só
       * vale depois do `Promise.all`: sem isso o roteador trocaria a tela com
       * a empresa ainda carregando e o sistema abriria numa tela de espera.
       */
      const carregarEmpresa = usuario.codigoEmpresa
        ? useEnterprise.getState().fetchEnterprise(toCodigoEmpresaBase(usuario.codigoEmpresa))
        : Promise.resolve();

      await Promise.all([aoAutenticar ? aoAutenticar(usuario.nome ?? "") : Promise.resolve(), carregarEmpresa]);

      // Só agora a sessão vale — e o roteador troca de tela com tudo carregado.
      set({ user: deSessaoParaUsuario(usuario), isLogged: true, loading: false });

      // Com o sistema montado atrás, o overlay dissolve revelando-o.
      useTransicao.getState().fechar();

      // Sem alerta quando a tela já deu as boas-vindas com a animação.
      if (!aoAutenticar) await alert.success("Login realizado", `Bem-vindo, ${usuario.nome}!`);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };

      await alert.error("Erro ao entrar", err?.response?.data?.message ?? err?.message ?? "Usuário ou senha inválidos.");

      throw error;
    }
  },

  initialize: async () => {
    try {
      // O navegador não consegue ler o token; quem diz se existe sessão é a
      // API, validando o cookie que ela mesma setou no login.
      const usuario = await AuthService.me();

      set({
        user: deSessaoParaUsuario(usuario),
        isLogged: true,
        loading: true,
      });

      if (usuario.codigoEmpresa) {
        await useEnterprise.getState().fetchEnterprise(toCodigoEmpresaBase(usuario.codigoEmpresa));
      }

      set({
        loading: false,
      });
    } catch (error) {
      get().clearAuth();

      // Quem nunca logou (sem cookie) cai aqui também: a API responde "Token
      // não informado", e mostrar aviso seria assustar a visita da tela de
      // login. Aviso é só quando a sessão EXISTIA e morreu (cookie vencido).
      const err = error as { response?: { data?: { message?: string } } };
      const mensagem = String(err?.response?.data?.message ?? "").toLowerCase();

      if (mensagem.includes("inválido") || mensagem.includes("expirad")) {
        alert.warning("Sessão expirada", "Sua sessão expirou. Faça login novamente.");
      }
    }
  },

  /** Empresa liberada (pagamento confirmado): o checkout passa a entrar. */
  atualizarAtivo(ativo: boolean) {
    const usuario = get().user;

    if (!usuario) return;

    set({ user: { ...usuario, ativo } });
  },

  async logout() {
    // A animação roda ANTES de a sessão cair; o overlay vive acima do roteador
    // (ver `CamadaTransicao`), então sobrevive ao desmonte da tela atual.
    await useTransicao.getState().tocar("saida", get().user?.nome ?? "");

    get().clearAuth();

    // Login já montado atrás: só então o overlay sai.
    useTransicao.getState().fechar();
  },
}));

export default useAuth;
