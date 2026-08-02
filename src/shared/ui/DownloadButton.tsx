import { toPng } from "html-to-image";
import type { RefObject } from "react";

const resolveToken = (token: string, fallback: string): string => {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return raw ? `rgb(${raw})` : fallback;
};

/**
 * Converte uma imagem externa em data URI.
 *
 * `html-to-image` desenha tudo num canvas, e imagem de outro domínio sem CORS
 * "contamina" esse canvas — o navegador então proíbe exportar e o download
 * falha inteiro. Trazer os bytes para o próprio documento resolve.
 */
async function embutir(img: HTMLImageElement): Promise<boolean> {
  const src = img.getAttribute("src") ?? "";

  // Já é local ou já está embutida: nada a fazer.
  if (!src || src.startsWith("data:") || src.startsWith(window.location.origin) || src.startsWith("/")) return true;

  try {
    const resposta = await fetch(src, { mode: "cors" });

    if (!resposta.ok) return false;

    const blob = await resposta.blob();

    const dataUrl: string = await new Promise((ok, erro) => {
      const leitor = new FileReader();
      leitor.onload = () => ok(String(leitor.result));
      leitor.onerror = erro;
      leitor.readAsDataURL(blob);
    });

    img.setAttribute("data-src-original", src);
    img.setAttribute("src", dataUrl);

    return true;

  } catch {
    return false;
  }
}

/**
 * Baixa a nota como PNG.
 *
 * Antes daqui saía uma nota sem QR e sem logo: o código escondia **todas** as
 * `<img>` antes de rasterizar, para o download parar de falhar. O problema real
 * nunca foi a imagem existir — era ser de outro domínio. Agora cada imagem é
 * embutida como data URI e só é escondida a que não puder ser trazida, em vez
 * de sacrificar todas.
 */
export const handleDownload = async (ref: RefObject<HTMLDivElement>, filename = `nota-${Date.now()}.png`) => {
  const node = ref.current;
  if (!node) return;

  const scrollParent = node.parentElement;
  const prevScroll = scrollParent?.scrollTop ?? 0;
  if (scrollParent) scrollParent.scrollTop = 0;

  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

  const imgs = Array.from(node.querySelectorAll<HTMLImageElement>("img"));

  const embutidas = await Promise.all(imgs.map(embutir));

  /* Só some quem não deu para embutir — assim o resto da nota sai completo. */
  const escondidas: { el: HTMLImageElement; display: string }[] = [];

  imgs.forEach((img, i) => {
    if (embutidas[i]) return;

    escondidas.push({ el: img, display: img.style.display });
    img.style.display = "none";
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
    escondidas.forEach(({ el, display }) => {
      el.style.display = display;
    });

    // Devolve o `src` original: a nota continua na tela depois do download.
    imgs.forEach((img) => {
      const original = img.getAttribute("data-src-original");

      if (original) {
        img.setAttribute("src", original);
        img.removeAttribute("data-src-original");
      }
    });

    if (scrollParent) scrollParent.scrollTop = prevScroll;
  }
};
