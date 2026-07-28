import { Hash, ShoppingBag, DollarSign, AlignLeft, Image as ImageIcon, X, Save, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { productSchema, ProductFormData } from "../Schema/product.schema";
import Field from "../../../../components/Input/Field";
import { useAlert } from "../../../../components/Alert/Alert";

type Props = {
  defaultValues?: Partial<ProductFormData>;
  onSubmit: (data: ProductFormData) => void;
  onCancel: () => void;
  /** Quando fornecido, exibe o botão de excluir (modo edição). */
  onDelete?: () => void;
  submitText: string;
};

const btnBase =
  "inline-flex items-center justify-center gap-1.5 cursor-pointer rounded-md px-4 py-2.5 text-[12px] font-medium transition-all active:scale-[0.98]";
const btnGhost = `${btnBase} border border-white/[0.08] bg-white/[0.05] text-[#8a85b4] hover:bg-white/[0.09]`;
const btnPrimary = `${btnBase} bg-gradient-to-br from-[#7c6ef5] to-[#a78bfa] text-white hover:brightness-110`;
const btnDanger = `${btnBase} border border-[#a22d2d]/40 bg-[#a22d2d]/15 text-[#f0a5a5] hover:bg-[#a22d2d]/25`;

export function ProductForm({ defaultValues, onSubmit, onCancel, onDelete, submitText }: Props) {
  const alert = useAlert();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      nome: "",
      valorCompra: 0,
      valorVenda: 0,
      quantidade: 0,
      descricao: "",
      imagem: "",
      ...defaultValues,
    },
  });

  // validação passou -> confirma antes de repassar pro pai
  const handleValid = async (data: ProductFormData) => {
    const { confirmed } = await alert.confirm("Salvar produto?", "Confirme os dados antes de salvar.");
    if (!confirmed) return;
    onSubmit(data);
  };

  // validação falhou -> avisa o usuário
  const handleInvalid = () => {
    alert.error("Campos inválidos", "Revise os campos destacados e tente novamente.");
  };

  // excluir -> confirmação destrutiva antes de repassar pro pai
  const handleDelete = async () => {
    if (!onDelete) return;
    const { confirmed } = await alert.confirm("Excluir produto?", "Essa ação não pode ser desfeita.", {
      type: "warning",
      confirmText: "Excluir",
    });
    if (!confirmed) return;
    onDelete();
  };

  return (
    <form onSubmit={handleSubmit(handleValid, handleInvalid)} className="flex flex-col gap-4 p-5">
      <Field
        label="Nome do produto"
        icon={<ShoppingBag className="h-3.5 w-3.5" />}
        error={errors.nome?.message}
        {...register("nome")}
      />

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Preço de compra"
          type="number"
          step="0.01"
          icon={<DollarSign className="h-3.5 w-3.5" />}
          error={errors.valorCompra?.message}
          {...register("valorCompra", { valueAsNumber: true })}
        />

        <Field
          label="Preço de venda"
          type="number"
          step="0.01"
          icon={<DollarSign className="h-3.5 w-3.5" />}
          error={errors.valorVenda?.message}
          {...register("valorVenda", { valueAsNumber: true })}
        />
      </div>

      <Field
        label="Quantidade"
        type="number"
        icon={<Hash className="h-3.5 w-3.5" />}
        error={errors.quantidade?.message}
        {...register("quantidade", { valueAsNumber: true })}
      />

      <Field
        label="Descrição"
        icon={<AlignLeft className="h-3.5 w-3.5" />}
        error={errors.descricao?.message}
        {...register("descricao")}
      />

      <Field
        label="Imagem"
        icon={<ImageIcon className="h-3.5 w-3.5" />}
        error={errors.imagem?.message}
        {...register("imagem")}
      />

      {/* Rodapé: excluir à esquerda (só em edição), ações à direita */}
      <div className="mt-1 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-4">
        {onDelete ? (
          <button type="button" onClick={handleDelete} className={btnDanger}>
            <Trash2 className="h-3.5 w-3.5" />
            Excluir
          </button>
        ) : (
          <span />
        )}

        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className={btnGhost}>
            <X className="h-3.5 w-3.5" />
            Cancelar
          </button>

          <button type="submit" className={btnPrimary}>
            <Save className="h-3.5 w-3.5" />
            {submitText}
          </button>
        </div>
      </div>
    </form>
  );
}
