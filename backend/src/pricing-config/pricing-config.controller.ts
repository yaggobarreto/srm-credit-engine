import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PricingConfigService } from './pricing-config.service';
import { RegisterBaseRateDto } from './dto/register-base-rate.dto';

@ApiTags('pricing-config')
@Controller('pricing-config/base-rate')
export class PricingConfigController {
  constructor(private readonly pricingConfigService: PricingConfigService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Atualiza a taxa base da mesa (gera nova vigência)' })
  register(@Body() dto: RegisterBaseRateDto) {
    return this.pricingConfigService.registerBaseRate(dto.baseRate, dto.effectiveAt);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Taxa base vigente no momento atual' })
  getLatest() {
    return this.pricingConfigService.getLatestBaseRate();
  }
}
