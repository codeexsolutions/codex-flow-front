import { Hash, ShoppingBag, DollarSign, AlignLeft, Image as ImageIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { productSchema, type ProductFormData, type ProductFormInput } from "@/features/estoque/schema/product.schema";
import Field from "@/shared/ui/inputs/Field";
import { FormActions } from "@/shared/ui/form/FormKit";
import { useAlert } from "@/shared/ui/Alert";

type Props = {
  defaultValues?: Partial<ProductFormData>;
  onSubmit: (data: ProductFormData) => void;
  onCancel: () => void;
  /** Quando fornecido, exibe o botão de excluir (modo edição). */
  onDelete?: () => void;
  submitText: string;
};

export function ProdutoForm({ defaultValues, onSubmit, onCancel, onDelete, submitText }: Props) {
  const alert = useAlert();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormInput, unknown, ProductFormData>({
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
    <form onSubmit={handleSubmit(handleValid, handleInvalid)} className="flex flex-col gap-3">
      <Field label="Nome do produto" icon={<ShoppingBag className="h-3.5 w-3.5" />} error={errors.nome?.message} {...register("nome")} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Preço de compra" type="number" step="0.01" icon={<DollarSign className="h-3.5 w-3.5" />} error={errors.valorCompra?.message} {...register("valorCompra", { valueAsNumber: true })} />

        <Field label="Preço de venda" type="number" step="0.01" icon={<DollarSign className="h-3.5 w-3.5" />} error={errors.valorVenda?.message} {...register("valorVenda", { valueAsNumber: true })} />
      </div>

      <Field label="Quantidade" type="number" icon={<Hash className="h-3.5 w-3.5" />} error={errors.quantidade?.message} {...register("quantidade", { valueAsNumber: true })} />

      <Field label="Descrição" icon={<AlignLeft className="h-3.5 w-3.5" />} error={errors.descricao?.message} {...register("descricao")} />

      <Field label="Imagem" icon={<ImageIcon className="h-3.5 w-3.5" />} error={errors.imagem?.message} {...register("imagem")} />

      <FormActions onCancel={onCancel} onDelete={onDelete ? handleDelete : undefined} submitText={submitText} />
    </form>
  );
}
