/**
 * Como a marca da empresa vira cores na tela.
 *
 * Vive fora da página porque DOIS lugares precisam da mesma resposta: a página
 * que o cliente abre e a prévia que o dono vê enquanto escolhe. Se cada uma
 * calculasse por conta própria, a prévia mentiria — e o dono só descobriria
 * abrindo o próprio link, que é exatamente o passo que a prévia existe para
 * poupar.
 */

export type TemaMarca = "claro" | "escuro" | "degrade";

export const NEUTRO = "#6366f1";

export const paraRgb = (hex: string) => {
  const h = hex.replace("#", "");
  const cheio = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;

  return {
    r: parseInt(cheio.slice(0, 2), 16) || 0,
    g: parseInt(cheio.slice(2, 4), 16) || 0,
    b: parseInt(cheio.slice(4, 6), 16) || 0,
  };
};

export const rgba = (hex: string, alpha: number) => {
  const { r, g, b } = paraRgb(hex);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/** Luminância relativa da WCAG — a base de toda decisão de contraste aqui. */
export const luminancia = (hex: string) => {
  const { r, g, b } = paraRgb(hex);
  const canal = (c: number) => {
    const v = c / 255;

    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
};

/**
 * Preto ou branco por cima da cor da marca.
 *
 * Sem isto, uma empresa de marca amarela ganharia texto branco sobre amarelo —
 * ilegível justo no cabeçalho, que é a primeira coisa que o cliente lê.
 */
export const textoSobre = (hex: string) => (luminancia(hex) > 0.45 ? "#111827" : "#ffffff");

/**
 * Clareia a cor da marca até ela servir de texto sobre fundo escuro.
 *
 * Marca azul-marinho sobre o fundo escuro do tema some. Em vez de trocar a cor
 * por outra, ela é puxada em direção ao branco só o quanto falta — a marca
 * continua reconhecível, e o texto passa a ser legível.
 */
export const clarearPara = (hex: string, alvo = 0.45) => {
  const { r, g, b } = paraRgb(hex);

  let atual = luminancia(hex);

  if (atual >= alvo) return hex;

  /* Busca simples em vez de resolver a curva: são no máximo 20 passos, uma vez
     por render, e a fórmula inversa da sRGB não vale a complexidade aqui. */
  let mistura = 0;

  for (let i = 1; i <= 20 && atual < alvo; i++) {
    mistura = i / 20;
    const m = (c: number) => Math.round(c + (255 - c) * mistura);

    atual = luminancia(`#${[m(r), m(g), m(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`);
  }

  const m = (c: number) => Math.round(c + (255 - c) * mistura);

  return `#${[m(r), m(g), m(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
};

export type Paleta = {
  /** Fundo da página inteira. */
  fundo: string;
  /** Fundo dos cartões. */
  cartao: string;
  /** Borda / divisória. */
  linha: string;
  /** Texto principal e secundário. */
  tinta: string;
  apagado: string;
  fraco: string;
  /** A cor da marca, ajustada para ser legível NESTE fundo. */
  destaque: string;
  /** Fundo do cabeçalho — cor chapada ou degradê. */
  capa: string;
  sobreCapa: string;
  escuro: boolean;
};

/**
 * Resolve tema + cor num conjunto fechado de cores.
 *
 * A página não escolhe cor em lugar nenhum: pede a paleta e usa. É o que
 * garante que trocar o tema mude a tela inteira de forma coerente, em vez de
 * deixar um canto claro esquecido dentro do tema escuro.
 */
export function paleta(cor: string | null, tema: TemaMarca): Paleta {
  const marca = cor || NEUTRO;
  const escuro = tema === "escuro" || tema === "degrade";

  const capa =
    tema === "degrade"
      ? `linear-gradient(135deg, ${marca} 0%, ${escurecer(marca, 0.45)} 100%)`
      : marca;

  return {
    fundo: escuro ? "#0b0f1a" : "#f6f7f9",
    cartao: escuro ? "#141a28" : "#ffffff",
    linha: escuro ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    tinta: escuro ? "#f3f4f6" : "#111827",
    apagado: escuro ? "#9aa4b8" : "#6b7280",
    fraco: escuro ? "#6b7688" : "#9ca3af",
    destaque: escuro ? clarearPara(marca) : marca,
    capa,
    sobreCapa: tema === "degrade" ? "#ffffff" : textoSobre(marca),
    escuro,
  };
}

/** Escurece em direção ao preto — usado só na outra ponta do degradê. */
export function escurecer(hex: string, fator: number) {
  const { r, g, b } = paraRgb(hex);
  const e = (c: number) => Math.round(c * (1 - fator));

  return `#${[e(r), e(g), e(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
