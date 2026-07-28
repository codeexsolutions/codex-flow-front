import { toPng } from "html-to-image";
import { RefObject } from "react";

/**
 * Resolve um token do tema para um valor de cor concreto.
 *
 * `html-to-image` desenha num canvas fora da cascata do documento, então
 * `rgb(var(--surface))` chega literal e é descartado — o fundo sai transparente
 * e a nota baixa quebrada. Por isso lemos o valor computado antes de capturar.
 */
const resolveToken = (token: string, fallback: string): string => {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return raw ? `rgb(${raw})` : fallback;
};

export const handleDownload = async (ref: RefObject<HTMLDivElement>, filename = `nota-${Date.now()}.png`) => {
  const node = ref.current;
  if (!node) return;

  const scrollParent = node.parentElement;
  const prevScroll = scrollParent?.scrollTop ?? 0;
  if (scrollParent) scrollParent.scrollTop = 0;

  // Aguarda o próximo frame para o browser aplicar o scroll antes de medir
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

  try {
    const dataUrl = await toPng(node, {
      backgroundColor: resolveToken("--surface", "#15132a"),
      width: node.scrollWidth,
      height: node.scrollHeight,
      pixelRatio: 2,
      cacheBust: true,
      style: {
        // Garante que o nó capturado seja renderizado por inteiro,
        // ignorando qualquer transform/scroll herdado
        transform: "none",
        transformOrigin: "top left",
      },
    });

    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } catch (err) {
    console.error("Erro ao gerar imagem da nota:", err);
    throw err;
  } finally {
    if (scrollParent) scrollParent.scrollTop = prevScroll;
  }
};
