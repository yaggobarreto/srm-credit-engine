import Decimal from 'decimal.js';
import { Money } from '../../common/money/money';
import { ReceivableType } from '../receivable-type.enum';
import { PricingInput, PricingResult, PricingStrategy } from './pricing-strategy.interface';

/**
 * Implementa a fórmula base comum a todas as strategies:
 *   VP = ValorFace / (1 + TaxaBase + Spread) ^ Prazo
 * Cada subclasse só declara seu spread (SRP: a fórmula fica num único lugar,
 * o spread por produto fica isolado — é o que o Strategy pattern pede).
 */
export abstract class BasePricingStrategy implements PricingStrategy {
  abstract readonly receivableType: ReceivableType;
  protected abstract readonly spread: Decimal;

  price(input: PricingInput): PricingResult {
    const totalRate = input.baseRate.plus(this.spread);
    const discountFactor = new Decimal(1).plus(totalRate).pow(input.termMonths);

    const presentValue = input.faceValue.dividedBy(discountFactor).round(2);
    const discount = input.faceValue.round(2).minus(presentValue);

    return {
      presentValue,
      discount,
      spread: this.spread,
    };
  }
}
