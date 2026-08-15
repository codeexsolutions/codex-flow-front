import { useChartColors } from "@/shared/theme/useChartColors";

/**
 * As cores dos gráficos, em nomes curtos.
 *
 * Mora fora de `Painel.tsx` porque aquele arquivo só exporta componentes — é o
 * que o hot reload do Vite precisa para trocar um painel sem recarregar a
 * página inteira.
 */
export const usePainelCores = () => {
  const c = useChartColors();
  return { ...c, green: c.success, amber: c.warning, red: c.danger };
};

export type PainelCores = ReturnType<typeof usePainelCores>;

/**
 * Cores das fatias, na ordem em que entram.
 *
 * Seis bastam: a sétima fatia de uma rosca já é fina demais para ser lida, e o
 * que passa disso vira "Outros" em quem consome.
 */
export const paletaFatias = (c: PainelCores) => [c.accent, c.success, c.warning, c.danger, c.accentSoft, c.mist];
