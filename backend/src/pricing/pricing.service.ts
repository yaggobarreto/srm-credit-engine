import Decimal from 'decimal.js';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Money } from '../common/money/money';
import { PricingStrategyFactory } from './pricing-strategy.factory';
import { ReceivableType } from './receivable-type.enum';

export type PaymentCurrency = 'BRL' | 'USD';

export interface PriceReceivableInput {
  type: ReceivableType;
  faceValue: Money;
  termMonths: number;
  baseRate: Decimal;
  paymentCurrency: PaymentCurrency;
  /** Obrigatória quando paymentCurrency = 'USD' (ver SPEC.md 1.4). */
  exchangeRate?: Decimal;
}

export interface PriceReceivableResult {
  presentValueBRL: Money;
  discountBRL: Money;
  spread: Decimal;
  /** Valor final na moeda de pagamento (== presentValueBRL quando BRL). */
  finalAmount: Money;
  paymentCurrency: PaymentCurrency;
  exchangeRateUsed?: Decimal;
}

@Injectable()
export class PricingService {
  constructor(private readonly strategyFactory: PricingStrategyFactory) {}

  price(input: PriceReceivableInput): PriceReceivableResult {
    const strategy = this.strategyFactory.resolve(input.type);
    const { presentValue, discount, spread } = strategy.price({
      faceValue: input.faceValue,
      termMonths: input.termMonths,
      baseRate: input.baseRate,
    });

    if (input.paymentCurrency === 'BRL') {
      return {
        presentValueBRL: presentValue,
        discountBRL: discount,
        spread,
        finalAmount: presentValue,
        paymentCurrency: 'BRL',
      };
    }

    if (!input.exchangeRate) {
      throw new BadRequestException('exchangeRate é obrigatório para liquidação em USD');
    }

    // Cross-currency: converte o VP em BRL já arredondado (SPEC.md 1.3/1.4;
    // confirmado pelo golden case C3, que parte do VP arredondado de C1).
    const finalAmount = presentValue.dividedBy(input.exchangeRate).round(2);

    return {
      presentValueBRL: presentValue,
      discountBRL: discount,
      spread,
      finalAmount,
      paymentCurrency: 'USD',
      exchangeRateUsed: input.exchangeRate,
    };
  }
}
