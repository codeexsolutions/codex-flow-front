import ClientType from "@/shared/domain/cliente";
import sysgrafix from "@/shared/api/sysgrafix";

/*
 * `carregamento` é a frase do aviso de "estou salvando".
 *
 * Toda gravação já mostra o aviso sozinha (ver `sysgrafix.ts`); o que a frase
 * acrescenta é DIZER O QUÊ. "Salvando…" numa tela que acabou de mandar um
 * cliente e uma nota não distingue as duas — "Cadastrando cliente…" distingue,
 * e é a única pista que sobra se a requisição demorar.
 */
const ClientService = {
  create: (params: ClientType) => sysgrafix.post("/clientes/cadastrar", params, { carregamento: "Cadastrando cliente…" }),

  getAll: () => sysgrafix.get("/clientes"),
  getById: (id: string) => sysgrafix.get(`/clientes/id/${id}`),

  update: (id: string, params: ClientType) => sysgrafix.patch(`/clientes/alterar/${id}`, params, { carregamento: "Salvando o cliente…" }),
  remove: (id: string) => sysgrafix.delete(`/clientes/${id}`, { carregamento: "Excluindo o cliente…" }),
};

export default ClientService;
