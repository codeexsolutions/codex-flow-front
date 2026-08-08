import { useEffect, useMemo } from "react";
import { useForm, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BadgeCheck, Cake, Home, IdCard, Mail, MapPin, MessageCircle, Phone, Search,
  Smartphone, Loader2, UserRound, Users,
} from "lucide-react";

import ClientType, { eSexo, eStatus, SEXO_LABEL } from "@/shared/domain/cliente";
import { Modal } from "@/shared/ui/Modal";
import { useAlert } from "@/shared/ui/Alert";
import { FormActions, FormSection, SelectBox, TextField } from "@/shared/ui/form/FormKit";
import { useBuscaCep } from "@/shared/hooks/useBuscaCep";
import { getInitials, onlyDigits } from "@/shared/utils/format";
import { maskCep, maskCpfCnpj, maskPhone, UFS } from "@/shared/validation/masks";
import { clienteSchema, type ClienteFormData, type ClienteFormInput } from "@/features/clientes/schema/cliente.schema";

/**
 * Ficha do cliente — a mesma no cadastro e na edição.
 *
 * Antes eram dois formulários: um com input próprio e tooltip de ajuda (o novo
 * cliente, aberto pelo PDV e pela lista) e outro montado no FormKit (a edição).
 * Divergiam nos rótulos, na máscara e até no que era obrigatório — e cada campo
 * novo precisava ser escrito duas vezes. Aqui é um só: `cliente` presente
 * significa edição.
 *
 * A regra da tela: **só o nome é obrigatório**. Documento, nascimento, sexo,
 * contato e endereço são o que se descobre sobre o cliente com o tempo — e o
 * medidor do topo mostra o quanto da ficha já existe, em vez de barrar o
 * cadastro por um campo que ninguém tem no balcão.
 */

const toDefaults = (c?: ClientType | null): ClienteFormInput => ({
  nome: c?.nome ?? "",
  cpfCnpj: c?.cpfCnpj ? maskCpfCnpj(c.cpfCnpj) : "",
  status: c?.status ?? eStatus.ATIVO,
  dataNascimento: c?.dataNascimento ?? "",
  sexo: c?.sexo ?? "",
  contato: {
    telefone: maskPhone(String(c?.contato?.telefone ?? "")),
    celular: maskPhone(String(c?.contato?.celular ?? "")),
    whatsapp: maskPhone(String(c?.contato?.whatsapp ?? "")),
    email: c?.contato?.email ?? "",
  },
  endereco: {
    cep: maskCep(String(c?.endereco?.cep ?? "")),
    logradouro: c?.endereco?.logradouro ?? "",
    numero: c?.endereco?.numero ?? "",
    complemento: c?.endereco?.complemento ?? "",
    bairro: c?.endereco?.bairro ?? "",
    cidade: c?.endereco?.cidade ?? "",
    uf: c?.endereco?.uf ?? "",
  },
});

type Props = {
  /** Padrão `true`: a lista e o PDV montam o formulário só quando ele abre. */
  open?: boolean;
  /** Presente = edição. Ausente = cadastro novo. */
  cliente?: ClientType | null;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (data: ClienteFormData) => void | Promise<void>;
};

const ClienteForm = ({ open = true, cliente, saving = false, onClose, onSubmit }: Props) => {
  const alert = useAlert();
  const { buscar, buscando } = useBuscaCep();
  const editando = Boolean(cliente);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ClienteFormInput, unknown, ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: toDefaults(cliente),
  });

  useEffect(() => {
    if (open) reset(toDefaults(cliente));
    // `cliente` é reconstruído a cada recarga da página; comparar por objeto
    // reabriria o formulário com os campos limpos no meio da digitação.
  }, [open, cliente?.id]);

  /** Aplica a máscara antes de entregar o valor ao react-hook-form. */
  const masked = (name: Path<ClienteFormInput>, mask: (v: string) => string) => {
    const reg = register(name);
    return {
      ...reg,
      onChange: (ev: React.ChangeEvent<HTMLInputElement>) => {
        ev.target.value = mask(ev.target.value);
        return reg.onChange(ev);
      },
    };
  };

  const valores = watch();

  /*
   * Medidor da ficha.
   *
   * Não é enfeite: com um único campo obrigatório, a pessoa precisa de algum
   * sinal de que vale a pena preencher o resto. O medidor responde isso sem
   * transformar nada em obrigatório.
   */
  const completude = useMemo(() => {
    const marcos = [
      Boolean(valores.cpfCnpj?.trim()),
      Boolean(valores.contato?.whatsapp?.trim() || valores.contato?.celular?.trim() || valores.contato?.telefone?.trim()),
      Boolean(valores.contato?.email?.trim()),
      Boolean(valores.dataNascimento?.trim()),
      Boolean(valores.endereco?.cidade?.trim() || valores.endereco?.logradouro?.trim() || valores.endereco?.cep?.trim()),
    ];
    return Math.round((marcos.filter(Boolean).length / marcos.length) * 100);
  }, [valores]);

  const nome = valores.nome?.trim() ?? "";

  const preencherPeloCep = async () => {
    const cep = onlyDigits(getValues("endereco.cep") ?? "");
    if (cep.length !== 8) {
      alert.warning("CEP incompleto", "Digite os 8 dígitos do CEP para buscarmos o endereço.");
      return;
    }

    const endereco = await buscar(cep);

    if (!endereco) {
      alert.warning("CEP não encontrado", "Confira o número ou preencha o endereço à mão.");
      return;
    }

    setValue("endereco.logradouro", endereco.logradouro, { shouldValidate: true });
    setValue("endereco.bairro", endereco.bairro, { shouldValidate: true });
    setValue("endereco.cidade", endereco.cidade, { shouldValidate: true });
    setValue("endereco.uf", endereco.uf, { shouldValidate: true });
  };

  const onInvalid = () => alert.error("Campos inválidos", "Revise os campos destacados e tente de novo.");

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title={editando ? "Editar cliente" : "Novo cliente"}
      subtitle={editando ? "Atualize a ficha e salve" : "Só o nome é obrigatório — o resto você completa quando souber"}
      size="lg"
      /*
       * Um pouco mais largo que o `lg` padrão (672px).
       *
       * A ficha tem catorze campos, e em 672px quase todos caíam em duas
       * colunas ou ocupavam a linha inteira — o formulário virava uma escada
       * de quinze andares que só terminava rolando. Em 768px cabem três
       * colunas de verdade, e cada seção passa a ocupar uma ou duas linhas.
       */
      maxWidth="sm:max-w-3xl"
    >
      <form onSubmit={handleSubmit((data) => onSubmit(data), onInvalid)} className="flex flex-col gap-5" noValidate>
        {/* ---------- Cabeçalho vivo: quem está sendo cadastrado ---------- */}
        {/* As iniciais e o medidor reagem à digitação: o formulário deixa de
            ser uma pilha de campos e passa a mostrar a ficha se formando. */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-fg/[0.07] bg-fg/[0.02] px-4 py-3.5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-gradient-to-br from-accent/25 to-accent-soft/10 text-[13px] text-accent-soft">
            {getInitials(nome)}
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] text-ink">{nome || "Novo cliente"}</p>
            <p className="mt-0.5 truncate text-[11.5px] text-faint">
              {editando ? "Editando a ficha" : "Novo cadastro"}
              {/* No celular não há largura para a barra ao lado; o número
                  sozinho mantém o retorno de "o quanto já preenchi". */}
              <span className="sm:hidden"> · {completude}% preenchida</span>
            </p>
          </div>

          {/* O medidor à direita, e não embaixo do nome: na largura nova ele
              cabe na mesma linha, e a faixa deixa de ter duas alturas. */}
          <div className="hidden w-[188px] shrink-0 sm:block">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] uppercase tracking-[0.12em] text-muted">Ficha</span>
              <span className="text-[11.5px] tabular-nums text-mist">{completude}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-fg/[0.07]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-soft to-accent transition-[width] duration-500"
                style={{ width: `${Math.max(completude, 4)}%` }}
              />
            </div>
          </div>
        </div>

        {/* ---------- Identificação ---------- */}
        {/*
          Documento, nascimento e sexo entram aqui, e não numa seção "Sobre o
          cliente" própria: são a mesma pergunta — quem é essa pessoa. Duas
          seções para cinco campos davam mais título do que conteúdo.
        */}
        <FormSection title="Identificação" icon={<UserRound className="h-3.5 w-3.5" />}>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <TextField
                label="Nome"
                icon={<Users className="h-3.5 w-3.5" />}
                placeholder="Como o cliente é chamado"
                hint="Único campo obrigatório"
                autoFocus={!editando}
                error={errors.nome?.message}
                {...register("nome")}
              />
            </div>

            <SelectBox label="Situação" icon={<BadgeCheck className="h-3.5 w-3.5" />} error={errors.status?.message} {...register("status")}>
              <option value={eStatus.ATIVO}>Ativo</option>
              <option value={eStatus.INATIVO}>Inativo</option>
            </SelectBox>
          </div>

          <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-3">
            <TextField
              label="CPF / CNPJ"
              icon={<IdCard className="h-3.5 w-3.5" />}
              placeholder="Deixe em branco se não tiver"
              inputMode="numeric"
              error={errors.cpfCnpj?.message}
              {...masked("cpfCnpj", maskCpfCnpj)}
            />

            {/* Nascimento e sexo não entram por burocracia: são o que permite
                felicitar no aniversário e entender para quem a loja vende. */}
            <TextField
              label="Nascimento"
              type="date"
              icon={<Cake className="h-3.5 w-3.5" />}
              hint="Vira lembrete de aniversário"
              max={new Date().toISOString().slice(0, 10)}
              error={errors.dataNascimento?.message}
              {...register("dataNascimento")}
            />

            <SelectBox label="Sexo" icon={<UserRound className="h-3.5 w-3.5" />} error={errors.sexo?.message} {...register("sexo")}>
              <option value="">Não informado</option>
              {Object.values(eSexo).map((s) => (
                <option key={s} value={s}>
                  {SEXO_LABEL[s]}
                </option>
              ))}
            </SelectBox>
          </div>
        </FormSection>

        {/* ---------- Contato ---------- */}
        {/* Os três números na mesma linha, na ordem em que a loja usa: o
            WhatsApp primeiro, que é por onde se fala com o cliente. */}
        <FormSection title="Contato" icon={<Phone className="h-3.5 w-3.5" />}>
          <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-3">
            <TextField label="WhatsApp" icon={<MessageCircle className="h-3.5 w-3.5" />} placeholder="(00) 00000-0000" inputMode="tel" error={errors.contato?.whatsapp?.message} {...masked("contato.whatsapp", maskPhone)} />
            <TextField label="Celular" icon={<Smartphone className="h-3.5 w-3.5" />} placeholder="(00) 00000-0000" inputMode="tel" error={errors.contato?.celular?.message} {...masked("contato.celular", maskPhone)} />
            <TextField label="Telefone" icon={<Phone className="h-3.5 w-3.5" />} placeholder="(00) 0000-0000" inputMode="tel" error={errors.contato?.telefone?.message} {...masked("contato.telefone", maskPhone)} />
          </div>

          <TextField label="E-mail" icon={<Mail className="h-3.5 w-3.5" />} placeholder="email@exemplo.com" inputMode="email" error={errors.contato?.email?.message} {...register("contato.email")} />
        </FormSection>

        {/* ---------- Endereço ---------- */}
        <FormSection title="Endereço" icon={<MapPin className="h-3.5 w-3.5" />}>
          {/* O CEP e o que ele preenche na mesma linha: digitar rua, bairro,
              cidade e UF à mão é onde o cadastro de endereço morre. */}
          <div className="grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-[172px_auto_minmax(0,1fr)_104px]">
            <TextField
              label="CEP"
              icon={<MapPin className="h-3.5 w-3.5" />}
              placeholder="00000-000"
              inputMode="numeric"
              error={errors.endereco?.cep?.message}
              {...masked("endereco.cep", maskCep)}
            />

            {/* `pt-[26px]` alinha o botão com a casca do campo, não com o
                rótulo que fica acima dela. */}
            <div className="pt-[26px]">
              <button
                type="button"
                onClick={preencherPeloCep}
                disabled={buscando}
                className="focus-ring inline-flex h-[42px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-fg/[0.09] px-3 text-[12.5px] text-mist transition-colors hover:bg-fg/[0.05] hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                {buscando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Buscar
              </button>
            </div>

            <TextField label="Logradouro" icon={<Home className="h-3.5 w-3.5" />} placeholder="Rua, avenida, travessa…" error={errors.endereco?.logradouro?.message} {...register("endereco.logradouro")} />
            <TextField label="Número" placeholder="123" error={errors.endereco?.numero?.message} {...register("endereco.numero")} />
          </div>

          <div className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_104px]">
            <TextField label="Complemento" placeholder="Apto, bloco" error={errors.endereco?.complemento?.message} {...register("endereco.complemento")} />
            <TextField label="Bairro" placeholder="Centro" error={errors.endereco?.bairro?.message} {...register("endereco.bairro")} />
            <TextField label="Cidade" placeholder="São Paulo" error={errors.endereco?.cidade?.message} {...register("endereco.cidade")} />

            <SelectBox label="UF" error={errors.endereco?.uf?.message} {...register("endereco.uf")}>
              <option value="">—</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </SelectBox>
          </div>
        </FormSection>

        <FormActions onCancel={onClose} saving={saving} submitText={editando ? "Salvar alterações" : "Cadastrar cliente"} />
      </form>
    </Modal>
  );
};

export default ClienteForm;