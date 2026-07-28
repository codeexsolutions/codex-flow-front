import { useMemo, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Mail, Phone, Briefcase, Camera, Trash2, Lock, Shield, Building2, Crown, Receipt, Users, CalendarDays, FileText, ArrowUpRight } from "lucide-react";
import useAuth from "@/features/auth/store/auth.store";
import useEnterprise from "@/features/empresa/store/enterprise.store";
import { useAlert } from "@/shared/ui/Alert";
import Field from "@/shared/ui/inputs/Field";

import { formatDocument, formatNumber } from "@/shared/utils/format";
import { SettingsCard, SaveRow, PasswordField, useSaver } from "@/features/config/components/ConfigUI";
import { profileSchema, type ProfileData, type ProfileInput, passwordSchema, type PasswordData } from "@/features/config/schema/profile.schema";

type EnterpriseLike = {
  nomeFantasia?: string;
  name?: string;
  nomeRepresentante?: string;
  cpfCnpj?: string;
};

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3 py-2">
    <span className="flex items-center gap-2 text-[12px] text-mist">
      <span className="text-faint">{icon}</span>
      {label}
    </span>
    <span className="min-w-0 truncate text-[12px] text-ink">{value}</span>
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
      <div className="card glass-sheen rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/25 to-accent-soft/10">
            <Building2 className="h-5 w-5 text-accent-soft" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm text-ink">{nome}</p>
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-success/25 px-2 py-0.5 text-[10px] text-success ring-1 ring-success/25">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Conta ativa
            </span>
          </div>
        </div>

        <div className="mt-3 flex flex-col divide-y divide-fg/[0.05]">
          <InfoRow icon={<FileText size={14} />} label="CNPJ" value={doc} />
          <InfoRow icon={<User size={14} />} label="Representante" value={representante} />
          <InfoRow icon={<CalendarDays size={14} />} label="Membro desde" value="Mar 2024" />
        </div>
      </div>

      {/* Plano Pro */}
      <div className="rounded-2xl border border-accent/20 bg-gradient-to-b from-accent/[0.08] to-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-ink">
            <Crown size={16} className="text-warning" /> Plano Pro
          </span>
          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] text-accent-soft ring-1 ring-accent/30">Mensal</span>
        </div>

        <div className="mb-2 flex items-center justify-between text-[12px]">
          <span className="flex items-center gap-2 text-mist">
            <Users size={14} className="text-faint" /> Colaboradores
          </span>
          <span className="tabular-nums text-ink">
            {usados} de {limite}
          </span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-fg/[0.06]">
          <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-soft" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-fg/[0.06] bg-fg/[0.02] p-3">
            <span className="block text-[10px] uppercase tracking-wide text-faint">Valor</span>
            <span className="text-[13px] text-ink">R$ 149/mês</span>
          </div>
          <div className="rounded-xl border border-fg/[0.06] bg-fg/[0.02] p-3">
            <span className="block text-[10px] uppercase tracking-wide text-faint">Próx. cobrança</span>
            <span className="text-[13px] text-ink">12/08</span>
          </div>
        </div>

        <button type="button" onClick={() => alert.info("Plano", "A gestão de plano ainda será integrada.")} className="mt-4 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-fg/[0.1] bg-fg/[0.05] py-2 text-[12px] text-accent-soft hover:bg-fg/[0.1]">
          Gerenciar plano <ArrowUpRight size={13} />
        </button>
      </div>

      {/* Ver faturas */}
      <button type="button" onClick={() => alert.info("Faturas", "O histórico de faturas ainda será integrado.")} className="flex cursor-pointer items-center justify-between gap-3 card glass-sheen rounded-2xl p-4 text-left hover:bg-fg/[0.03]">
        <span className="flex items-center gap-3 text-[13px] text-ink">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/[0.15]">
            <Receipt size={16} className="text-accent-soft" />
          </span>
          Ver faturas
        </span>
        <ArrowUpRight size={16} className="text-faint" />
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
  } = useForm<ProfileInput, unknown, ProfileData>({
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
        ?.split("")
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
          <SettingsCard icon={<User className="h-4 w-4" />} title="Meu perfil" desc="Foto e informações pessoais." footer={<SaveRow {...profileSaver} onSave={submitProfile(onProfileValid, onInvalid)} savedLabel="Perfil atualizado" />}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex shrink-0 flex-col items-center gap-2">
                {photo ? (
                  <img src={photo} alt="Foto" className="h-24 w-24 rounded-2xl border border-accent/40 object-cover" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-accent/40 bg-gradient-to-br from-accent-strong to-accent-soft text-2xl text-white">{initials}</div>
                )}
                <div className="flex gap-1.5">
                  <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
                  <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-lg border border-fg/[0.1] bg-fg/[0.06] px-3 py-1.5 text-[12px] text-accent-soft hover:bg-fg/[0.12]">
                    <Camera size={14} /> Trocar
                  </button>
                  {photo && (
                    <button type="button" onClick={() => setPhoto(null)} className="flex items-center gap-1.5 rounded-lg border border-danger/25 bg-danger/20 px-3 py-1.5 text-[12px] text-danger hover:bg-danger/30">
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
                <Field label="Cargo" icon={<Briefcase size={15} />} hint="Definido pela empresa" disabled readOnly {...regProfile("role")} />
              </div>
            </div>
          </SettingsCard>

          <SettingsCard
            icon={<Lock className="h-4 w-4" />}
            title="Alterar senha"
            desc="Use uma senha forte e única."
            footer={<SaveRow {...pwdSaver} onSave={submitPwd(onPwdValid, onInvalid)} label="Atualizar senha" savedLabel="Senha atualizada" icon={<Shield className="h-4 w-4" />} variant="secondary" disabled={!canUpdatePwd} />}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Controller control={control} name="current" render={({ field }) => <PasswordField label="Senha atual" {...field} show={showPwd} onToggle={() => setShowPwd((v) => !v)} error={pwdErrors.current?.message} />} />
              <Controller control={control} name="next" render={({ field }) => <PasswordField label="Nova senha" {...field} show={showPwd} onToggle={() => setShowPwd((v) => !v)} error={pwdErrors.next?.message} />} />
              <Controller control={control} name="confirm" render={({ field }) => <PasswordField label="Confirmar" {...field} show={showPwd} onToggle={() => setShowPwd((v) => !v)} error={pwdErrors.confirm?.message} />} />
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
