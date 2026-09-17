import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricingConfigEntity } from './entities/pricing-config.entity';
import { PricingConfigController } from './pricing-config.controller';
import { PricingConfigService } from './pricing-config.service';

@Module({
  imports: [TypeOrmModule.forFeature([PricingConfigEntity])],
  controllers: [PricingConfigController],
  providers: [PricingConfigService],
  exports: [PricingConfigService],
})
export class PricingConfigModule {}
