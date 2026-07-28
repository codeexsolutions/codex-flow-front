import { Building2, Palette, User } from "lucide-react";

export const TabsConfig = [
  {
    label: "Perfil",
    path: "/configuracoes/perfil",
    icon: <User size={15} />,
  },
  {
    label: "Empresa",
    path: "/configuracoes/empresa",
    icon: <Building2 size={15} />,
  },
  {
    label: "Aparência",
    path: "/configuracoes/aparencia",
    icon: <Palette size={15} />,
  },
];
