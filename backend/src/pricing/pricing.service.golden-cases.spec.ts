import Decimal from 'decimal.js';
import { Money } from '../common/money/money';
import { PricingStrategyFactory } from './pricing-strategy.factory';
import { PricingService } from './pricing.service';
import { ReceivableType } from './receivable-type.enum';
import { ChequePreDatadoStrategy } from './strategies/cheque-pre-datado.strategy';
import { DuplicataMercantilStrategy } from './strategies/duplicata-mercantil.strategy';

/**
 * Golden cases da seção 4.3 do desafio. Premissas fixas para aferição,
 * independentes do SPEC.md: taxa base 1% a.m., prazo em meses inteiros,
 * arredondamento half-even 2 casas só no resultado final.
 */
describe('PricingService — golden cases', () => {
  const BASE_RATE = new Decimal('0.01');

  const factory = new PricingStrategyFactory([
    new DuplicataMercantilStrategy(),
    new ChequePreDatadoStrategy(),
  ]);
  const service = new PricingService(factory);

  it('C1 — Duplicata Mercantil, R$100.000, 3 meses, BRL', () => {
    const result = service.price({
      type: ReceivableType.DUPLICATA_MERCANTIL,
      faceValue: Money.fromString('100000.00'),
      termMonths: 3,
      baseRate: BASE_RATE,
      paymentCurrency: 'BRL',
    });

    expect(result.presentValueBRL.toFixed(2)).toBe('92859.94');
    expect(result.discountBRL.toFixed(2)).toBe('7140.06');
    expect(result.finalAmount.toFixed(2)).toBe('92859.94');
  });

  it('C2 — Cheque Pré-datado, R$25.000, 2 meses, BRL', () => {
    const result = service.price({
      type: ReceivableType.CHEQUE_PRE_DATADO,
      faceValue: Money.fromString('25000.00'),
      termMonths: 2,
      baseRate: BASE_RATE,
      paymentCurrency: 'BRL',
    });

    expect(result.presentValueBRL.toFixed(2)).toBe('23337.77');
    expect(result.discountBRL.toFixed(2)).toBe('1662.23');
    expect(result.finalAmount.toFixed(2)).toBe('23337.77');
  });

  it('C3 — Duplicata Mercantil, R$100.000, 3 meses, USD @ 5,4321', () => {
    const result = service.price({
      type: ReceivableType.DUPLICATA_MERCANTIL,
      faceValue: Money.fromString('100000.00'),
      termMonths: 3,
      baseRate: BASE_RATE,
      paymentCurrency: 'USD',
      exchangeRate: new Decimal('5.4321'),
    });

    // O deságio em BRL é o mesmo de C1, mesmo pagando em USD.
    expect(result.presentValueBRL.toFixed(2)).toBe('92859.94');
    expect(result.discountBRL.toFixed(2)).toBe('7140.06');
    expect(result.finalAmount.toFixed(2)).toBe('17094.67');
    expect(result.paymentCurrency).toBe('USD');
  });
});
