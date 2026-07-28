/** Formata um valor em reais — ex.: 1234.5 → "R$ 1.234,50" */
export const formatCurrency = (currency: number): string => Number(currency).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Formata centavos inteiros — ex.: 123450 → "R$ 1.234,50" */
export const formatCurrencyFromCents = (cents: number): string => formatCurrency((Number(cents) || 0) / 100);
