import { EMPTY } from "./format";

type DateInput = Date | string | number | undefined | null;

const parse = (value: DateInput): Date | null => {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** dd/mm/aaaa — ex.: 28/07/2026 */
export function formatDate(value: DateInput, fallback = EMPTY): string {
  const date = parse(value);
  return date ? date.toLocaleDateString("pt-BR") : fallback;
}

/** dd/mm/aa — usado em tabelas densas. */
export function formatDateShort(value: DateInput, fallback = "--"): string {
  const date = parse(value);
  return date ? date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : fallback;
}

/** dd/mm/aaaa - hh:mm */
export function formatDateTime(value: DateInput, fallback = EMPTY): string {
  const date = parse(value);
  if (!date) return fallback;
  return `${date.toLocaleDateString("pt-BR")} - ${formatTime(date)}`;
}

/** hh:mm */
export function formatTime(value: DateInput, fallback = "--:--"): string {
  const date = parse(value);
  return date ? date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : fallback;
}

export function isSameDay(value: DateInput, ref: Date = new Date()): boolean {
  const date = parse(value);
  if (!date) return false;
  return date.getDate() === ref.getDate() && date.getMonth() === ref.getMonth() && date.getFullYear() === ref.getFullYear();
}

export function isSameMonth(value: DateInput, ref: Date = new Date()): boolean {
  const date = parse(value);
  if (!date) return false;
  return date.getMonth() === ref.getMonth() && date.getFullYear() === ref.getFullYear();
}

export const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"] as const;
