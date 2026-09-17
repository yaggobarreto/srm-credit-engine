const MS_PER_DAY = 86_400_000;
const DAYS_PER_MONTH = 30;

/**
 * Prazo em meses inteiros entre duas datas, arredondado para cima quando
 * fracionário (SPEC.md 1.1). Ex.: 47 dias => 2 meses (mais conservador para
 * quem compra o recebível, gera mais deságio).
 */
export function calculateTermInMonths(from: Date, to: Date): number {
  const days = Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
  if (days <= 0) {
    throw new Error('A data de vencimento deve ser posterior à data da operação');
  }
  return Math.ceil(days / DAYS_PER_MONTH);
}
