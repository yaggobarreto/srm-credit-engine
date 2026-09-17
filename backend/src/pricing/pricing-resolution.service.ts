import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { calculateTermInMonths } from '../common/date/term';
import { Money } from '../common/money/money';
import { CurrencyService } from '../currency/currency.service';
import { PricingConfigService } from '../pricing-config/pricing-config.service';
import { PaymentCurrency, PriceReceivableResult, PricingService } from './pricing.service';
import { ReceivableType } from './receivable-type.enum';

export interface ResolvePriceInput {
  type: ReceivableType;
  faceValue: Money;
  operationDate: Date;
  dueDate: Date;
  paymentCurrency: PaymentCurrency;
  /** Ver SPEC.md 1.4: se informado, tem prioridade sobre a taxa vigente. */
  exchangeRateOverride?: Decimal;
}

export interface ResolvePriceOutput extends PriceReceivableResult {
  termMonths: number;
  baseRateUsed: Decimal;
}

/**
 * Junta as três origens de dado que um cálculo de precificação precisa
 * além dos dados do próprio recebível: a taxa base vigente, o câmbio
 * vigente (quando aplicável) e o prazo derivado das datas. Usado tanto
 * pela liquidação real (`SettlementsService`) quanto pela simulação
 * somente-leitura (`PricingController.simulate`) — mesma regra, sem
 * duplicar a resolução de taxa/câmbio/prazo em dois lugares.
 */
@Injectable()
export class PricingResolutionService {
  constructor(
    private readonly pricingService: PricingService,
    private readonly pricingConfigService: PricingConfigService,
    private readonly currencyService: CurrencyService,
  ) {}

  async resolve(input: ResolvePriceInput): Promise<ResolvePriceOutput> {
    const baseRateConfig = await this.pricingConfigService.getLatestBaseRate();
    const baseRate = new Decimal(baseRateConfig.baseRate);
    const termMonths = calculateTermInMonths(input.operationDate, input.dueDate);

    let exchangeRate: Decimal | undefined;
    if (input.paymentCurrency === 'USD') {
      exchangeRate = input.exchangeRateOverride
        ?? new Decimal((await this.currencyService.getLatestRate('USD', 'BRL')).rate);
    }

    const pricingResult = this.pricingService.price({
      type: input.type,
      faceValue: input.faceValue,
      termMonths,
      baseRate,
      paymentCurrency: input.paymentCurrency,
      exchangeRate,
    });

    return { ...pricingResult, termMonths, baseRateUsed: baseRate };
  }
}
