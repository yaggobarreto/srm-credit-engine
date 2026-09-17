import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CurrencyModule } from '../currency/currency.module';
import { PricingConfigModule } from '../pricing-config/pricing-config.module';
import { PricingModule } from '../pricing/pricing.module';
import { ReceivablesModule } from '../receivables/receivables.module';
import { SettlementEntity } from './entities/settlement.entity';
import { SettlementsController } from './settlements.controller';
import { SettlementsService } from './settlements.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SettlementEntity]),
    PricingModule,
    PricingConfigModule,
    CurrencyModule,
    ReceivablesModule,
  ],
  controllers: [SettlementsController],
  providers: [SettlementsService],
  exports: [SettlementsService],
})
export class SettlementsModule {}
