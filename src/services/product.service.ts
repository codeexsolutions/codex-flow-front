import sysgrafix from "./sysgrafix.service";
import ProductType from "../types/ProductType";

const ProductService = {
  getAll: async (params?: { name?: string; category?: string }) => await sysgrafix.get("/produtos", { params }),
  create: async (data: ProductType) => await sysgrafix.post("/produtos/cadastrar", data),

  update: async (data: Partial<ProductType>) => await sysgrafix.patch(`/produtos/alterar/`, data),
};

export default ProductService;
