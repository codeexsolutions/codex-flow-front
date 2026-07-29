import { Controller } from "react-hook-form";
import { MapPin, Hash, Building2 } from "lucide-react";
import type { UseFormRegister, Control, FieldErrors } from "react-hook-form";
import Field from "@/shared/ui/inputs/Field";
import { SelectField } from "@/features/config/components/ConfigUI";
import { UFS } from "@/shared/validation/masks";
import { maskCep } from "@/shared/validation/masks";

type EmpresaEnderecoProps = {
  register: UseFormRegister<any>;
  control: Control<any>;
  errors: FieldErrors;
  onBuscarCep: () => void;
};

const EmpresaEndereco = ({ register, control, errors, onBuscarCep }: EmpresaEnderecoProps) => {
  const regCep = register("cep");

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field
          label="CEP"
          icon={<MapPin size={15} />}
          placeholder="00000-000"
          error={errors.cep?.message}
          {...regCep}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) => {
            ev.target.value = maskCep(ev.target.value);
            regCep.onChange(ev);
          }}
          onBlur={(ev: React.FocusEvent<HTMLInputElement>) => {
            regCep.onBlur(ev);
            onBuscarCep();
          }}
        />
        <Field label="Número" icon={<Hash size={15} />} placeholder="123" error={errors.numero?.message} {...register("numero")} />
      </div>

      <Field label="Logradouro" icon={<MapPin size={15} />} placeholder="Rua, avenida..." error={errors.logradouro?.message} {...register("logradouro")} />

      <div className="grid grid-cols-2 gap-4">
        <Field label="Bairro" icon={<MapPin size={15} />} placeholder="Bairro" error={errors.bairro?.message} {...register("bairro")} />
        <Field label="Complemento" icon={<Hash size={15} />} placeholder="Opcional" error={errors.complemento?.message} {...register("complemento")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Cidade" icon={<Building2 size={15} />} placeholder="Cidade" error={errors.cidade?.message} {...register("cidade")} />
        <Controller
          control={control}
          name="uf"
          render={({ field }) => (
            <SelectField label="UF" icon={<MapPin size={15} />} value={field.value ?? ""} onChange={field.onChange}>
              <option value="">—</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </SelectField>
          )}
        />
      </div>
    </div>
  );
};

export default EmpresaEndereco;
