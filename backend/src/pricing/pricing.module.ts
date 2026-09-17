import { Module } from '@nestjs/common';
import { PricingStrategyFactory } from './pricing-strategy.factory';
import { PRICING_STRATEGIES } from './pricing-strategy.tokens';
import { PricingService } from './pricing.service';
import { ChequePreDatadoStrategy } from './strategies/cheque-pre-datado.strategy';
import { DuplicataMercantilStrategy } from './strategies/duplicata-mercantil.strategy';

@Module({
  providers: [
    DuplicataMercantilStrategy,
    ChequePreDatadoStrategy,
    {
      provide: PRICING_STRATEGIES,
      useFactory: (duplicata: DuplicataMercantilStrategy, cheque: ChequePreDatadoStrategy) => [
        duplicata,
        cheque,
      ],
      inject: [DuplicataMercantilStrategy, ChequePreDatadoStrategy],
    },
    PricingStrategyFactory,
    PricingService,
  ],
  exports: [PricingService],
})
export class PricingModule {}
