import { useMemo, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Camera,
  Trash2,
  Lock,
  Shield,
  Building2,
  Crown,
  Receipt,
  Users,
  CalendarDays,
  FileText,
  ArrowUpRight,
} from "lucide-react";
import useAuth from "../../../store/auth.store";
import useEnterprise from "../../../store/enterprise.store";
import { useAlert } from "../../../components/Alert/Alert";
import Field from "../../../components/Input/Field";

import { formatDocument, formatNumber } from "../../../utils/format";
import { SettingsCard, SaveRow, PasswordField, useSaver } from "../ui";
import { profileSchema, ProfileData, passwordSchema, PasswordData } from "../schema/profile.schema";

type EnterpriseLike = {
  nomeFantasia?: string;
  name?: string;
  nomeRepresentante?: string;
  cpfCnpj?: string;
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3 py-2">
    <span className="flex items-center gap-2 text-[12px] text-[#8a86b0]">
      <span className="text-[#6b66a0]">{icon}</span>
      {label}
    </span>
    <span className="min-w-0 truncate text-[12px] font-medium text-[#e8e4ff]">{value}</span>
  </div>
);

const EnterpriseAside = () => {
  const { enterprise } = useEnterprise();
  const alert = useAlert();
  const ent = (enterprise ?? {}) as EnterpriseLike;
  const nome = ent.nomeFantasia || ent.name || "Sua empresa";
  const doc = ent.cpfCnpj ? formatDocument(ent.cpfCnpj) : "—";
  const representante = ent.nomeRepresentante || "—";

  const usados = 8;
  const limite = 10;
  const pct = Math.min(100, Math.round((usados / limite) * 100));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Identidade da Empresa */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#15132a] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#7c6ef5]/30 bg-gradient-to-br from-[#7c6ef5]/25 to-[#a78bfa]/10">
            <Building2 className="h-5 w-5 text-[#b7aef9]" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#f1eeff]">{nome}</p>
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-[#0f6e56]/25 px-2 py-0.5 text-[10px] font-medium text-[#5dcaa5] ring-1 ring-[#5dcaa5]/25">
              <span className="h-1.5 w-1.5 rounded-full bg-[#5dcaa5]" /> Conta ativa
            </span>
          </div>
        </div>

        <div className="mt-3 flex flex-col divide-y divide-white/[0.05]">
          <InfoRow icon={<FileText size={14} />} label="CNPJ" value={doc} />
          <InfoRow icon={<User size={14} />} label="Representante" value={representante} />
          <InfoRow icon={<CalendarDays size={14} />} label="Membro desde" value="Mar 2024" />
        </div>
      </div>

      {/* Plano Pro */}
      <div className="rounded-2xl border border-[#7c6ef5]/20 bg-gradient-to-b from-[#7c6ef5]/[0.08] to-[#15132a] p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium text-[#f1eeff]">
            <Crown size={16} className="text-[#f5c96b]" /> Plano Pro
          </span>
          <span className="rounded-full bg-[#7c6ef5]/20 px-2 py-0.5 text-[10px] font-medium text-[#c4baff] ring-1 ring-[#7c6ef5]/30">
            Mensal
          </span>
        </div>

        <div className="mb-2 flex items-center justify-between text-[12px]">
          <span className="flex items-center gap-2 text-[#8a86b0]">
            <Users size={14} className="text-[#6b66a0]" /> Colaboradores
          </span>
          <span className="tabular-nums text-[#e8e4ff]">
            {usados} de {limite}
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#7c6ef5] to-[#a78bfa]"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <span className="block text-[10px] uppercase tracking-wide text-[#6b66a0]">Valor</span>
            <span className="text-[13px] font-medium text-[#e8e4ff]">R$ 149/mês</span>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <span className="block text-[10px] uppercase tracking-wide text-[#6b66a0]">Próx. cobrança</span>
            <span className="text-[13px] font-medium text-[#e8e4ff]">12/08</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => alert.info("Plano", "A gestão de plano ainda será integrada.")}
          className="mt-4 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.05] py-2 text-[12px] font-medium text-[#c4baff] hover:bg-white/[0.1]"
        >
          Gerenciar plano <ArrowUpRight size={13} />
        </button>
      </div>

      {/* Ver faturas */}
      <button
        type="button"
        onClick={() => alert.info("Faturas", "O histórico de faturas ainda será integrado.")}
        className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#15132a] p-4 text-left hover:bg-white/[0.03]"
      >
        <span className="flex items-center gap-3 text-[13px] text-[#e8e4ff]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7c6ef5]/[0.15]">
            <Receipt size={16} className="text-[#9b8ff5]" />
          </span>
          Ver faturas
        </span>
        <ArrowUpRight size={16} className="text-[#6b66a0]" />
      </button>
    </div>
  );
};

const MAX_PHOTO = 2 * 1024 * 1024;

const ProfilePage = () => {
  const { user } = useAuth();
  const alert = useAlert();
  const profileSaver = useSaver();
  const pwdSaver = useSaver();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(user?.image ?? null);
  const [showPwd, setShowPwd] = useState(false);

  const {
    register: regProfile,
    handleSubmit: submitProfile,
    watch: watchProfile,
  } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.nome ?? "",
      email: user?.email ?? "",
      phone: formatNumber(String(user?.phone ?? "")),
      role: user?.cargo ?? "",
    },
  });

  const {
    control,
    handleSubmit: submitPwd,
    reset: resetPwd,
    watch: watchPwd,
    formState: { errors: pwdErrors },
  } = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: "", next: "", confirm: "" },
  });

  const nameValue = watchProfile("name");
  const initials = useMemo(
    () =>
      nameValue
        ?.split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase() || "U",
    [nameValue],
  );

  const pwdValues = watchPwd();
  const canUpdatePwd = Boolean(pwdValues.current && pwdValues.next && pwdValues.next === pwdValues.confirm);

  const onPick = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file || file.size > MAX_PHOTO) {
      if (file) alert.warning("Imagem muito grande", "Escolha uma imagem de até 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const regPhone = regProfile("phone");

  const onProfileValid = async () => {
    await profileSaver.save();
    alert.success("Perfil atualizado", "Suas informações foram salvas.");
  };

  const onPwdValid = async () => {
    await pwdSaver.save();
    alert.success("Senha atualizada", "Sua senha foi alterada com sucesso.");
    resetPwd({ current: "", next: "", confirm: "" });
  };

  const onInvalid = () => alert.error("Campos inválidos", "Revise os campos destacados.");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto xl:grid-cols-12">
        {/* Coluna Principal */}
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-8">
          <SettingsCard
            icon={<User className="h-4 w-4" />}
            title="Meu perfil"
            desc="Foto e informações pessoais."
            footer={
              <SaveRow
                {...profileSaver}
                onSave={submitProfile(onProfileValid, onInvalid)}
                savedLabel="Perfil atualizado"
              />
            }
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex shrink-0 flex-col items-center gap-2">
                {photo ? (
                  <img
                    src={photo}
                    alt="Foto"
                    className="h-24 w-24 rounded-2xl border border-[#7c6ef5]/40 object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-[#7c6ef5]/40 bg-gradient-to-br from-[#534AB7] to-[#a78bfa] text-2xl font-semibold text-white">
                    {initials}
                  </div>
                )}
                <div className="flex gap-1.5">
                  <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.06] px-3 py-1.5 text-[12px] text-[#c4baff] hover:bg-white/[0.12]"
                  >
                    <Camera size={14} /> Trocar
                  </button>
                  {photo && (
                    <button
                      type="button"
                      onClick={() => setPhoto(null)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#e24b4a]/25 bg-[#a22d2d]/20 px-3 py-1.5 text-[12px] text-[#f09595] hover:bg-[#a22d2d]/30"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                <Field label="Nome completo" icon={<User size={15} />} {...regProfile("name")} />
                <Field label="E-mail" icon={<Mail size={15} />} type="email" {...regProfile("email")} />
                <Field
                  label="Telefone"
                  icon={<Phone size={15} />}
                  {...regPhone}
                  onChange={(e) => {
                    e.target.value = formatNumber(e.target.value);
                    regPhone.onChange(e);
                  }}
                />
                <Field
                  label="Cargo"
                  icon={<Briefcase size={15} />}
                  hint="Definido pela empresa"
                  disabled
                  readOnly
                  {...regProfile("role")}
                />
              </div>
            </div>
          </SettingsCard>

          <SettingsCard
            icon={<Lock className="h-4 w-4" />}
            title="Alterar senha"
            desc="Use uma senha forte e única."
            footer={
              <SaveRow
                {...pwdSaver}
                onSave={submitPwd(onPwdValid, onInvalid)}
                label="Atualizar senha"
                savedLabel="Senha atualizada"
                icon={<Shield className="h-4 w-4" />}
                variant="secondary"
                disabled={!canUpdatePwd}
              />
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Controller
                control={control}
                name="current"
                render={({ field }) => (
                  <PasswordField
                    label="Senha atual"
                    {...field}
                    show={showPwd}
                    onToggle={() => setShowPwd((v) => !v)}
                    error={pwdErrors.current?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="next"
                render={({ field }) => (
                  <PasswordField
                    label="Nova senha"
                    {...field}
                    show={showPwd}
                    onToggle={() => setShowPwd((v) => !v)}
                    error={pwdErrors.next?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="confirm"
                render={({ field }) => (
                  <PasswordField
                    label="Confirmar"
                    {...field}
                    show={showPwd}
                    onToggle={() => setShowPwd((v) => !v)}
                    error={pwdErrors.confirm?.message}
                  />
                )}
              />
            </div>
          </SettingsCard>
        </div>

        {/* Aside */}
        <aside className="min-w-0 xl:col-span-4">
          <EnterpriseAside />
        </aside>
      </div>
    </div>
  );
};

export default ProfilePage;
