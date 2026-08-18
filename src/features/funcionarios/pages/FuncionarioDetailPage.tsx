import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft, Pencil, Loader2, AlertTriangle, RotateCw, Wallet, Percent,
  Clock, IdCard, Cake, Briefcase, ShieldCheck, Crown, MapPin, Camera,
  FileText, UserCog, CalendarDays,
} from "lucide-react";

import { PageScreen } from "@/shared/ui/PageShell";
import { Modal } from "@/shared/ui/Modal";
import { Selo } from "@/shared/ui/StatusBadge";
import { useAlert } from "@/shared/ui/Alert";
import { formatCurrency } from "@/shared/utils/currency";
import { formatNumber, EMPTY } from "@/shared/utils/format";
import { maskCpfCnpj } from "@/shared/validation/masks";
import FuncionarioService from "@/features/funcionarios/services/funcionario.service";
import FuncionarioForm from "@/features/funcionarios/components/FuncionarioForm";
import { PONTO_LABEL, type Equipe, type Funcionario, type PontoRegistro } from "@/shared/domain/funcionario";

/**
 * A página do funcionário — tudo o que existe sobre uma pessoa, num lugar só.
 *
 * ---------------------------------------------------------------------------
 * Por que uma PÁGINA, e não o modal de edição
 * ---------------------------------------------------------------------------
 * O modal cabia quando funcionário era "nome, e-mail e senha". Não cabe mais:
 * a ficha, o salário, a comissão, o acesso e o extrato de ponto são cinco
 * blocos que se leem JUNTOS — "esta pessoa faltou três dias e ganha por
 * comissão" é uma frase só, e ela não se forma se cada metade estiver numa
 * aba diferente.
 *
 * Página também significa ENDEREÇO: `/funcionarios/<id>` pode ser mandado no
 * WhatsApp para o contador e aberto de volta pelo histórico. Um modal não tem
 * nada disso.
 *
 * A edição dos campos continua em modal, e continua sendo o MESMO formulário
 * do cadastro — dois formulários para a mesma coisa divergiriam no primeiro
 * campo novo.
 */

/* -------------------------------------------------------------------------- */
/* Peças                                                                      */
/* -------------------------------------------------------------------------- */

const StatCard = ({ icon, label, value, hint, tom }: { icon: ReactNode; label: string; value: string; hint?: string; tom?: "danger" | "warning" | "success" }) => (
  <div className="card glass-sheen rounded-2xl p-4">
    <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-inset ${
      tom === "danger" ? "bg-danger/[0.14] text-danger ring-danger/20"
        : tom === "warning" ? "bg-warning/[0.14] text-warning ring-warning/20"
        : tom === "success" ? "bg-success/[0.14] text-success ring-success/20"
        : "bg-accent/[0.14] text-accent-soft ring-accent/20"
    }`}>
      {icon}
    </div>
    <p className="text-[11px] uppercase tracking-[0.1em] text-faint">{label}</p>
    <p className="mt-1 truncate text-lg tabular-nums tracking-tight text-ink sm:text-xl">{value}</p>
    {hint && <p className="mt-0.5 truncate text-[11px] text-faint">{hint}</p>}
  </div>
);

/**
 * Linha de dado da ficha.
 *
 * Campo vazio NÃO some — aparece como "—". Sumir faria a ficha mudar de altura
 * conforme a pessoa e esconderia justamente o que falta preencher, que é a
 * informação mais acionável desta tela.
 */
const Dado = ({ icon, label, valor }: { icon: ReactNode; label: string; valor?: string | null }) => (
  <div className="flex items-center gap-3 px-5 py-2.5">
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-fg/[0.04] text-muted">{icon}</span>
    <span className="w-[104px] shrink-0 text-[11px] uppercase tracking-[0.08em] text-faint">{label}</span>
    <span className={`min-w-0 flex-1 truncate text-[12.5px] ${valor ? "text-ink" : "text-faint"}`}>{valor || EMPTY}</span>
  </div>
);

const Cartao = ({ children }: { children: ReactNode }) => (
  <div className="card glass-sheen overflow-hidden rounded-2xl">{children}</div>
);

/** As batidas de um dia, agrupadas — é assim que uma folha de ponto se lê. */
type Dia = { data: string; registros: PontoRegistro[] };

const agruparPorDia = (pontos: PontoRegistro[]): Dia[] => {
  const mapa = new Map<string, PontoRegistro[]>();

  for (const p of pontos) {
    const dia = new Date(p.momento).toLocaleDateString("pt-BR");
    mapa.set(dia, [...(mapa.get(dia) ?? []), p]);
  }

  /* Dentro do dia, da primeira para a última: o extrato vem do servidor em
     ordem decrescente (o mais recente primeiro), que é a ordem certa para a
     LISTA de dias e a errada para as batidas dentro de um. */
  return [...mapa.entries()].map(([data, registros]) => ({
    data,
    registros: [...registros].sort((a, b) => +new Date(a.momento) - +new Date(b.momento)),
  }));
};

/* -------------------------------------------------------------------------- */
/* Página                                                                     */
/* -------------------------------------------------------------------------- */

const FuncionarioDetalhe = () => {
  const { funcionarioId } = useParams();
  const navigate = useNavigate();
  const alert = useAlert();

  const [equipe, setEquipe] = useState<Equipe | null>(null);
  const [pontos, setPontos] = useState<PontoRegistro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [editando, setEditando] = useState(false);
  const [foto, setFoto] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!funcionarioId) return;

    setErro("");

    try {
      /* As duas juntas: a lista traz a pessoa e o catálogo de áreas (que o
         formulário de edição precisa), e o extrato vem à parte porque tem
         limite próprio. Em série seriam duas esperas antes do primeiro pixel. */
      const [nova, registros] = await Promise.all([
        FuncionarioService.listar(),
        FuncionarioService.ponto(funcionarioId, 200).catch(() => [] as PontoRegistro[]),
      ]);

      setEquipe(nova);
      setPontos(registros);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }, [funcionarioId]);

  useEffect(() => {
    setCarregando(true);
    void carregar();
  }, [carregar]);

  const funcionario: Funcionario | undefined = useMemo(
    () => equipe?.funcionarios.find((f) => f.id === funcionarioId),
    [equipe, funcionarioId],
  );

  const dias = useMemo(() => agruparPorDia(pontos), [pontos]);

  /**
   * O custo mensal desta pessoa, hoje.
   *
   * Só o salário: a comissão depende do que ela vender no mês e ainda não é
   * calculada (ver a nota do rodapé). Somar um número que não existe daria um
   * total falso — e total falso numa tela de folha é pior do que total nenhum.
   */
  const custo = funcionario?.salario ?? null;

  if (carregando) {
    return (
      <PageScreen title="Funcionário" icon={<UserCog className="h-5 w-5" />}>
        <div className="flex flex-1 items-center justify-center text-faint">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </PageScreen>
    );
  }

  if (erro || !funcionario) {
    return (
      <PageScreen title="Funcionário" icon={<UserCog className="h-5 w-5" />}>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <AlertTriangle className="h-6 w-6 text-danger" />
          <p className="text-[13px] text-mist">{erro || "Funcionário não encontrado."}</p>
          <div className="flex gap-2">
            <button onClick={() => void carregar()} className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-fg/[0.1] px-3 py-2 text-[12.5px] text-mist hover:text-ink">
              <RotateCw className="h-3.5 w-3.5" /> Tentar novamente
            </button>
            <button onClick={() => navigate("/funcionarios")} className="focus-ring cursor-pointer rounded-lg bg-accent px-3 py-2 text-[12.5px] text-white">
              Voltar à equipe
            </button>
          </div>
        </div>
      </PageScreen>
    );
  }

  const acesso = funcionario.acesso;

  return (
    <PageScreen
      icon={<UserCog className="h-5 w-5" />}
      title={funcionario.nome}
      subtitle={[funcionario.cargo, acesso ? acesso.email : "sem acesso ao sistema"].filter(Boolean).join(" · ")}
    >
      {/* Barra de ações */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => navigate("/funcionarios")}
          className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-fg/[0.08] bg-fg/[0.04] px-3 py-2 text-[13px] text-mist transition-colors hover:text-ink"
        >
          <ChevronLeft className="h-4 w-4" /> Equipe
        </button>

        <div className="flex-1" />

        {/*
          Ação rápida da folha.
          Ela está aqui porque é o que se faz DEPOIS de olhar o ponto e o
          salário — os dois blocos desta página. O que a folha contém ainda
          precisa ser definido; ver o aviso no rodapé.
        */}
        <button
          type="button"
          onClick={() => alert.info(
            "Folha de pagamento",
            "A ação está no lugar, mas o documento ainda não foi definido: falta combinar o que entra (salário, comissão, descontos, horas) e o formato de saída.",
          )}
          className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-fg/[0.08] bg-fg/[0.04] px-3 py-2 text-[13px] text-mist transition-colors hover:text-ink"
        >
          <FileText className="h-4 w-4" /> Emitir folha
        </button>

        <button
          type="button"
          onClick={() => setEditando(true)}
          className="focus-ring inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-accent-soft to-accent px-4 py-2 text-[13px] text-white shadow-glow transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <Pencil className="h-4 w-4" /> Editar
        </button>
      </div>

      {/* Números */}
      <section className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="Salário"
          value={custo == null ? "A informar" : formatCurrency(custo)}
          hint={custo === 0 ? "Só comissão" : custo == null ? "Preencha na edição" : "por mês"}
          tom={custo == null ? "warning" : undefined}
        />

        <StatCard
          icon={<Percent className="h-4 w-4" />}
          label="Comissão"
          value={funcionario.ganhaComissao
            ? (funcionario.comissaoPercentual != null ? `${formatNumber(funcionario.comissaoPercentual)}%` : "A definir")
            : "Não"}
          hint={funcionario.ganhaComissao ? "sobre o que vender" : undefined}
        />

        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Batidas"
          value={formatNumber(pontos.length)}
          hint={funcionario.batePonto ? `em ${formatNumber(dias.length)} ${dias.length === 1 ? "dia" : "dias"}` : "não bate ponto"}
        />

        <StatCard
          icon={acesso?.root ? <Crown className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          label="Acesso"
          value={!acesso ? "Sem acesso" : acesso.root ? "Master" : acesso.permissao === "ADMIN" ? "Admin" : "Vendedor"}
          hint={acesso ? (acesso.status === "ATIVO" ? "liberado" : "desativado") : "não entra no sistema"}
          tom={acesso && acesso.status !== "ATIVO" ? "danger" : undefined}
        />
      </section>

      <section className="grid min-h-0 grid-cols-1 gap-3 xl:grid-cols-2">
        {/* ---------- Ficha ---------- */}
        <Cartao>
          <div className="flex items-center gap-3 border-b border-fg/[0.07] px-5 py-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/[0.14] text-accent-soft ring-1 ring-inset ring-accent/20">
              <IdCard className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[13px] text-ink">Ficha</h2>
              <p className="text-[11px] text-faint">
                {funcionario.ativo ? "Trabalha aqui" : "Desligado"} · {funcionario.batePonto ? "bate ponto" : "sem controle de horário"}
              </p>
            </div>
            {!funcionario.ativo && <Selo tom="neutro">Desligado</Selo>}
          </div>

          <div className="flex flex-col divide-y divide-fg/[0.04]">
            <Dado icon={<IdCard size={13} />} label="CPF" valor={funcionario.cpf ? maskCpfCnpj(funcionario.cpf) : ""} />
            <Dado
              icon={<Cake size={13} />}
              label="Nascimento"
              valor={funcionario.dataNascimento ? new Date(`${funcionario.dataNascimento}T00:00:00`).toLocaleDateString("pt-BR") : ""}
            />
            <Dado icon={<Briefcase size={13} />} label="Cargo" valor={funcionario.cargo} />
            <Dado icon={<Wallet size={13} />} label="Salário" valor={custo == null ? "" : formatCurrency(custo)} />
            <Dado
              icon={<Percent size={13} />}
              label="Comissão"
              valor={funcionario.ganhaComissao
                ? (funcionario.comissaoPercentual != null ? `${formatNumber(funcionario.comissaoPercentual)}% sobre as vendas` : "Sim, percentual a definir")
                : "Não recebe"}
            />
            <Dado icon={<ShieldCheck size={13} />} label="E-mail" valor={acesso?.email} />
          </div>
        </Cartao>

        {/* ---------- Extrato de ponto ---------- */}
        <Cartao>
          <div className="flex items-center gap-3 border-b border-fg/[0.07] px-5 py-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/[0.14] text-accent-soft ring-1 ring-inset ring-accent/20">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[13px] text-ink">Histórico de ponto</h2>
              <p className="text-[11px] text-faint">
                {pontos.length === 0 ? "Nada registrado" : `${formatNumber(pontos.length)} batidas · mais recentes primeiro`}
              </p>
            </div>
          </div>

          {!funcionario.batePonto ? (
            <p className="px-5 py-8 text-center text-[12px] leading-[17px] text-faint">
              Esta pessoa não bate ponto. Ligue a chave na edição para ela passar a registrar pelo link.
            </p>
          ) : dias.length === 0 ? (
            <p className="px-5 py-8 text-center text-[12px] leading-[17px] text-faint">
              Nenhuma batida ainda. Passe o link do ponto para ela — está em Funcionários, no botão “Ponto”.
            </p>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              {dias.map((dia) => (
                <div key={dia.data} className="border-b border-fg/[0.04] last:border-0">
                  <p className="sticky top-0 z-10 bg-surface/85 px-5 py-1.5 text-[10.5px] uppercase tracking-[0.1em] text-faint backdrop-blur">
                    {dia.data}
                  </p>

                  {dia.registros.map((p) => {
                    const quando = new Date(p.momento);
                    const tom = PONTO_LABEL[p.tipo].tom;

                    return (
                      <div key={p.id} className="flex items-center gap-2.5 px-5 py-2">
                        <span className={`w-[128px] shrink-0 text-[12px] ${tom === "entrada" ? "text-success" : tom === "saida" ? "text-warning" : "text-mist"}`}>
                          {PONTO_LABEL[p.tipo].texto}
                        </span>

                        <span className="shrink-0 text-[13px] tabular-nums text-ink">
                          {quando.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>

                        <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
                          {/* A distância só aparece no ponto batido pelo link:
                              o lançado pelo gestor não tem coordenada, e um
                              "—" ali sugeriria dado faltando. */}
                          {p.distanciaMetros != null && (
                            <span className="flex shrink-0 items-center gap-1 text-[11px] tabular-nums text-faint">
                              <MapPin size={11} /> {formatNumber(p.distanciaMetros)} m
                            </span>
                          )}

                          {p.fotoUrl ? (
                            <button
                              type="button"
                              onClick={() => setFoto(p.fotoUrl)}
                              title="Ver a foto do momento"
                              className="focus-ring h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-fg/[0.08]"
                            >
                              <img src={p.fotoUrl} alt="" className="h-full w-full object-cover" />
                            </button>
                          ) : (
                            <span className="shrink-0 text-[10.5px] text-faint">
                              {p.origem === "PUBLICO" ? <Camera size={12} /> : "lançado"}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </Cartao>
      </section>

      {/*
        O que esta tela ainda NÃO faz.
        Fica escrito para ninguém somar de cabeça um número que o sistema não
        calculou — que é o erro que uma tela de folha pela metade provoca.
      */}
      <p className="flex shrink-0 items-start gap-2 rounded-xl border border-fg/[0.07] bg-fg/[0.02] px-4 py-3 text-[11.5px] leading-[16px] text-faint">
        <AlertTriangle size={14} className="mt-px shrink-0" />
        A comissão sobre as vendas do mês e as horas trabalhadas contra a jornada ainda não são calculadas — o salário acima é o valor cadastrado, não o total a pagar.
      </p>

      {/* ---------- Modais ---------- */}
      <Modal
        open={editando}
        onClose={() => setEditando(false)}
        title={funcionario.nome}
        subtitle="Dados e acesso ao sistema"
        size="lg"
        maxWidth="sm:max-w-3xl"
      >
        {editando && (
          <FuncionarioForm
            funcionario={funcionario}
            areas={equipe?.areas ?? []}
            ehRoot={Boolean(acesso?.root)}
            podeCriarAcesso={Boolean(equipe?.podeAdicionar)}
            onCancel={() => setEditando(false)}
            onMudou={async (fechar) => {
              await carregar();
              if (fechar) setEditando(false);
            }}
          />
        )}
      </Modal>

      {/* A foto em tamanho de verdade: no extrato ela tem 32px, e reconhecer
          alguém em 32px não é possível. */}
      <Modal open={Boolean(foto)} onClose={() => setFoto(null)} title="Foto do ponto" size="sm">
        {foto && <img src={foto} alt="Foto registrada no ponto" className="w-full rounded-xl" />}
      </Modal>
    </PageScreen>
  );
};

export default FuncionarioDetalhe;
