import { useMemo, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Mail, Phone, Briefcase, Camera, Trash2, Lock, Shield, CalendarDays } from "lucide-react";
import useAuth from "@/features/auth/store/auth.store";
import { useAlert } from "@/shared/ui/Alert";
import Field from "@/shared/ui/inputs/Field";

import { formatNumber } from "@/shared/utils/format";
import { SettingsCard, SaveRow, PasswordField, useSaver } from "@/features/config/components/ConfigUI";
import { profileSchema, type ProfileData, type ProfileInput, passwordSchema, type PasswordData } from "@/features/config/schema/profile.schema";

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
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-y-auto xl:grid-cols-2">
        {/* Perfil */}
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

        {/* Senha + Info da conta */}
        <div className="flex min-w-0 flex-col gap-5">
          <SettingsCard
            icon={<Lock className="h-4 w-4" />}
            title="Alterar senha"
            desc="Use uma senha forte e única."
            footer={<SaveRow {...pwdSaver} onSave={submitPwd(onPwdValid, onInvalid)} label="Atualizar senha" savedLabel="Senha atualizada" icon={<Shield className="h-4 w-4" />} variant="secondary" disabled={!canUpdatePwd} />}
          >
            <div className="grid grid-cols-1 gap-4">
              <Controller control={control} name="current" render={({ field }) => <PasswordField label="Senha atual" {...field} show={showPwd} onToggle={() => setShowPwd((v) => !v)} error={pwdErrors.current?.message} />} />
              <Controller control={control} name="next" render={({ field }) => <PasswordField label="Nova senha" {...field} show={showPwd} onToggle={() => setShowPwd((v) => !v)} error={pwdErrors.next?.message} />} />
              <Controller control={control} name="confirm" render={({ field }) => <PasswordField label="Confirmar nova senha" {...field} show={showPwd} onToggle={() => setShowPwd((v) => !v)} error={pwdErrors.confirm?.message} />} />
            </div>
          </SettingsCard>

          <SettingsCard icon={<CalendarDays className="h-4 w-4" />} title="Conta" desc="Informações da sua conta no Codex Flow">
            <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success/[0.08] px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/25">
                <Shield size={15} className="text-success" />
              </div>
              <div>
                <p className="text-sm text-ink">Conta ativa</p>
                <p className="text-[11px] text-faint">Membro desde {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</p>
              </div>
            </div>
          </SettingsCard>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
