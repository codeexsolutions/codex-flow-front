import { alert, type FecharCarregamento } from "@/shared/ui/Alert";

/**
 * O "estou salvando" de toda gravação, num lugar só.
 *
 * ---------------------------------------------------------------------------
 * Por que no interceptor, e não em cada tela
 * ---------------------------------------------------------------------------
 * São 54 pontos de gravação espalhados por 23 telas. Escrito à mão em cada
 * um, o aviso apareceria nos que alguém lembrou de fazer e faltaria no resto
 * — e faltaria de novo em toda tela nova. Pior: um `try/finally` esquecido
 * deixa a tela travada numa caixa sem botão, e são 54 chances de esquecer.
 *
 * Aqui é uma regra só: gravou, avisou. Toda requisição que MUDA alguma coisa
 * (POST, PUT, PATCH, DELETE) acende o aviso; leitura não acende, porque a
 * lista já tem o esqueleto dela e uma caixa por cima só atrapalharia.
 *
 * ---------------------------------------------------------------------------
 * Por que ele demora a aparecer, e por que demora a sair
 * ---------------------------------------------------------------------------
 * Dois números, e os dois existem contra o mesmo defeito: a caixa que
 * pisca.
 *
 *   • `ATRASO` — nada aparece nos primeiros 220 ms. Numa rede boa, metade das
 *     gravações termina antes disso, e um modal que abre e fecha em 80 ms não
 *     é informação: é a tela tremendo a cada clique.
 *
 *   • `MINIMO` — uma vez visível, ele fica ao menos 400 ms. Sem isso, a
 *     requisição que passa dos 220 ms por pouco acende e apaga no mesmo
 *     quadro — exatamente o piscar que o atraso evitava.
 *
 * ---------------------------------------------------------------------------
 * Requisições simultâneas
 * ---------------------------------------------------------------------------
 * Um contador, não um alerta por requisição: salvar um pedido dispara a nota
 * e a baixa de estoque quase juntas, e dois avisos empilhados fariam o
 * segundo derrubar o primeiro. O aviso acende na primeira e só apaga quando a
 * última termina. O título é o da primeira — trocá-lo no meio faria a frase
 * piscar sem que nada tivesse mudado para quem lê.
 */

/** Quanto se espera antes de mostrar qualquer coisa. */
const ATRASO = 220;

/** Quanto tempo ele fica na tela, no mínimo, depois de aparecer. */
const MINIMO = 400;

/**
 * O teto: depois disto o aviso sai sozinho, mesmo sem resposta.
 *
 * A caixa de carregamento não tem botão nenhum — é o que impede alguém de
 * "cancelar" um cadastro que continua a caminho. Só que o axios daqui não tem
 * `timeout` configurado: uma requisição que cai num buraco de rede fica
 * pendurada para sempre, e sem este teto a tela ficaria travada para sempre
 * junto com ela, sem nem um Esc para sair.
 *
 * Vinte segundos é folgado para qualquer gravação desta API e curto o
 * bastante para não parecer travamento. Quando ele estoura, a tela é
 * liberada e a requisição segue: se ela terminar depois, o erro (ou o
 * sucesso) da tela aparece normalmente.
 */
const TETO = 20_000;

let emCurso = 0;
let titulo = "";
let agendado: ReturnType<typeof setTimeout> | null = null;
let teto: ReturnType<typeof setTimeout> | null = null;
let fechar: FecharCarregamento | null = null;
let abertoEm = 0;

/** Solta o aviso da tela e devolve quem o fecha — ou `null` se não havia. */
const soltar = (): FecharCarregamento | null => {
  if (teto) {
    clearTimeout(teto);
    teto = null;
  }

  const encerrar = fechar;
  fechar = null;

  return encerrar;
};

/** Uma gravação começou. Todo `comecou` precisa de um `terminou`. */
export function comecou(rotulo: string) {
  emCurso += 1;

  if (emCurso === 1) titulo = rotulo;

  /* Já está na tela, ou já está a caminho — não agenda duas vezes. */
  if (fechar || agendado) return;

  agendado = setTimeout(() => {
    agendado = null;

    /* Terminou dentro do atraso: o aviso nunca chegou a existir, que é o
       resultado desejado para a gravação rápida. */
    if (emCurso === 0) return;

    abertoEm = Date.now();
    fechar = alert.loading(titulo);

    teto = setTimeout(() => {
      teto = null;

      const encerrar = soltar();

      /* Zera a contagem junto: os `terminou` que ainda vão chegar das
         requisições penduradas encontram o coordenador limpo e não mexem em
         nada — em vez de descontarem de um aviso que já não existe. */
      emCurso = 0;
      encerrar?.();
    }, TETO);
  }, ATRASO);
}

/** Uma gravação terminou — com sucesso ou não, o aviso sai igual. */
export function terminou() {
  emCurso = Math.max(0, emCurso - 1);

  if (emCurso > 0) return;

  if (agendado) {
    clearTimeout(agendado);
    agendado = null;
  }

  if (!fechar) return;

  /*
   * O coordenador se libera AGORA, mesmo que a saída ainda vá esperar.
   *
   * A saída pode ficar pendente até `MINIMO`, e nesse intervalo pode chegar
   * gravação nova. Enquanto o `fechar` continuasse guardado aqui, o `comecou`
   * dessa gravação veria "já tem um aviso" e não abriria nada — e a gravação
   * nova rodaria calada, porque o aviso que ela viu como seu já estava de
   * saída. Soltando o `fechar` na hora, o ciclo seguinte é independente
   * deste, e fechar o anterior não derruba o novo: o fecha-me só age se o
   * alerta na tela ainda for aquele que ele abriu (ver `carregar` no Alert).
   */
  const encerrar = soltar();

  const resta = MINIMO - (Date.now() - abertoEm);

  if (resta <= 0) {
    encerrar?.();
    return;
  }

  setTimeout(() => encerrar?.(), resta);
}

/**
 * O que a caixa diz quando quem chamou não disse nada.
 *
 * Genérico de propósito: o interceptor sabe o método HTTP, não a intenção.
 * Quem quiser a frase certa ("Cadastrando produto…") passa `carregamento`
 * na chamada — ver a nota em `sysgrafix.ts`.
 */
export function tituloPadrao(metodo: string): string {
  return metodo.toUpperCase() === "DELETE" ? "Excluindo…" : "Salvando…";
}
