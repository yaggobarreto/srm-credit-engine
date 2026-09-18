import type { PaymentCurrency } from '../types/domain';

const FORMATTERS: Record<PaymentCurrency, Intl.NumberFormat> = {
  BRL: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
};

/** Formata um valor decimal (string, vindo da API) para exibição monetária. */
export function formatMoney(value: string, currency: PaymentCurrency): string {
  return FORMATTERS[currency].format(Number(value));
}

export function formatPercent(decimalValue: string): string {
  return `${(Number(decimalValue) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}%`;
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('pt-BR');
}
