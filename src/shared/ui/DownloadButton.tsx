import { toPng } from "html-to-image";
import type { RefObject } from "react";

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

  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

  /* ─── Esconde imagens temporariamente para não aparecerem no PNG ─── */
  const imgs = node.querySelectorAll<HTMLImageElement>("img");
  const restored: { el: HTMLImageElement; origDisplay: string }[] = [];
  imgs.forEach((img) => {
    const origDisplay = img.style.display;
    img.style.display = "none";
    restored.push({ el: img, origDisplay });
  });

  try {
    const dataUrl = await toPng(node, {
      backgroundColor: resolveToken("--surface", "#15132a"),
      width: node.scrollWidth,
      height: node.scrollHeight,
      pixelRatio: 2,
      cacheBust: true,
      style: {
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
    /* ─── Restaura imagens ─── */
    restored.forEach(({ el, origDisplay }) => {
      el.style.display = origDisplay;
    });
    if (scrollParent) scrollParent.scrollTop = prevScroll;
  }
};
