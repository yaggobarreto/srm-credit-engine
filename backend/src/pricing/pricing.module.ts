import { Module } from '@nestjs/common';
import { CurrencyModule } from '../currency/currency.module';
import { PricingConfigModule } from '../pricing-config/pricing-config.module';
import { PricingController } from './pricing.controller';
import { PricingResolutionService } from './pricing-resolution.service';
import { PricingStrategyFactory } from './pricing-strategy.factory';
import { PRICING_STRATEGIES } from './pricing-strategy.tokens';
import { PricingService } from './pricing.service';
import { ChequePreDatadoStrategy } from './strategies/cheque-pre-datado.strategy';
import { DuplicataMercantilStrategy } from './strategies/duplicata-mercantil.strategy';

@Module({
  imports: [PricingConfigModule, CurrencyModule],
  controllers: [PricingController],
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
    PricingResolutionService,
  ],
  exports: [PricingService, PricingResolutionService],
})
export class PricingModule {}
