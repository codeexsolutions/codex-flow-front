import { useEffect, useRef, useState, type RefObject } from "react";

export const ROW_HEIGHT = 63.3;
export const MIN_PER_PAGE = 5;
export const FALLBACK_PER_PAGE = 10;

type Options = {
  rowHeight?: number;
  minPerPage?: number;
  fallbackPerPage?: number;
  /**
   * Altura ocupada por algo que não é linha dentro do elemento medido — o
   * cabeçalho da tabela, tipicamente.
   *
   * Telas que deixam o cabeçalho FORA do container medido não precisam disto.
   * Quem mede o bloco inteiro precisa: sem descontar, a conta pede uma linha a
   * mais do que cabe e a tabela ganha uma barra de rolagem de 40px — que é
   * justamente o que a paginação existe para evitar.
   */
  offset?: number;
};

/**
 * Calcula quantas linhas cabem no container e reage a mudanças de altura
 * (resize da janela, banner de erro aparecendo, etc). Evita scroll: o que não
 * couber vai para a próxima página.
 *
 * Antes era duplicado, idêntico, em Clientes e Estoque.
 */
export function useAutoPageSize<T extends HTMLElement = HTMLDivElement>({
  rowHeight = ROW_HEIGHT,
  minPerPage = MIN_PER_PAGE,
  fallbackPerPage = FALLBACK_PER_PAGE,
  offset = 0,
}: Options = {}): {
  bodyRef: RefObject<T>;
  perPage: number;
} {
  const bodyRef = useRef<T>(null);
  const [perPage, setPerPage] = useState(fallbackPerPage);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    const calc = () => {
      const h = el.clientHeight - offset;
      if (h <= 0) return;
      const rows = Math.max(minPerPage, Math.floor(h / rowHeight));
      setPerPage((prev) => (prev === rows ? prev : rows));
    };

    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rowHeight, minPerPage, offset]);

  return { bodyRef, perPage };
}
