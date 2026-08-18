import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Clock, Copy, Check, Loader2, MapPin, RotateCw, Link2, AlertTriangle, ListChecks, Camera,
} from "lucide-react";

import PontoService, { type ConfigPonto, type HorarioDia } from "@/features/ponto/services/ponto.service";
import { DIAS_SEMANA } from "@/shared/domain/funcionario";
import { SwitchField } from "@/shared/ui/form/FormKit";
import { useAlert } from "@/shared/ui/Alert";
import { useBuscaCep } from "@/shared/hooks/useBuscaCep";
import { maskCep } from "@/shared/validation/masks";
import { coordenadaDoEndereco, gpsDisponivel, pedirPosicao } from "@/shared/utils/geo";

/**
 * Onde a empresa configura o ponto que os funcionários batem pelo link.
 *
 * ---------------------------------------------------------------------------
 * Por que ABAS
 * ---------------------------------------------------------------------------
 * Eram quatro assuntos numa rolagem só — o link, a localização com os dois
 * caminhos de captura, a semana inteira de funcionamento e as regras. Junto,
 * isso passava de três telas de altura: quem descia até o horário perdia de
 * vista o link que tinha acabado de copiar, e a localização — a única coisa
 * que TRAVA o ponto quando falta — ficava no meio, sem destaque nenhum.
 *
 * A ordem das abas é a ordem de quem está configurando pela primeira vez:
 * pega o link, diz onde a loja fica, diz quando ela abre, ajusta as regras.
 *
 * ---------------------------------------------------------------------------
 * Aqui o conteúdo pode ser DESMONTADO ao trocar de aba
 * ---------------------------------------------------------------------------
 * Diferente da ficha do cliente: lá cada campo é um `input` registrado no
 * react-hook-form, e desmontar arriscava o que foi digitado. Aqui o estado
 * inteiro vive num objeto só (`config`) no componente, acima das abas — a aba
 * é só o desenho. Por isso dá para usar `AnimatePresence` de verdade, com
 * saída animada, em vez de esconder por CSS.
 */

type Aba = "link" | "local" | "horario" | "regras";

const ABAS: { id: Aba; titulo: string; icone: typeof Link2 }[] = [
  { id: "link", titulo: "Link", icone: Link2 },
  { id: "local", titulo: "Local", icone: MapPin },
  { id: "horario", titulo: "Horário", icone: Clock },
  { id: "regras", titulo: "Regras", icone: ListChecks },
];

/** O horário com que um dia recém-marcado nasce. */
const PADRAO: Omit<HorarioDia, "diaSemana"> = { abre: "08:00", fecha: "18:00" };

const OPCOES_BATIDAS = [
  { valor: 2, rotulo: "2 — entrada e saída" },
  { valor: 4, rotulo: "4 — com intervalo de almoço" },
  { valor: 6, rotulo: "6 — com dois intervalos" },
];

/** Abre e fecha por altura — o bloco empurra o resto em vez de cobrir. */
const REVELA = {
  fechado: { opacity: 0, height: 0 },
  aberto: { opacity: 1, height: "auto" },
};

const PontoConfigPainel = () => {
  const alert = useAlert();
  const reduzir = useReducedMotion();

  const [aba, setAba] = useState<Aba>("link");

  const [config, setConfig] = useState<ConfigPonto | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [pegandoLocal, setPegandoLocal] = useState(false);

  /* A segunda via da coordenada — ver a nota em `shared/utils/geo`. */
  const { buscar: buscarCep, buscando: buscandoCep } = useBuscaCep();
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [buscandoEndereco, setBuscandoEndereco] = useState(false);
  const [ondeDeu, setOndeDeu] = useState("");

  /* Calculado no render, e não em estado: a resposta depende só do navegador e
     não muda no meio da sessão. */
  const gps = gpsDisponivel();

  useEffect(() => {
    PontoService.config()
      .then(setConfig)
      .catch((e) => alert.error("Não foi possível carregar", (e as Error).message))
      .finally(() => setCarregando(false));
  }, []);

  const url = config?.token ? `${window.location.origin}/ponto/${config.token}` : "";

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      alert.warning("Não foi possível copiar", "Selecione o endereço e copie à mão.");
    }
  };

  const renovar = async () => {
    const { confirmed } = await alert.confirm(
      "Gerar um link novo?",
      "O link atual para de funcionar na mesma hora. Quem já tiver o antigo — inclusive no mural da loja — precisa receber o novo.",
      { type: "warning", confirmText: "Gerar novo" },
    );

    if (!confirmed) return;

    try {
      setConfig(await PontoService.renovarLink());
      alert.success("Link novo gerado", "O anterior parou de funcionar.");
    } catch (e) {
      alert.error("Não foi possível gerar", (e as Error).message);
    }
  };

  /**
   * Caminho 1: a coordenada do próprio aparelho, com o gestor dentro da loja.
   *
   * É o melhor resultado quando funciona — um clique e a posição exata. Quando
   * não funciona, o motivo VAI para a tela em vez de virar um aviso genérico:
   * "permissão negada" e "a página não é https" pedem coisas diferentes de
   * quem está tentando.
   */
  const marcarLocalAtual = async () => {
    setPegandoLocal(true);
    setOndeDeu("");

    try {
      const { lat, lng } = await pedirPosicao();

      setConfig((c) => (c ? { ...c, latitude: lat, longitude: lng } : c));
      alert.success("Localização marcada", "Salve para valer. Faça isto de dentro da loja.");
    } catch (e) {
      alert.warning("Não foi possível usar o GPS", (e as Error).message);
    } finally {
      setPegandoLocal(false);
    }
  };

  /**
   * Caminho 2: pelo endereço escrito.
   *
   * O CEP preenche a rua e a cidade (ViaCEP); a coordenada vem de uma segunda
   * consulta, porque o ViaCEP não devolve latitude. Quem já tem o endereço na
   * cabeça pode digitá-lo direto e pular o CEP.
   */
  const preencherPeloCep = async () => {
    const achado = await buscarCep(cep);

    if (!achado) {
      alert.warning("CEP não encontrado", "Confira o número ou escreva o endereço à mão abaixo.");
      return;
    }

    setEndereco([achado.logradouro, achado.bairro, achado.cidade, achado.uf].filter(Boolean).join(", "));
  };

  const marcarPeloEndereco = async () => {
    setBuscandoEndereco(true);
    setOndeDeu("");

    try {
      const achado = await coordenadaDoEndereco(endereco);

      if (!achado) {
        alert.warning("Endereço não encontrado", "Tente incluir o número, o bairro e a cidade.");
        return;
      }

      setConfig((c) => (c ? { ...c, latitude: achado.coord.lat, longitude: achado.coord.lng } : c));

      /* O que o mapa entendeu volta para a tela: endereço aproximado é o risco
         desta via, e quem configurou precisa poder conferir antes de salvar. */
      setOndeDeu(achado.rotulo);
      alert.success("Localização marcada pelo endereço", "Confira o que o mapa encontrou e salve.");
    } finally {
      setBuscandoEndereco(false);
    }
  };

  const salvar = async () => {
    if (!config || salvando) return;

    setSalvando(true);

    try {
      setConfig(await PontoService.salvarConfig(config));
      alert.success("Configuração salva!", "");
    } catch (e) {
      alert.error("Não foi possível salvar", (e as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  /* ── Horários ─────────────────────────────────────────────────────────── */

  const diaMarcado = (valor: number) => config?.horarios.find((h) => h.diaSemana === valor);

  const alternarDia = (valor: number) =>
    setConfig((c) => {
      if (!c) return c;

      const tem = c.horarios.some((h) => h.diaSemana === valor);

      return {
        ...c,
        horarios: tem
          ? c.horarios.filter((h) => h.diaSemana !== valor)
          : [...c.horarios, { diaSemana: valor, ...PADRAO }].sort((a, b) => a.diaSemana - b.diaSemana),
      };
    });

  const mudarDia = (valor: number, campo: "abre" | "fecha", texto: string) =>
    setConfig((c) => (c ? { ...c, horarios: c.horarios.map((h) => (h.diaSemana === valor ? { ...h, [campo]: texto } : h)) } : c));

  if (carregando) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-mist">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
      </div>
    );
  }

  if (!config) {
    return <p className="py-8 text-center text-[12.5px] text-faint">Não foi possível carregar a configuração.</p>;
  }

  const semCerca = config.latitude == null || config.longitude == null;

  /**
   * O tique verde de cada aba — e o alerta da que está faltando.
   *
   * "Local" é a única que pode estar pendente de um jeito que QUEBRA o ponto:
   * sem coordenada o link recusa todo mundo. Por isso ela ganha um ponto
   * vermelho em vez de simplesmente não ter o tique — a diferença entre "ainda
   * não mexi" e "sem isto nada funciona" precisa aparecer na barra.
   */
  const pronta: Record<Aba, boolean> = {
    link: Boolean(config.token),
    local: !semCerca,
    horario: config.horarios.length > 0,
    regras: true,
  };

  return (
    <div className="flex flex-col gap-4">

      {/* ---------- Navegação ---------- */}
      {/*
        A pílula do destaque é UM elemento que se move, não um fundo que acende
        e apaga em cada botão — o mesmo `layoutId` das fichas de produto,
        funcionário e cliente. O olho segue para onde ela foi em vez de
        procurar o que mudou.
      */}
      <div className="grid grid-cols-4 gap-0.5 rounded-xl border border-fg/[0.07] bg-fg/[0.02] p-0.5">
        {ABAS.map((a) => {
          const Icone = a.icone;
          const on = a.id === aba;
          const alerta = a.id === "local" && semCerca;

          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setAba(a.id)}
              aria-current={on ? "step" : undefined}
              className="focus-ring relative flex min-h-[38px] cursor-pointer items-center justify-center gap-1.5 rounded-[10px] px-2 text-[12.5px] transition-colors"
            >
              {on && (
                <motion.span
                  layoutId="aba-ponto-config"
                  transition={reduzir ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 38 }}
                  className="absolute inset-0 rounded-[10px] bg-accent"
                />
              )}

              <span className={`relative flex items-center gap-1.5 ${on ? "text-white" : "text-mist"}`}>
                {pronta[a.id] && !on ? <Check size={13} className="text-faint" /> : <Icone size={13} className={on ? "" : "text-faint"} />}
                <span className={`min-w-0 truncate ${on ? "" : "hidden sm:inline"}`}>{a.titulo}</span>

                {/* O ponto só acende quando há mesmo o que resolver. */}
                {alerta && !on && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />}
              </span>
            </button>
          );
        })}
      </div>

      {/* ---------- Conteúdo ---------- */}
      {/*
        Altura fixa: sem ela o painel encolhe e cresce a cada troca de aba — o
        "Link" tem três linhas, o "Horário" tem sete — e o botão de salvar sobe
        e desce debaixo do cursor.
      */}
      <div className="relative h-[54dvh] overflow-y-auto overflow-x-hidden pr-1 sm:h-[364px]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            /* A `key` é o que faz o framer entender que é OUTRO conteúdo, e não
               o mesmo mudando. Sem ela não há saída nem entrada. */
            key={aba}
            initial={reduzir ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduzir ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="flex flex-col gap-3"
          >

            {/* ═════════════════════════ Link ═════════════════════════ */}
            {aba === "link" && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2 rounded-lg border border-fg/[0.07] bg-fg/[0.02] p-3">
                  <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-faint">
                    <Link2 size={12} /> Link do ponto
                  </p>

                  <div className="flex items-center gap-1.5">
                    <input
                      value={url}
                      readOnly
                      onFocus={(e) => e.currentTarget.select()}
                      className="min-w-0 flex-1 rounded-lg border border-fg/[0.09] bg-transparent px-2.5 py-2 text-[12px] text-mist outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => void copiar()}
                      title="Copiar o link"
                      className="focus-ring flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border border-fg/[0.09] text-mist transition-colors hover:text-ink"
                    >
                      {/* O ícone troca de identidade ao copiar, e a troca é
                          animada: sem isso o "copiei mesmo?" só se responde
                          tentando colar em algum lugar. */}
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={copiado ? "ok" : "copiar"}
                          initial={reduzir ? false : { opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={reduzir ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
                          transition={{ duration: 0.14 }}
                        >
                          {copiado ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                        </motion.span>
                      </AnimatePresence>
                    </button>

                    <button
                      type="button"
                      onClick={() => void renovar()}
                      title="Gerar um link novo (revoga o atual)"
                      className="focus-ring flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg border border-fg/[0.09] text-mist transition-colors hover:text-ink"
                    >
                      <RotateCw size={14} />
                    </button>
                  </div>
                </div>

                <p className="text-[11.5px] leading-[17px] text-faint">
                  Cole no mural ou mande no grupo. Quem abrir informa o CPF, tira a foto e bate — sem conta, sem senha e sem ocupar vaga do plano.
                </p>

                <p className="flex items-start gap-2 rounded-lg border border-fg/[0.07] bg-fg/[0.02] px-3 py-2.5 text-[11.5px] leading-[16px] text-faint">
                  <RotateCw size={13} className="mt-px shrink-0" />
                  Se o link vazar, gere um novo pelo botão ao lado do endereço. O antigo para de funcionar na mesma hora.
                </p>

                {/* O aviso é um ATALHO: ele diz o que falta e leva até lá. Um
                    alerta que só informa obriga a procurar a aba certa. */}
                <AnimatePresence initial={false}>
                  {semCerca && (
                    <motion.div
                      variants={reduzir ? undefined : REVELA}
                      initial="fechado"
                      animate="aberto"
                      exit="fechado"
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => setAba("local")}
                        className="focus-ring flex w-full items-start gap-2 rounded-lg border border-danger/30 bg-danger/[0.07] px-3 py-2.5 text-left text-[11.5px] leading-[16px] text-danger transition-colors hover:bg-danger/[0.12]"
                      >
                        <AlertTriangle size={13} className="mt-px shrink-0" />
                        <span>
                          O link ainda não funciona: falta marcar onde a loja fica. <span className="underline">Configurar agora</span>
                        </span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ═════════════════════════ Local ═════════════════════════ */}
            {aba === "local" && (
              <div className="flex flex-col gap-3">
                <AnimatePresence initial={false}>
                  {semCerca && (
                    <motion.p
                      variants={reduzir ? undefined : REVELA}
                      initial="fechado"
                      animate="aberto"
                      exit="fechado"
                      transition={{ duration: 0.18 }}
                      className="flex items-start gap-2 overflow-hidden rounded-lg border border-warning/30 bg-warning/[0.08] px-3 py-2.5 text-[11.5px] leading-[16px] text-warning"
                    >
                      <AlertTriangle size={13} className="mt-px shrink-0" />
                      Sem a localização marcada, o link recusa todo mundo. Marque de dentro da loja.
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* ---------- Caminho 1: o GPS ---------- */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void marcarLocalAtual()}
                    disabled={pegandoLocal || !gps.ok}
                    title={gps.ok ? undefined : gps.motivo}
                    className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-fg/[0.09] px-3 py-2 text-[12.5px] text-mist transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {pegandoLocal ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                    {semCerca ? "Usar minha localização" : "Atualizar pela minha localização"}
                  </button>

                  {/* A coordenada entra animada: é o retorno de que o clique fez
                      alguma coisa, num painel onde nada mais se move. */}
                  <AnimatePresence initial={false}>
                    {!semCerca && (
                      <motion.span
                        key={`${config.latitude}-${config.longitude}`}
                        initial={reduzir ? false : { opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="nums text-[11.5px] text-faint"
                      >
                        {config.latitude!.toFixed(5)}, {config.longitude!.toFixed(5)}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                {/*
                  O motivo de o GPS não servir fica À VISTA, não num alerta que
                  some. O caso mais comum — a página aberta por `http://` no IP
                  da rede — não gera erro nenhum no navegador: ele simplesmente
                  nunca responde. Sem esta linha, o botão parece quebrado.
                */}
                {!gps.ok && (
                  <p className="rounded-lg border border-fg/[0.07] bg-fg/[0.02] px-3 py-2 text-[11.5px] leading-[16px] text-faint">
                    {gps.motivo}
                  </p>
                )}

                {/* ---------- Caminho 2: o endereço ---------- */}
                <div className="flex flex-col gap-2 rounded-lg border border-fg/[0.07] bg-fg/[0.02] p-2.5">
                  <p className="text-[11px] uppercase tracking-[0.08em] text-faint">Ou marque pelo endereço</p>

                  <div className="flex items-center gap-1.5">
                    <input
                      value={cep}
                      onChange={(e) => setCep(maskCep(e.target.value))}
                      inputMode="numeric"
                      placeholder="CEP"
                      className="nums w-[104px] shrink-0 rounded-lg border border-fg/[0.09] bg-transparent px-2.5 py-2 text-[12.5px] text-ink outline-none transition-colors focus:border-accent/60 placeholder:text-faint"
                    />
                    <button
                      type="button"
                      onClick={() => void preencherPeloCep()}
                      disabled={buscandoCep}
                      className="focus-ring shrink-0 cursor-pointer rounded-lg border border-fg/[0.09] px-2.5 py-2 text-[12px] text-mist transition-colors hover:text-ink disabled:opacity-50"
                    >
                      {buscandoCep ? <Loader2 size={13} className="animate-spin" /> : "Buscar"}
                    </button>
                  </div>

                  <input
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Rua, número, bairro, cidade"
                    className="w-full rounded-lg border border-fg/[0.09] bg-transparent px-2.5 py-2 text-[12.5px] text-ink outline-none transition-colors focus:border-accent/60 placeholder:text-faint"
                  />

                  <button
                    type="button"
                    onClick={() => void marcarPeloEndereco()}
                    disabled={buscandoEndereco || endereco.trim().length < 6}
                    className="focus-ring inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-fg/[0.09] px-3 py-2 text-[12.5px] text-mist transition-colors hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {buscandoEndereco ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                    Marcar por este endereço
                  </button>

                  {/* O que o mapa entendeu volta para conferência: endereço
                      aproximado é o risco desta via, e um erro aqui recusa a
                      equipe inteira. */}
                  <AnimatePresence initial={false}>
                    {ondeDeu && (
                      <motion.p
                        variants={reduzir ? undefined : REVELA}
                        initial="fechado"
                        animate="aberto"
                        exit="fechado"
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden rounded-lg border border-success/25 bg-success/[0.07] px-2.5 py-2 text-[11.5px] leading-[16px] text-mist"
                      >
                        O mapa encontrou: <span className="text-ink">{ondeDeu}</span>
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <label className="flex items-center gap-2.5">
                  <span className="shrink-0 text-[12.5px] text-mist">Aceita até</span>
                  <input
                    type="number"
                    min={20}
                    max={5000}
                    step={10}
                    value={config.raioMetros}
                    onChange={(e) => setConfig({ ...config, raioMetros: Number(e.target.value) })}
                    className="nums w-[92px] rounded-lg border border-fg/[0.09] bg-transparent px-2.5 py-1.5 text-[12.5px] text-ink outline-none transition-colors focus:border-accent/60"
                  />
                  <span className="shrink-0 text-[12.5px] text-mist">metros da loja</span>
                </label>

                <p className="text-[11px] leading-[15px] text-faint">
                  O GPS do celular erra de 20 a 50 m dentro de prédios. Um raio muito curto recusa quem está no balcão.
                </p>
              </div>
            )}

            {/* ═════════════════════════ Horário ═════════════════════════ */}
            {aba === "horario" && (
              <div className="flex flex-col gap-2">
                <p className="text-[11.5px] leading-[16px] text-faint">
                  Fora do horário o link recusa o ponto. Sem nenhum dia marcado, aceita a qualquer hora.
                </p>

                <div className="flex flex-col gap-1.5">
                  {DIAS_SEMANA.map((dia) => {
                    const marcado = diaMarcado(dia.valor);

                    return (
                      <div key={dia.valor} className={`rounded-lg border px-2.5 py-2 transition-colors ${marcado ? "border-fg/[0.1] bg-fg/[0.03]" : "border-fg/[0.06]"}`}>
                        <label className="flex cursor-pointer items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={Boolean(marcado)}
                            onChange={() => alternarDia(dia.valor)}
                            className="h-3.5 w-3.5 shrink-0 accent-[rgb(var(--accent))]"
                          />
                          <span className={`w-[62px] shrink-0 text-[12.5px] ${marcado ? "text-ink" : "text-faint"}`}>{dia.longo}</span>

                          {/* Os horários abrem POR LARGURA ao marcar o dia, em
                              vez de aparecerem prontos: a linha cresce e o olho
                              acompanha até onde digitar. */}
                          <AnimatePresence mode="wait" initial={false}>
                            {marcado ? (
                              <motion.span
                                key="horas"
                                initial={reduzir ? false : { opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={reduzir ? undefined : { opacity: 0, width: 0 }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                                className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap"
                              >
                                <input
                                  type="time"
                                  value={marcado.abre}
                                  onChange={(e) => mudarDia(dia.valor, "abre", e.target.value)}
                                  className="nums rounded-md border border-fg/[0.09] bg-transparent px-1.5 py-1 text-[12px] text-ink outline-none focus:border-accent/60"
                                />
                                <span className="text-[11.5px] text-faint">às</span>
                                <input
                                  type="time"
                                  value={marcado.fecha}
                                  onChange={(e) => mudarDia(dia.valor, "fecha", e.target.value)}
                                  className="nums rounded-md border border-fg/[0.09] bg-transparent px-1.5 py-1 text-[12px] text-ink outline-none focus:border-accent/60"
                                />
                              </motion.span>
                            ) : (
                              <motion.span
                                key="fechado"
                                initial={reduzir ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.14 }}
                                className="text-[11.5px] text-faint"
                              >
                                fechado
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═════════════════════════ Regras ═════════════════════════ */}
            {aba === "regras" && (
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] uppercase tracking-[0.08em] text-faint">Batidas por dia</span>
                  <select
                    value={config.pontosPorDia}
                    onChange={(e) => setConfig({ ...config, pontosPorDia: Number(e.target.value) })}
                    className="w-full cursor-pointer rounded-lg border border-fg/[0.09] bg-transparent px-3 py-2 text-[13px] text-ink outline-none transition-colors focus:border-accent/60 [&>option]:bg-surface"
                  >
                    {OPCOES_BATIDAS.map((o) => (
                      <option key={o.valor} value={o.valor}>{o.rotulo}</option>
                    ))}
                  </select>
                </label>

                {/*
                  A sequência resultante, desenhada.
                  É mais rápida de conferir do que a regra escrita ("a primeira
                  é entrada, a última é saída…") e muda junto com o seletor —
                  ver a escolha virar as batidas de verdade é o que evita
                  descobrir o engano só na primeira batida do funcionário.
                */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {Array.from({ length: config.pontosPorDia }).map((_, i) => {
                    const rotulo = i === 0
                      ? "Entrada"
                      : i === config.pontosPorDia - 1
                        ? "Saída"
                        : i % 2 === 1 ? "Sai p/ intervalo" : "Volta";

                    return (
                      <motion.span
                        /* A `key` inclui o total: trocar de 2 para 4 remonta as
                           pílulas e a entrada em cascata acontece de novo. */
                        key={`${config.pontosPorDia}-${i}`}
                        initial={reduzir ? false : { opacity: 0, scale: 0.9, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.16, delay: reduzir ? 0 : i * 0.04 }}
                        className="rounded-full border border-fg/[0.09] bg-fg/[0.03] px-2.5 py-1 text-[11px] text-mist"
                      >
                        {i + 1}. {rotulo}
                      </motion.span>
                    );
                  })}
                </div>

                <SwitchField
                  label="Exigir foto"
                  hint="A selfie do momento é o que sustenta o registro numa discussão. Desligue só se os aparelhos da equipe não tiverem câmera."
                  checked={config.exigeFoto}
                  onChange={(v) => setConfig({ ...config, exigeFoto: v })}
                />

                <AnimatePresence initial={false}>
                  {!config.exigeFoto && (
                    <motion.p
                      variants={reduzir ? undefined : REVELA}
                      initial="fechado"
                      animate="aberto"
                      exit="fechado"
                      transition={{ duration: 0.18 }}
                      className="flex items-start gap-2 overflow-hidden rounded-lg border border-warning/30 bg-warning/[0.08] px-3 py-2.5 text-[11.5px] leading-[16px] text-warning"
                    >
                      <Camera size={13} className="mt-px shrink-0" />
                      Sem foto, o registro fica apoiado só na coordenada e no CPF — e o CPF de um colega qualquer um sabe.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* O salvar fica FORA das abas: ele grava a configuração inteira, não a
          aba aberta. Dentro de uma delas, pareceria salvar só aquele pedaço. */}
      <button
        type="button"
        onClick={() => void salvar()}
        disabled={salvando}
        className="focus-ring inline-flex min-h-[38px] cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-accent-soft to-accent px-4 text-[12.5px] text-white shadow-glow transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
      >
        {salvando ? <Loader2 size={14} className="animate-spin" /> : null}
        Salvar configuração
      </button>
    </div>
  );
};

export default PontoConfigPainel;
