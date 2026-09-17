import Decimal from 'decimal.js';
import { Money } from '../../common/money/money';
import { ReceivableType } from '../receivable-type.enum';

export interface PricingInput {
  /** Valor de face do recebível, em BRL. */
  faceValue: Money;
  /** Prazo em meses inteiros (ver SPEC.md 1.1 para a premissa de arredondamento). */
  termMonths: number;
  /** Taxa base mensal vigente, como decimal (1% = 0.01). */
  baseRate: Decimal;
}

export interface PricingResult {
  /** Valor presente em BRL, já arredondado half-even, 2 casas. */
  presentValue: Money;
  /** Deságio = valor de face - valor presente, arredondado. */
  discount: Money;
  /** Spread aplicado pela strategy (decimal, ex.: 0.015 = 1,5%). */
  spread: Decimal;
}

/**
 * Strategy pattern (seção 4.1.2 do desafio): cada tipo de recebível tem seu
 * próprio spread, desacoplado do motor de cálculo genérico.
 */
export interface PricingStrategy {
  readonly receivableType: ReceivableType;
  price(input: PricingInput): PricingResult;
}
