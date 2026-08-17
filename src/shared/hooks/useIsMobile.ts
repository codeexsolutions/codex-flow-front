import { useEffect, useState } from "react";

/**
 * `true` abaixo de 768px — o mesmo ponto de corte do `md:` do Tailwind, para a
 * lógica em JS e o CSS nunca discordarem sobre o que é "celular".
 *
 * ---------------------------------------------------------------------------
 * O que este gancho NÃO decide mais
 * ---------------------------------------------------------------------------
 * Ele já escolheu entre DUAS IMPLEMENTAÇÕES de cada tela: `StockPage` ou
 * `EstoqueMobile`, `PDVPage` ou `PDVMobile`, e assim por diante. Eram seis
 * telas escritas duas vezes, e o efeito prático era o pior possível: mexer no
 * desktop não mexia no celular. Um filtro novo, um botão novo, um campo novo —
 * nada disso chegava ao telefone até alguém lembrar de escrever de novo, do
 * outro lado, com outro desenho.
 *
 * As seis viraram uma só, responsiva por CSS. A tabela que vira cartão, os
 * filtros que rolam na horizontal e a barra que reflui são breakpoints do
 * Tailwind dentro do MESMO componente — então não há como uma alteração pegar
 * num tamanho e não no outro.
 *
 * ---------------------------------------------------------------------------
 * O que sobra para ele
 * ---------------------------------------------------------------------------
 * Só o que é MOLDURA e não conteúdo: a barra inferior no lugar do menu lateral
 * e a tela de espera da rota. Isso é estrutura de navegação, não layout de
 * tela, e continua sendo decisão de React.
 */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => (typeof window === "undefined" ? false : window.matchMedia("(max-width: 767px)").matches));

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const aoMudar = (e: MediaQueryListEvent) => setMobile(e.matches);

    mq.addEventListener("change", aoMudar);
    setMobile(mq.matches);

    return () => mq.removeEventListener("change", aoMudar);
  }, []);

  return mobile;
}
