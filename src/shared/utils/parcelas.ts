/**
 * Parcelas e vencimentos — as contas de calendário que o comércio faz de cabeça.
 *
 * Mora em `shared` porque três telas precisam exatamente das mesmas regras: o
 * formulário de conta no financeiro, a lista de parcelas e a venda a prazo
 * lançada dentro da nota. Cada cópia que existia era uma chance de a prévia
 * mostrar uma data e o servidor gravar outra.
 *
 * A referência é `ContaService` na API: o que está aqui é o espelho dele, e os
 * dois têm que continuar concordando.
 */

export type Recorrencia = "UNICA" | "SEMANAL" | "QUINZENAL" | "MENSAL";

/** Hoje em AAAA-MM-DD, no fuso de quem está operando. */
export const hojeIso = (): string => {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
};

/** AAAA-MM-DD → dd/mm/aaaa. Vencimento é dia, não instante: não passa por `Date`. */
export const dataBr = (iso: string): string => String(iso).slice(0, 10).split("-").reverse().join("/");

/**
 * O vencimento da parcela `indice`, a partir do primeiro.
 *
 * O mensal não usa `setMonth` direto: numa data de 31/01 ele pede "31 de
 * fevereiro", que o JavaScript transborda para 03/03 — a conta que vence todo
 * dia 31 pularia fevereiro e voltaria errada em março. A regra do comércio é
 * guardar o DIA e limitá-lo ao último do mês de destino: 31/01 → 28/02 → 31/03.
 */
export const vencimentoDa = (primeiro: string, indice: number, recorrencia: Recorrencia): string => {
  if (indice === 0) return primeiro;

  const [a, m, d] = String(primeiro).slice(0, 10).split("-").map(Number);
  const base = new Date(a, (m ?? 1) - 1, d ?? 1);

  if (recorrencia === "SEMANAL" || recorrencia === "QUINZENAL") {
    base.setDate(base.getDate() + (recorrencia === "SEMANAL" ? 7 : 15) * indice);
  } else {
    const dia = base.getDate();
    const alvo = new Date(base.getFullYear(), base.getMonth() + indice, 1);
    const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
    base.setFullYear(alvo.getFullYear(), alvo.getMonth(), Math.min(dia, ultimo));
  }

  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
};

/**
 * Divide o total em N parcelas sem perder centavo.
 *
 * `100 / 3` dá 33,33 três vezes e some um centavo. A diferença vai para a
 * PRIMEIRA parcela — é a convenção do comércio, e é a que o cliente confere.
 */
export const dividir = (total: number, n: number): number[] => {
  const centavos = Math.round(total * 100);
  const base = Math.floor(centavos / n);
  const resto = centavos - base * n;

  return Array.from({ length: n }, (_, i) => (base + (i === 0 ? resto : 0)) / 100);
};

/** A regra de juros combinada com o cliente. */
export type Juros = {
  /** Taxa por parcela, em %. 0 = à vista sem acréscimo. */
  taxa: number;
  /** A partir de quantas parcelas ela passa a valer. */
  aPartirDe: number;
};

/**
 * O acréscimo de uma venda a prazo.
 *
 * Juros SIMPLES sobre o valor financiado, uma vez por parcela — a conta que a
 * loja faz no balcão e a única que o cliente confere de cabeça: "3% em 6x é
 * 18% em cima". Tabela Price daria a parcela financeiramente "certa" e nenhum
 * vendedor saberia explicar de onde saiu o número.
 *
 * `aPartirDe` é o que torna a regra utilizável: não se cobra juros de quem
 * paga em 2x, cobra-se de quem estica. Sem esse limite, o operador teria que
 * lembrar de desligar os juros a cada venda curta — e um dia não lembraria.
 *
 * Espelho de `jurosDe` em `ContaService` na API. Os dois têm que continuar
 * concordando: divergir faria esta prévia prometer um valor e o banco gravar
 * outro, justamente no número que o cliente anotou.
 */
export const jurosDe = (valor: number, quantas: number, juros?: Juros | null): number => {
  if (!juros || !(valor > 0) || !(juros.taxa > 0) || quantas < juros.aPartirDe) return 0;

  return Math.round(valor * (juros.taxa / 100) * quantas * 100) / 100;
};

/**
 * As parcelas que serão criadas, para conferir ANTES de gravar.
 *
 * `juros` é opcional: sem ele a prévia é a divisão pura, que é o caso da
 * maioria das vendas.
 */
export const previaParcelas = (total: number, quantas: number, primeiro: string, recorrencia: Recorrencia, juros?: Juros | null) => {
  if (!(total > 0) || quantas < 1) return [];

  const comJuros = Math.round((total + jurosDe(total, quantas, juros)) * 100) / 100;

  return dividir(comJuros, quantas).map((valor, i) => ({
    numero: i + 1,
    valor,
    vencimento: vencimentoDa(primeiro, i, quantas > 1 ? recorrencia : "UNICA"),
  }));
};

/** "vence hoje", "venceu ontem", "em 12 dias" — o que a pessoa realmente calcula. */
export const prazo = (iso: string): { texto: string; atrasada: boolean; dias: number } => {
  const hoje = new Date();
  const [a, m, d] = String(iso).slice(0, 10).split("-").map(Number);

  const alvo = new Date(a, (m ?? 1) - 1, d ?? 1);
  const zero = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const dias = Math.round((alvo.getTime() - zero.getTime()) / 86_400_000);

  if (dias === 0) return { texto: "vence hoje", atrasada: false, dias };
  if (dias === 1) return { texto: "vence amanhã", atrasada: false, dias };
  if (dias === -1) return { texto: "venceu ontem", atrasada: true, dias };
  if (dias < 0) return { texto: `${Math.abs(dias)} dias em atraso`, atrasada: true, dias };

  return { texto: `em ${dias} dias`, atrasada: false, dias };
};
