import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import Decimal from 'decimal.js';
import { Money } from '../common/money/money';
import { SimulatePricingDto } from './dto/simulate-pricing.dto';
import { PricingResolutionService } from './pricing-resolution.service';

@ApiTags('pricing')
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingResolutionService: PricingResolutionService) {}

  @Post('simulate')
  @ApiOperation({
    summary: 'Simula a precificação de um recebível sem persistir nada (painel do operador)',
  })
  async simulate(@Body() dto: SimulatePricingDto) {
    const result = await this.pricingResolutionService.resolve({
      type: dto.type,
      faceValue: Money.fromString(dto.faceValue),
      operationDate: dto.operationDate ? new Date(dto.operationDate) : new Date(),
      dueDate: new Date(dto.dueDate),
      paymentCurrency: dto.paymentCurrency,
      exchangeRateOverride: dto.exchangeRate ? new Decimal(dto.exchangeRate) : undefined,
    });

    return {
      termMonths: result.termMonths,
      baseRateUsed: result.baseRateUsed.toFixed(6),
      spread: result.spread.toFixed(6),
      presentValueBRL: result.presentValueBRL.toFixed(2),
      discountBRL: result.discountBRL.toFixed(2),
      paymentCurrency: result.paymentCurrency,
      exchangeRateUsed: result.exchangeRateUsed?.toFixed(6) ?? null,
      finalAmount: result.finalAmount.toFixed(2),
    };
  }
}
