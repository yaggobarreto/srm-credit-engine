import { Inject, Injectable } from '@nestjs/common';
import { ReceivableType } from './receivable-type.enum';
import { PRICING_STRATEGIES } from './pricing-strategy.tokens';
import { PricingStrategy } from './strategies/pricing-strategy.interface';

/**
 * Resolve a strategy correta por tipo de recebível. Isola o "qual strategy
 * usar" do "como cada strategy calcula" — novos tipos de recebível só
 * precisam de uma nova strategy registrada no PricingModule, sem tocar
 * neste factory nem no PricingService.
 */
@Injectable()
export class PricingStrategyFactory {
  private readonly strategies: Map<ReceivableType, PricingStrategy>;

  constructor(@Inject(PRICING_STRATEGIES) strategies: PricingStrategy[]) {
    this.strategies = new Map(strategies.map((strategy) => [strategy.receivableType, strategy]));
  }

  resolve(type: ReceivableType): PricingStrategy {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      throw new Error(`Nenhuma strategy de precificação registrada para o tipo "${type}"`);
    }
    return strategy;
  }
}
